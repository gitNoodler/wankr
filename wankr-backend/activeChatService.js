/**
 * Active Chat Service - Per-user temporary chat folder.
 * Stores active archived chats (recallable, continuable) with a 20-chat cap.
 * Overflow is returned for global archive routing; stale chats (< 5 exchanges, idle 7+ days) are removed by hourly cleanup.
 */

const fs = require('fs');
const path = require('path');
const { countExchanges } = require('./archiveService');

const STORAGE_DIR = path.join(__dirname, 'storage');
const ACTIVE_CHATS_DIR = path.join(STORAGE_DIR, 'activeChats');
const MAX_ACTIVE_CHATS = 20;
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STALE_MIN_EXCHANGES = 5;

function ensureDir() {
  if (!fs.existsSync(ACTIVE_CHATS_DIR)) {
    fs.mkdirSync(ACTIVE_CHATS_DIR, { recursive: true });
  }
}

function safeUsername(username) {
  return (username || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80) || 'anonymous';
}

function getFilePath(username) {
  ensureDir();
  return path.join(ACTIVE_CHATS_DIR, `${safeUsername(username)}.json`);
}

/**
 * Load active chats for a user. Returns array of chat objects.
 */
function loadActiveChats(username) {
  const filePath = getFilePath(username);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('activeChatService loadActiveChats:', err.message);
  }
  return [];
}

/**
 * Save active chats for a user.
 */
function saveActiveChats(username, chats) {
  const filePath = getFilePath(username);
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(chats, null, 2), 'utf8');
}

/**
 * Get user's active chats (alias for loadActiveChats).
 */
function getChats(username) {
  return loadActiveChats(username);
}

/**
 * Add a chat to user's active store. Enforces 20-cap; oldest by createdAt is evicted.
 * Returns the overflow chat if one was evicted, otherwise null.
 */
function addChat(username, chat) {
  const chats = loadActiveChats(username);
  const normalized = {
    id: chat.id || `c-${Date.now()}`,
    name: (chat.name || 'Unnamed').trim() || 'Unnamed',
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    createdAt: chat.createdAt || new Date().toISOString(),
    updatedAt: chat.updatedAt || new Date().toISOString(),
  };
  // Update existing if same id
  const existingIdx = chats.findIndex(c => c.id === normalized.id);
  if (existingIdx >= 0) {
    chats[existingIdx] = { ...normalized, createdAt: chats[existingIdx].createdAt };
    saveActiveChats(username, chats);
    return null;
  }
  chats.push(normalized);
  // Sort by createdAt ascending (oldest first) for eviction
  chats.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  let overflow = null;
  if (chats.length > MAX_ACTIVE_CHATS) {
    overflow = chats.shift();
  }
  saveActiveChats(username, chats);
  return overflow;
}

/**
 * Remove a chat by id. Returns the removed chat or null.
 */
function removeChat(username, chatId) {
  const chats = loadActiveChats(username);
  const idx = chats.findIndex(c => c.id === chatId);
  if (idx < 0) return null;
  const removed = chats.splice(idx, 1)[0];
  saveActiveChats(username, chats);
  return removed;
}

/**
 * Update an existing chat (e.g. after user continued the conversation).
 */
function updateChat(username, chat) {
  const chats = loadActiveChats(username);
  const normalized = {
    id: chat.id,
    name: (chat.name || 'Unnamed').trim() || 'Unnamed',
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    createdAt: chat.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const idx = chats.findIndex(c => c.id === normalized.id);
  if (idx < 0) return false;
  chats[idx] = { ...normalized, createdAt: chats[idx].createdAt };
  saveActiveChats(username, chats);
  return true;
}

/**
 * Hourly cleanup: remove stale chats (< STALE_MIN_EXCHANGES exchanges AND updatedAt older than 7 days).
 * Does not route them through global archive (they are trashed).
 */
function runCleanup() {
  ensureDir();
  try {
    const files = fs.readdirSync(ACTIVE_CHATS_DIR).filter(f => f.endsWith('.json'));
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(ACTIVE_CHATS_DIR, file);
      let chats;
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        chats = JSON.parse(raw);
        if (!Array.isArray(chats)) continue;
      } catch {
        continue;
      }
      const kept = chats.filter(c => {
        const exchanges = countExchanges(c.messages);
        const updatedAt = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
        const age = now - updatedAt;
        const isStale = exchanges < STALE_MIN_EXCHANGES && age >= STALE_THRESHOLD_MS;
        return !isStale;
      });
      if (kept.length !== chats.length) {
        fs.writeFileSync(filePath, JSON.stringify(kept, null, 2), 'utf8');
        console.log(`activeChatService: removed ${chats.length - kept.length} stale chats for ${file}`);
      }
    }
  } catch (err) {
    console.error('activeChatService runCleanup:', err.message);
  }
}

module.exports = {
  loadActiveChats,
  saveActiveChats,
  getChats,
  addChat,
  removeChat,
  updateChat,
  runCleanup,
  MAX_ACTIVE_CHATS,
  STALE_THRESHOLD_MS,
  STALE_MIN_EXCHANGES,
};
