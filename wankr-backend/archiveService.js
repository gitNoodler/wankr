/**
 * Archive Service - Silent local storage with Grok annotation.
 * When archive/delete: if >= 5 exchanges, save to userChats/ and run Grok annotation → training/conversations/.
 * If < 5 exchanges, discard (no copies).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const STORAGE_DIR = path.join(__dirname, 'storage');
const MIN_EXCHANGES = 5;

const TRAINING_DIR = path.join(STORAGE_DIR, 'training');
const FOLDERS = {
  archived: path.join(STORAGE_DIR, 'archivedChatsLogs'),
  deleted: path.join(STORAGE_DIR, 'deletedChatsLogs'),
  annotated: path.join(STORAGE_DIR, 'wankrChatLogs_annotated'),
  errors: path.join(STORAGE_DIR, 'wankrChatLog_Errors'),
  userChats: path.join(STORAGE_DIR, 'userChats'),
  trainingConversations: path.join(TRAINING_DIR, 'conversations'),
  trainingOverrides: path.join(TRAINING_DIR, 'overrides'),
  trainingExternal: path.join(TRAINING_DIR, 'external'),
};

const MAX_PER_FOLDER = 10; // only for archived, deleted, annotated, errors

function initStorage() {
  if (!fs.existsSync(TRAINING_DIR)) fs.mkdirSync(TRAINING_DIR, { recursive: true });
  for (const folder of Object.values(FOLDERS)) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
  const manifestPath = path.join(TRAINING_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({ conversations: [], overrides: [], external: [] }, null, 2), 'utf8');
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
      console.log(`Deleted oldest: ${oldest.name}`);
    }
  } catch (err) {
    console.error('enforceMaxFiles error:', err.message);
  }
}

/**
 * Count user inputs that have a following assistant response (exchange pairs).
 */
function countExchanges(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return 0;
  let count = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    const role = (messages[i].role || '').toLowerCase();
    const nextRole = (messages[i + 1].role || '').toLowerCase();
    if ((role === 'user' || role === 'human') && (nextRole === 'assistant' || nextRole === 'wankr')) {
      count++;
    }
  }
  return count;
}

/**
 * Log an error to wankrChatLog_Errors/
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
    console.error(`Error logged: ${errorType} for ${chatName}`);
  } catch (err) {
    console.error('Failed to log error:', err.message);
  }
}

/**
 * Save permanent user chat copy: storage/userChats/{username}-{chatName}-{timestamp}.json.gz
 */
function saveUserChat(username, chatName, chat) {
  const safeUser = (username || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  const safeName = (chatName || 'Unnamed').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${safeUser}-${safeName}-${timestamp}.json.gz`;
  const filePath = path.join(FOLDERS.userChats, fileName);
  saveCompressed(filePath, chat);
  console.log(`User chat saved: ${fileName}`);
}

/**
 * Grok annotation: topics, userStyle, improvements, and trainingPairs (clean user/assistant pairs).
 */
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
          content: 'Analyze this chat. Return ONLY valid JSON with: topics (array of strings), userStyle (string), improvements (array of strings), trainingPairs (array of objects with "user" and "assistant" strings - meaningful exchanges only, strip noise and trivial messages). Be concise. trainingPairs must be clean dialogue suitable for training.',
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
 * Save cleaned training pairs to storage/training/conversations/
 */
function saveTrainingConversation(username, timestamp, trainingPairs) {
  if (!Array.isArray(trainingPairs) || trainingPairs.length === 0) return;
  const safeUser = (username || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  const safeTs = (timestamp || '').replace(/[:.]/g, '-');
  const fileName = `${safeTs}_${safeUser}.json.gz`;
  const filePath = path.join(FOLDERS.trainingConversations, fileName);
  saveCompressed(filePath, { username: username || 'anonymous', trainingPairs, timestamp: new Date().toISOString() });
  console.log(`Training conversation saved: ${fileName} (${trainingPairs.length} pairs)`);
}

/**
 * Main entry: if >= MIN_EXCHANGES: 1) save to userChats/, 2) optional raw to archived/deleted (temp), 3) async Grok → annotated + training/conversations/.
 * If < MIN_EXCHANGES: return success but save nothing (trash).
 * @param {Object} chat - { id, name, messages, createdAt }
 * @param {boolean} isDelete - true for delete, false for archive
 * @param {string} [username] - for labeling files
 * @param {string} [xaiApiKey] - for annotation
 */
async function processChat(chat, isDelete, username, xaiApiKey) {
  const id = chat.id || `c-${Date.now()}`;
  const messages = Array.isArray(chat.messages) ? chat.messages : [];
  const createdAt = chat.createdAt || new Date().toISOString();
  const chatName = (chat.name || 'Unnamed').trim() || 'Unnamed';

  const exchangeCount = countExchanges(messages);
  if (exchangeCount < MIN_EXCHANGES) {
    console.log(`Chat ${id} has ${exchangeCount} exchanges (min ${MIN_EXCHANGES}); discarding`);
    return { success: true, discarded: true };
  }

  const rawPayload = { id, messages, createdAt, name: chatName, username: username || null };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);

  // Copy A: permanent user chat (username-chatName-timestamp)
  try {
    saveUserChat(username || 'anonymous', chatName, rawPayload);
  } catch (err) {
    logError(id, 'USER_CHAT_WRITE_ERROR', err.message);
    throw err;
  }

  // Optional: keep temp buffer for archived/deleted (capped)
  const rawFolder = isDelete ? FOLDERS.deleted : FOLDERS.archived;
  const rawFileName = `${timestamp}_${safeId}.json.gz`;
  const rawPath = path.join(rawFolder, rawFileName);
  try {
    saveCompressed(rawPath, rawPayload);
    enforceMaxFiles(rawFolder);
  } catch (err) {
    logError(id, 'RAW_BUFFER_WRITE_ERROR', err.message);
  }

  // Copy B: async Grok annotation → annotated + training/conversations/
  setImmediate(async () => {
    try {
      if (!xaiApiKey) {
        console.log('No xAI key, skipping annotation');
        return;
      }
      const grokAnnotation = await annotateWithGrok(chat, xaiApiKey);
      const annotatedPayload = {
        id,
        messages,
        createdAt,
        username: username || null,
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

      const pairs = grokAnnotation.trainingPairs || [];
      if (pairs.length > 0) {
        saveTrainingConversation(username, timestamp, pairs);
      }
    } catch (err) {
      logError(id, 'GROK_API_ERROR', err.message);
    }
  });

  return { success: true };
}

module.exports = {
  processChat,
  logError,
  countExchanges,
  MIN_EXCHANGES,
  FOLDERS,
  initStorage,
};
