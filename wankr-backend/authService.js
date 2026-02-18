// authService.js — User registration, login, password hashing, sessions
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const USERS_FILE = path.join(__dirname, 'storage', 'users.json');
const REGISTRY_FILE = path.join(__dirname, 'storage', 'username_registry.json');
const SESSIONS_FILE = path.join(__dirname, 'storage', 'sessions.json');
const SALT_ROUNDS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_USERNAME_LENGTH = 5;

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

function loadRegistry() {
  ensureStorageDir();
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
    // First run: seed registry from existing users so all claimed usernames are reserved
    const users = loadUsers();
    if (users.length > 0) {
      const registry = users.map((u) => u.username).filter(Boolean);
      saveRegistry(registry);
      return registry;
    }
  } catch (err) {
    console.error('authService loadRegistry:', err.message);
  }
  return [];
}

function saveRegistry(registry) {
  ensureStorageDir();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
}

function isValidEmail(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function normalizeUsername(s) {
  return String(s || '').trim().toLowerCase();
}

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = ['grok', 'wankr', 'admin', 'system', 'bot'];

async function register(username, password, email) {
  const name = normalizeUsername(username);
  const pass = String(password || '').trim();
  if (!name || name.length < MIN_USERNAME_LENGTH) return { ok: false, error: 'Username must be at least 5 characters' };
  if (name.length > 20) return { ok: false, error: 'Username must be 20 characters or less' };
  if (!/^[a-z0-9_]+$/.test(name)) return { ok: false, error: 'Username can only contain letters, numbers, and underscores' };
  if (!pass || pass.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
  if (RESERVED_USERNAMES.includes(name)) return { ok: false, error: 'This username is reserved' };
  if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
    return { ok: false, error: 'Invalid email format' };
  }
  const emailToStore = (email && isValidEmail(String(email).trim())) ? String(email).trim() : undefined;

  const registry = loadRegistry();
  if (registry.includes(name)) return { ok: false, error: 'Username already taken' };

  const users = loadUsers();
  const hash = await bcrypt.hash(pass, SALT_ROUNDS);
  const userRecord = { username: name, passwordHash: hash, createdAt: new Date().toISOString() };
  if (emailToStore) userRecord.email = emailToStore;
  users.push(userRecord);
  saveUsers(users);
  registry.push(name);
  saveRegistry(registry);

  // Create session with request casing so archives are case-sensitive
  const requestUsername = String(username || '').trim();
  const token = createSession(requestUsername);
  return { ok: true, username: requestUsername, token };
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

  // Create session with request casing so archives are case-sensitive
  const requestUsername = String(username || '').trim();
  const token = createSession(requestUsername);
  return { ok: true, username: requestUsername, token };
}

// --- Username availability check ---
function checkUsernameAvailable(username) {
  const name = normalizeUsername(username);
  if (!name || name.length < MIN_USERNAME_LENGTH) {
    return { available: false, error: 'Username must be at least 5 characters' };
  }
  if (name.length > 20) {
    return { available: false, error: 'Username must be 20 characters or less' };
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    return { available: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  const registry = loadRegistry();
  const taken = registry.includes(name);
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

/** Return usernames that have at least one non-expired session (for spectator "live" list). */
function getActiveUsernames() {
  const sessions = loadSessions();
  const now = Date.now();
  const usernames = new Set();
  for (const token of Object.keys(sessions)) {
    const s = sessions[token];
    if (s && s.expiresAt > now && s.username) usernames.add(s.username);
  }
  return Array.from(usernames);
}

module.exports = {
  register,
  login,
  checkUsernameAvailable,
  createSession,
  validateSession,
  destroySession,
  getActiveUsernames,
};
