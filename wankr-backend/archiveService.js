/**
 * Archive Service - Silent local storage with Grok annotation
 * Mirrors Google Drive folder structure for future sync
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Storage paths (mirrors Drive folder structure)
const ROOT = path.resolve(__dirname, '..');
const STORAGE_DIR = path.join(__dirname, 'storage');
const FOLDERS = {
  archived: path.join(STORAGE_DIR, 'archivedChatsLogs'),
  deleted: path.join(STORAGE_DIR, 'deletedChatLogs'),
  annotated: path.join(STORAGE_DIR, 'wankrChatLogs_annotated'),
  errors: path.join(STORAGE_DIR, 'wankrChatLog_Errors'),
  training: path.join(STORAGE_DIR, 'trainingDataManualSubmissions'),
};

const MAX_PER_FOLDER = 10;
const DEFAULT_USERNAME = 'username';

// Ensure all folders exist
function initStorage() {
  for (const folder of Object.values(FOLDERS)) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
}

// Initialize on module load
initStorage();

/**
 * Get the next chat index for a folder
 */
function getNextIndex(folder) {
  try {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.json.gz'));
    return files.length + 1;
  } catch {
    return 1;
  }
}

/**
 * Sanitize a string for use in filename (remove special chars)
 */
function sanitizeForFilename(str) {
  if (!str) return 'Unnamed';
  return str
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .trim() || 'Unnamed';
}

/**
 * Find and delete existing files for a chat ID in a folder
 * Returns the index of the deleted file (for reuse) or null
 */
