/**
 * Archive Service - Silent local storage with Grok annotation.
 * Plan: guaranteed raw write, async annotated write, error log on failure.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const STORAGE_DIR = path.join(__dirname, 'storage');
const FOLDERS = {
  archived: path.join(STORAGE_DIR, 'archivedChatsLogs'),
  deleted: path.join(STORAGE_DIR, 'deletedChatLogs'),
  annotated: path.join(STORAGE_DIR, 'wankrChatLogs_annotated'),
  errors: path.join(STORAGE_DIR, 'wankrChatLog_Errors'),
};

const MAX_PER_FOLDER = 10;

function initStorage() {
  for (const folder of Object.values(FOLDERS)) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
}
initStorage();

function saveCompressed(filePath, data) {
  const json = JSON.stringify(data);
  const compressed = zlib.gzipSync(Buffer.from(json, 'utf8'));
  fs.writeFileSync(filePath, compressed);
  return compressed.length;
}

function enforceMaxFiles(folder) {
  try {
    const files = fs.readdirSync(folder)
      .filter(f => f.endsWith('.json.gz'))
      .map(f => ({
        name: f,
        path: path.join(folder, f),
        time: fs.statSync(path.join(folder, f)).mtimeMs,
      }))
      .sort((a, b) => a.time - b.time);
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
 * Log an error to wankrChatLog_Errors/
 * Format: { chatName, errorType, errorDescription, timestamp }
 */
function logError(chatName, errorType, errorDescription) {
  try {
    const timestamp = new Date().toISOString();
    const entry = { chatName, errorType, errorDescription, timestamp };
    const safeName = (chatName || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const fileName = `${timestamp.replace(/[:.]/g, '-')}_${safeName}_error.json`;
    const filePath = path.join(FOLDERS.errors, fileName + '.gz');
    saveCompressed(filePath, entry);
    enforceMaxFiles(FOLDERS.errors);
    console.log(`❌ Error logged: ${errorType} for ${chatName}`);
  } catch (err) {
    console.error('Failed to log error:', err.message);
  }
}

async function annotateWithGrok(chat, xaiApiKey) {
  if (!xaiApiKey) throw new Error('No xAI API key for annotation');
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${xaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [
        {
          role: 'system',
          content: 'Analyze this chat. Return ONLY valid JSON with: topics (array), userStyle (string), improvements (array). Be concise.',
        },
        { role: 'user', content: JSON.stringify(chat.messages) },
      ],
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Grok API error');
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

/**
 * Main entry: 1) save raw to archived/deleted, 2) async Grok → annotated, 3) on error log.
 * @param {Object} chat - { id, messages, createdAt } (name optional)
 * @param {boolean} isDelete - true for delete, false for archive
 * @param {string} [xaiApiKey] - optional, for annotation
 */
async function processChat(chat, isDelete, xaiApiKey) {
  const id = chat.id || `c-${Date.now()}`;
  const messages = Array.isArray(chat.messages) ? chat.messages : [];
  const createdAt = chat.createdAt || new Date().toISOString();

  const rawPayload = { id, messages, createdAt };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
  const fileName = `${timestamp}_${safeId}.json.gz`;
  const rawFolder = isDelete ? FOLDERS.deleted : FOLDERS.archived;
  const rawPath = path.join(rawFolder, fileName);

  try {
    saveCompressed(rawPath, rawPayload);
    enforceMaxFiles(rawFolder);
    console.log(`✅ Raw ${isDelete ? 'deleted' : 'archived'}: ${fileName}`);
  } catch (err) {
    logError(id, 'WRITE_ERROR', err.message);
    throw err;
  }

  setImmediate(async () => {
    try {
      if (!xaiApiKey) {
        console.log('⏭️ No xAI key, skipping annotation');
        return;
      }
      const grokAnnotation = await annotateWithGrok(chat, xaiApiKey);
      const annotatedPayload = {
        id,
        messages,
        createdAt,
        grokAnnotation: {
          topics: grokAnnotation.topics || [],
          userStyle: grokAnnotation.userStyle || '',
          improvements: grokAnnotation.improvements || [],
        },
      };
      const annotatedName = `${timestamp}_${safeId}_annotated.json.gz`;
      const annotatedPath = path.join(FOLDERS.annotated, annotatedName);
      saveCompressed(annotatedPath, annotatedPayload);
      enforceMaxFiles(FOLDERS.annotated);
      console.log(`✅ Annotated: ${annotatedName}`);
    } catch (err) {
      logError(id, 'GROK_API_ERROR', err.message);
    }
  });

  return { success: true };
}

module.exports = {
  processChat,
  logError,
  FOLDERS,
  initStorage,
};
