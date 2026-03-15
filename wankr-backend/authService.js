// authService.js — User registration, login, password hashing, sessions
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { ethers } = require('ethers');

const STORAGE_ROOT = require('./storagePath');
const USERS_FILE = path.join(STORAGE_ROOT, 'users.json');
const REGISTRY_FILE = path.join(STORAGE_ROOT, 'username_registry.json');
const SESSIONS_FILE = path.join(STORAGE_ROOT, 'sessions.json');
const WALLET_FILE = path.join(STORAGE_ROOT, 'wallet_addresses.json');
const NONCES_FILE = path.join(STORAGE_ROOT, 'nonces.json');
const SALT_ROUNDS = 10;
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_USERNAME_LENGTH = 5;

function ensureStorageDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Ensure all required storage files exist with proper defaults (fresh volume mount)
  const defaults = {
    [USERS_FILE]: '[]',
    [SESSIONS_FILE]: '{}',
    [WALLET_FILE]: '{}',
    [REGISTRY_FILE]: '[]',
    [NONCES_FILE]: '{}'
  };
  for (const [filePath, content] of Object.entries(defaults)) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
  }
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

// Developer usernames — shown with dev icon in UI
const DEVELOPERS = ['gitnoodler'];

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
  const isDev = DEVELOPERS.includes(name);
  return { ok: true, username: requestUsername, token, isDev };
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
  if (!user.passwordHash) return { ok: false, error: 'Invalid username or password' };

  const match = await bcrypt.compare(pass, user.passwordHash);
  if (!match) return { ok: false, error: 'Invalid username or password' };

  // Create session with request casing so archives are case-sensitive
  const requestUsername = String(username || '').trim();
  const token = createSession(requestUsername);
  const isDev = DEVELOPERS.includes(name);
  return { ok: true, username: requestUsername, token, isDev };
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
  const isDev = DEVELOPERS.includes(normalizeUsername(session.username));
  return { valid: true, username: session.username, isDev };
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

// --- Wallet address registry ---
function loadWalletAddresses() {
  ensureStorageDir();
  try {
    if (fs.existsSync(WALLET_FILE)) {
      const raw = fs.readFileSync(WALLET_FILE, 'utf8');
      const data = JSON.parse(raw);
      return typeof data === 'object' && data !== null ? data : {};
    }
  } catch (err) {
    console.error('authService loadWalletAddresses:', err.message);
  }
  return {};
}

function saveWalletAddresses(wallets) {
  ensureStorageDir();
  fs.writeFileSync(WALLET_FILE, JSON.stringify(wallets, null, 2), 'utf8');
}

// --- Nonce management ---
function loadNonces() {
  ensureStorageDir();
  try {
    if (fs.existsSync(NONCES_FILE)) {
      const raw = fs.readFileSync(NONCES_FILE, 'utf8');
      const data = JSON.parse(raw);
      return typeof data === 'object' && data !== null ? data : {};
    }
  } catch (err) {
    console.error('authService loadNonces:', err.message);
  }
  return {};
}

function saveNonces(nonces) {
  ensureStorageDir();
  fs.writeFileSync(NONCES_FILE, JSON.stringify(nonces, null, 2), 'utf8');
}

function issueNonce(chain, address) {
  const nonces = loadNonces();
  // Purge expired nonces
  const now = Date.now();
  for (const id of Object.keys(nonces)) {
    if (nonces[id].expiresAt < now) delete nonces[id];
  }
  const nonceId = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  nonces[nonceId] = { chain, address: address.toLowerCase(), nonce, expiresAt: now + NONCE_TTL_MS };
  saveNonces(nonces);
  return { nonceId, nonce };
}

function consumeNonce(nonceId) {
  const nonces = loadNonces();
  const entry = nonces[nonceId];
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    delete nonces[nonceId];
    saveNonces(nonces);
    return null;
  }
  delete nonces[nonceId];
  saveNonces(nonces);
  return entry;
}

