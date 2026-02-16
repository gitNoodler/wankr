// authService.js — User registration, login, password hashing, sessions
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const USERS_FILE = path.join(__dirname, 'storage', 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'storage', 'sessions.json');
const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function ensureStorageDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadUsers() {
  ensureStorageDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error('authService loadUsers:', err.message);
  }
  return [];
}

function saveUsers(users) {
  ensureStorageDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function normalizeUsername(s) {
  return String(s || '').trim().toLowerCase();
}

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = ['grok', 'wankr', 'admin', 'system', 'bot'];

async function register(username, password) {
  const name = normalizeUsername(username);
  const pass = String(password || '').trim();
  if (!name || name.length < 2) return { ok: false, error: 'Username must be at least 2 characters' };
  if (name.length > 20) return { ok: false, error: 'Username must be 20 characters or less' };
  if (!/^[a-z0-9_]+$/.test(name)) return { ok: false, error: 'Username can only contain letters, numbers, and underscores' };
  if (!pass || pass.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
  if (RESERVED_USERNAMES.includes(name)) return { ok: false, error: 'This username is reserved' };

  const users = loadUsers();
  if (users.some((u) => u.username === name)) return { ok: false, error: 'Username already taken' };

  const hash = await bcrypt.hash(pass, SALT_ROUNDS);
  users.push({ username: name, passwordHash: hash, createdAt: new Date().toISOString() });
  saveUsers(users);

  // Create session token on registration
  const token = createSession(name);
  return { ok: true, username: name, token };
}

// Special bot account - always online, used for training
const GROK_BOT = { username: 'grok', password: 'test123' };

async function login(username, password) {
  const name = normalizeUsername(username);
  const pass = String(password || '').trim();
  if (!name || !pass) return { ok: false, error: 'Username and password required' };

  // Special case: grok bot account always works with fixed password
  if (name === GROK_BOT.username && pass === GROK_BOT.password) {
    const token = createSession(name);
    console.log('🤖 Grok bot logged in');
    return { ok: true, username: name, token, isBot: true };
  }

  const users = loadUsers();
  const user = users.find((u) => u.username === name);
  if (!user) return { ok: false, error: 'Invalid username or password' };

  const match = await bcrypt.compare(pass, user.passwordHash);
  if (!match) return { ok: false, error: 'Invalid username or password' };

  // Create session token
  const token = createSession(user.username);
  return { ok: true, username: user.username, token };
}

// --- Username availability check ---
function checkUsernameAvailable(username) {
  const name = normalizeUsername(username);
  if (!name || name.length < 2) {
    return { available: false, error: 'Username must be at least 2 characters' };
  }
  if (name.length > 20) {
    return { available: false, error: 'Username must be 20 characters or less' };
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    return { available: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  const users = loadUsers();
  const taken = users.some((u) => u.username === name);
  return { available: !taken, username: name };
}

// --- Session management ---
function loadSessions() {
  ensureStorageDir();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const data = JSON.parse(raw);
      return typeof data === 'object' && data !== null ? data : {};
    }
  } catch (err) {
    console.error('authService loadSessions:', err.message);
  }
  return {};
}

function saveSessions(sessions) {
  ensureStorageDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = loadSessions();
  // Clean expired sessions
  const now = Date.now();
  for (const t of Object.keys(sessions)) {
    if (sessions[t].expiresAt < now) delete sessions[t];
  }
  sessions[token] = {
    username,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  saveSessions(sessions);
  return token;
}

function validateSession(token) {
  if (!token) return { valid: false };
  const sessions = loadSessions();
  const session = sessions[token];
  if (!session) return { valid: false };
  if (session.expiresAt < Date.now()) {
    // Expired, clean it up
    delete sessions[token];
    saveSessions(sessions);
    return { valid: false };
  }
  return { valid: true, username: session.username };
}

function destroySession(token) {
  if (!token) return;
  const sessions = loadSessions();
  if (sessions[token]) {
    delete sessions[token];
    saveSessions(sessions);
  }
}

module.exports = {
  register,
  login,
  checkUsernameAvailable,
  createSession,
  validateSession,
  destroySession,
};