function findAndDeleteByChatId(folder, chatId) {
  try {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.json.gz'));
    
    for (const fileName of files) {
      const filePath = path.join(folder, fileName);
      try {
        const compressed = fs.readFileSync(filePath);
        const json = zlib.gunzipSync(compressed).toString('utf8');
        const data = JSON.parse(json);
        
        if (data.id === chatId) {
          // Extract index from filename (format: username_INDEX_name.json.gz)
          const match = fileName.match(/_(\d+)_/);
          const existingIndex = match ? parseInt(match[1], 10) : null;
          
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted old version: ${fileName}`);
          return existingIndex;
        }
      } catch {
        // Skip files that can't be read/parsed
        continue;
      }
    }
  } catch (err) {
    console.error('findAndDeleteByChatId error:', err.message);
  }
  return null;
}

/**
 * Check if an annotation is locked (has "Chat Cleared" status)
 */
function isAnnotationLocked(chatId) {
  try {
    const files = fs.readdirSync(FOLDERS.annotated).filter(f => f.endsWith('.json.gz'));
    
    for (const fileName of files) {
      const filePath = path.join(FOLDERS.annotated, fileName);
      try {
        const compressed = fs.readFileSync(filePath);
        const json = zlib.gunzipSync(compressed).toString('utf8');
        const data = JSON.parse(json);
        
        if (data.id === chatId && data.status === 'Chat Cleared') {
          console.log(`🔒 Annotation locked for ${chatId} - skipping update`);
          return true;
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error('isAnnotationLocked error:', err.message);
  }
  return false;
}

/**
 * Compress JSON and save to file
 */
function saveCompressed(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const compressed = zlib.gzipSync(json);
  fs.writeFileSync(filePath, compressed);
  return compressed.length;
}

/**
 * Enforce max files per folder (delete oldest)
 */
function enforceMaxFiles(folder) {
  try {
    const files = fs.readdirSync(folder)
      .filter(f => f.endsWith('.json.gz'))
      .map(f => ({
        name: f,
        path: path.join(folder, f),
        time: fs.statSync(path.join(folder, f)).mtimeMs
      }))
      .sort((a, b) => a.time - b.time); // oldest first

    while (files.length > MAX_PER_FOLDER) {
      const oldest = files.shift();
      fs.unlinkSync(oldest.path);
      console.log(`🗑️ Deleted oldest: ${oldest.name}`);
    }
  } catch (err) {
    console.error('enforceMaxFiles error:', err.message);
  }
}

/**
 * Log an error to wankrChatLog_Errors
 * Format: <Username>_<index>_<chatName>_error.json.gz
 */
function logError(chatName, errorType, errorDescription, username = DEFAULT_USERNAME) {
  try {
    const timestamp = new Date().toISOString();
    const index = getNextIndex(FOLDERS.errors);
    const safeChatName = sanitizeForFilename(chatName);
    const fileName = `${username}_${index}_${safeChatName}_error.json.gz`;
    const filePath = path.join(FOLDERS.errors, fileName);
    
    const errorEntry = {
      chatName,
      errorType,
      errorDescription,
      timestamp,
    };
    
    saveCompressed(filePath, errorEntry);
    enforceMaxFiles(FOLDERS.errors);
    console.log(`❌ Error logged: ${errorType} for ${chatName}`);
  } catch (err) {
    console.error('Failed to log error:', err.message);
  }
}

/**
 * Call Grok API for annotation
 */
async function annotateWithGrok(chat, xaiApiKey) {
  if (!xaiApiKey) {
    throw new Error('No xAI API key available for annotation');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${xaiApiKey}`
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [
        {
          role: 'system',
          content: 'Analyze this chat conversation for training purposes. Return ONLY valid JSON with these fields: topics (array of main topics discussed), userStyle (description of user communication style), sentiment (overall sentiment), keyInsights (array of notable patterns or preferences), improvements (array of suggestions for better responses). Be concise.'
        },
        {
          role: 'user',
          content: JSON.stringify(chat.messages)
        }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'Grok API error');
  }

  const content = data.choices?.[0]?.message?.content || '{}';
  
  // Try to parse as JSON, fall back to raw string
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

/**
 * Main entry point - process a chat for archiving/deletion
 * @param {Object} chat - The chat object with id, name, messages, createdAt
 * @param {boolean} isDelete - true if deleting, false if archiving
 * @param {string} xaiApiKey - API key for Grok annotation
 */
async function processChat(chat, isDelete, xaiApiKey) {
  const timestamp = Date.now();
  const username = chat.username || DEFAULT_USERNAME;
  const chatName = chat.name || 'Unnamed';
  const chatId = chat.id || `unknown-${timestamp}`;
  
  // Determine folder
  const rawFolder = isDelete ? FOLDERS.deleted : FOLDERS.archived;
  
  // Check if annotation is locked (Chat Cleared) - if so, skip annotation update
  const annotationLocked = isAnnotationLocked(chatId);
  
  // Delete existing files for this chat ID (update = delete + replace)
  const existingIndex = findAndDeleteByChatId(rawFolder, chatId);
  
  // Update annotation only if not locked
  if (!annotationLocked) {
    findAndDeleteByChatId(FOLDERS.annotated, chatId);
  }
  
  // If deleting, also remove from archived folder
  if (isDelete) {
    findAndDeleteByChatId(FOLDERS.archived, chatId);
  }
  
  // Use existing index if updating, otherwise get next index
  const index = existingIndex || getNextIndex(rawFolder);
  
  // Archived: <Username>_<chatIndex>_<chatName>.json.gz
  // Deleted: <Username>_<chatIndex>_<timestamp>.json.gz
  const safeChatName = sanitizeForFilename(chatName);
  const fileName = isDelete
    ? `${username}_${index}_${timestamp}.json.gz`
    : `${username}_${index}_${safeChatName}.json.gz`;
  
  const rawPath = path.join(rawFolder, fileName);
  const isUpdate = existingIndex !== null;
  
  try {
    const rawChat = {
      id: chat.id,
      name: chatName,
      messages: chat.messages || [],
      createdAt: chat.createdAt || new Date().toISOString(),
      updatedAt: isUpdate ? new Date().toISOString() : undefined,
    };
    
    const rawSize = saveCompressed(rawPath, rawChat);
    enforceMaxFiles(rawFolder);
    console.log(`✅ ${isUpdate ? 'Updated' : (isDelete ? 'Deleted' : 'Archived')} chat saved: ${fileName} (${rawSize} bytes)`);
  } catch (err) {
    logError(chatName, 'RAW_SAVE_ERROR', err.message, username);
    throw err; // Re-throw so caller knows it failed
  }

  // 2. Annotate with Grok and save to annotated folder (async, don't block)
  // Skip if annotation is already locked
  if (annotationLocked) {
    console.log(`🔒 Skipping annotation for ${chatName} - already locked`);
  } else {
    const baseNameForAnnotated = isDelete
      ? `${username}_${index}_${timestamp}`
      : `${username}_${index}_${safeChatName}`;
    
    setImmediate(async () => {
      try {
        const annotation = await annotateWithGrok(chat, xaiApiKey);
        
        const annotatedChat = {
          id: chat.id,
          name: chatName,
          messages: chat.messages || [],
          createdAt: chat.createdAt || new Date().toISOString(),
          updatedAt: isUpdate ? new Date().toISOString() : undefined,
          grokAnnotation: annotation,
          annotatedAt: new Date().toISOString(),
          // Lock annotation permanently if chat was cleared/deleted
          status: isDelete ? 'Chat Cleared' : 'Active',
        };
        
        const annotatedFileName = `${baseNameForAnnotated}_annotated.json.gz`;
        const annotatedPath = path.join(FOLDERS.annotated, annotatedFileName);
        
        const annotatedSize = saveCompressed(annotatedPath, annotatedChat);
        enforceMaxFiles(FOLDERS.annotated);
        console.log(`✅ Annotated chat saved: ${annotatedFileName} (${annotatedSize} bytes)${isDelete ? ' [LOCKED]' : ''}`);
      } catch (err) {
        logError(chatName, 'GROK_ANNOTATION_ERROR', err.message, username);
        console.error(`❌ Annotation failed for ${chatName}:`, err.message);
      }
    });
  }

  return { success: true, fileName, isUpdate };
}

module.exports = {
  processChat,
  logError,
  FOLDERS,
  initStorage,
};