// --- Signature verification ---
function verifyEVMSignature(message, signature, address) {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// Lazy-loaded ESM deps for Solana verification
let _ed25519, _bs58, _solanaReady;
async function initSolanaDeps() {
  if (_solanaReady) return;
  const [edMod, bs58Mod, hashesMod] = await Promise.all([
    import('@noble/ed25519'),
    import('bs58'),
    import('@noble/hashes/sha512'),
  ]);
  _ed25519 = edMod;
  _bs58 = bs58Mod.default || bs58Mod;
  _ed25519.etc.sha512Sync = (...m) => hashesMod.sha512(_ed25519.etc.concatBytes(...m));
  _solanaReady = true;
}

async function verifySolanaSignature(message, signatureHex, address) {
  try {
    await initSolanaDeps();
    const msgBytes = Buffer.from(message, 'utf8');
    const sigBytes = Buffer.from(signatureHex, 'hex');
    const pubBytes = _bs58.decode(address);
    return _ed25519.verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

// --- Wallet auth flows ---
async function walletLogin(nonceId, chain, address, signature) {
  const nonceEntry = consumeNonce(nonceId);
  if (!nonceEntry) return { ok: false, error: 'Invalid or expired nonce' };
  if (nonceEntry.address !== address.toLowerCase()) return { ok: false, error: 'Address mismatch' };

  const message = `Sign this message to login to Wankr:\n${nonceEntry.nonce}`;
  let valid = false;
  if (chain === 'evm') {
    valid = verifyEVMSignature(message, signature, address);
  } else if (chain === 'solana') {
    valid = await verifySolanaSignature(message, signature, address);
  } else {
    return { ok: false, error: 'Unsupported chain' };
  }
  if (!valid) return { ok: false, error: 'Invalid signature' };

  const wallets = loadWalletAddresses();
  const addrKey = address.toLowerCase();
  if (wallets[addrKey]) {
    // Known address — auto-login
    const username = wallets[addrKey];
    const token = createSession(username);
    const isDev = DEVELOPERS.includes(normalizeUsername(username));
    return { ok: true, username, token, isDev };
  }
  // New wallet — frontend must show username picker
  return { ok: true, isNewWallet: true };
}

async function walletRegister(nonceId, chain, address, signature, username) {
  const name = normalizeUsername(username);
  if (!name || name.length < MIN_USERNAME_LENGTH) return { ok: false, error: 'Username must be at least 5 characters' };
  if (name.length > 20) return { ok: false, error: 'Username must be 20 characters or less' };
  if (!/^[a-z0-9_]+$/.test(name)) return { ok: false, error: 'Username can only contain letters, numbers, and underscores' };
  if (RESERVED_USERNAMES.includes(name)) return { ok: false, error: 'This username is reserved' };

  const nonceEntry = consumeNonce(nonceId);
  if (!nonceEntry) return { ok: false, error: 'Invalid or expired nonce' };
  if (nonceEntry.address !== address.toLowerCase()) return { ok: false, error: 'Address mismatch' };

  const message = `Sign this message to login to Wankr:\n${nonceEntry.nonce}`;
  let valid = false;
  if (chain === 'evm') {
    valid = verifyEVMSignature(message, signature, address);
  } else if (chain === 'solana') {
    valid = await verifySolanaSignature(message, signature, address);
  } else {
    return { ok: false, error: 'Unsupported chain' };
  }
  if (!valid) return { ok: false, error: 'Invalid signature' };

  const registry = loadRegistry();
  const users = loadUsers();
  const addrKey = address.toLowerCase();
  const addrField = chain === 'evm' ? 'evmAddresses' : 'solanaAddresses';

  // If username exists, try to re-link wallet (handles lost wallet mappings)
  if (registry.includes(name)) {
    const existingUser = users.find(u => u.username === name);
    if (!existingUser) return { ok: false, error: 'Username already taken' };
    // Only allow re-link for wallet-only accounts (no password set)
    if (existingUser.passwordHash) return { ok: false, error: 'Username already taken' };
    // Re-link: add wallet address to existing account
    if (!existingUser[addrField]) existingUser[addrField] = [];
    if (!existingUser[addrField].includes(addrKey)) existingUser[addrField].push(addrKey);
    saveUsers(users);
    const wallets = loadWalletAddresses();
    wallets[addrKey] = name;
    saveWalletAddresses(wallets);
    console.log(`🔗 Wallet re-linked to existing account: ${name}`);
    const requestUsername = String(username || '').trim();
    const token = createSession(requestUsername);
    const isDev = DEVELOPERS.includes(name);
    return { ok: true, username: requestUsername, token, isDev };
  }

  // New user — create record
  const userRecord = {
    username: name,
    createdAt: new Date().toISOString(),
    [addrField]: [addrKey],
  };
  users.push(userRecord);
  saveUsers(users);
  registry.push(name);
  saveRegistry(registry);

  // Map address to username
  const wallets = loadWalletAddresses();
  wallets[addrKey] = name;
  saveWalletAddresses(wallets);

  const requestUsername = String(username || '').trim();
  const token = createSession(requestUsername);
  const isDev = DEVELOPERS.includes(name);
  return { ok: true, username: requestUsername, token, isDev };
}

async function linkWallet(sessionToken, nonceId, chain, address, signature) {
  const session = validateSession(sessionToken);
  if (!session.valid) return { ok: false, error: 'Invalid session' };

  const nonceEntry = consumeNonce(nonceId);
  if (!nonceEntry) return { ok: false, error: 'Invalid or expired nonce' };
  if (nonceEntry.address !== address.toLowerCase()) return { ok: false, error: 'Address mismatch' };

  const message = `Sign this message to login to Wankr:\n${nonceEntry.nonce}`;
  let valid = false;
  if (chain === 'evm') {
    valid = verifyEVMSignature(message, signature, address);
  } else if (chain === 'solana') {
    valid = await verifySolanaSignature(message, signature, address);
  } else {
    return { ok: false, error: 'Unsupported chain' };
  }
  if (!valid) return { ok: false, error: 'Invalid signature' };

  // Check if address already linked to someone else
  const wallets = loadWalletAddresses();
  const addrKey = address.toLowerCase();
  if (wallets[addrKey] && wallets[addrKey] !== normalizeUsername(session.username)) {
    return { ok: false, error: 'This wallet is already linked to another account' };
  }

  // Add address to user record
  const users = loadUsers();
  const normalName = normalizeUsername(session.username);
  const user = users.find((u) => u.username === normalName);
  if (!user) return { ok: false, error: 'User not found' };

  const addrField = chain === 'evm' ? 'evmAddresses' : 'solanaAddresses';
  if (!user[addrField]) user[addrField] = [];
  if (!user[addrField].includes(addrKey)) user[addrField].push(addrKey);
  saveUsers(users);

  wallets[addrKey] = normalName;
  saveWalletAddresses(wallets);

  return { ok: true };
}

function isDeveloper(username) {
  return DEVELOPERS.includes(normalizeUsername(username));
}

module.exports = {
  register,
  login,
  checkUsernameAvailable,
  createSession,
  validateSession,
  destroySession,
  getActiveUsernames,
  isDeveloper,
  issueNonce,
  walletLogin,
  walletRegister,
  linkWallet,
};
