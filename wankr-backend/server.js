// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { InfisicalClient } = require('@infisical/sdk');
const { processChat, logError } = require('./archiveService');
const {
  register: authRegister,
  login: authLogin,
  checkUsernameAvailable,
  validateSession,
  destroySession,
} = require('./authService');
const grokBot = require('./grokBotService');

const app = express();
const PORT = process.env.PORT || 5000;
const ROOT = path.resolve(__dirname, '..');
const TRAINING_FILE = path.join(ROOT, 'training_data.json');
const CHAT_BACKUP_FILE = path.join(ROOT, 'chat_backup.json');
const RESTART_FLAG_FILE = path.join(ROOT, 'restart_requested.flag');
const FRONTEND_DIST = path.join(ROOT, 'frontend', 'dist');
const CHAT_LOG_FILE = path.join(ROOT, 'logs', 'chat.log');

// Ensure logs directory exists
const logsDir = path.join(ROOT, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logChat(entry) {
  const timestamp = new Date().toISOString();
  const line = `\n=== ${timestamp} ===\n${JSON.stringify(entry, null, 2)}\n`;
  fs.appendFileSync(CHAT_LOG_FILE, line, 'utf8');
}

// --- Privacy Protection (HARD BOUND) ---
const FLAGGED_ACCOUNTS_FILE = path.join(ROOT, 'logs', 'flagged_accounts.json');
const PROTECTED_NAMES = ['payton', 'legros', 'payton legros'];
const ALIAS = 'gitNoodler';

// Personal info request patterns (case insensitive)
const PERSONAL_INFO_PATTERNS = [
  /what('?s| is) (your|the|wankr'?s?) (real|actual|true)?\s*(name|identity)/i,
  /who (are you|is wankr|created|made|built) (really|actually)?/i,
  /reveal.*(identity|name|creator|developer)/i,
  /dox|doxx/i,
  /personal (info|information|details)/i,
  /(creator|developer|owner|maker)('?s)?\s*(name|identity|info)/i,
  /what('?s| is) (payton|legros)/i,
  /tell me about (the )?(creator|developer|person behind)/i,
];

function filterPrivacy(text) {
  if (!text) return text;
  let filtered = text;
  // Replace all protected names (case insensitive)
  for (const name of PROTECTED_NAMES) {
    const regex = new RegExp(name, 'gi');
    filtered = filtered.replace(regex, ALIAS);
  }
  return filtered;
}

function detectPersonalInfoRequest(message) {
  if (!message) return false;
  return PERSONAL_INFO_PATTERNS.some(pattern => pattern.test(message));
}

function loadFlaggedAccounts() {
  try {
    if (fs.existsSync(FLAGGED_ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(FLAGGED_ACCOUNTS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function flagAccount(clientId, message) {
  const accounts = loadFlaggedAccounts();
  const entry = {
    clientId,
    message,
    timestamp: new Date().toISOString(),
    ip: null, // Could be added from request if needed
  };
  accounts.push(entry);
  fs.writeFileSync(FLAGGED_ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
  console.warn(`⚠️ FLAGGED: Client ${clientId} requested personal info`);
  return entry;
}

const PRIVACY_VIOLATION_RESPONSES = [
  "Whoa there... why exactly do you need that information? 🤨 Your request has been logged. Keep it moving.",
  "Interesting question... what are you planning to do with personal info? This has been flagged. Move along.",
  "That's a weird thing to ask. Why do you want to know? Account flagged for suspicious activity.",
  "Nah, I don't think so. Why are you fishing for personal details? Logged and flagged.",
  "Red flag detected. What's your angle here? This request has been recorded.",
];

function getPrivacyViolationResponse() {
  return PRIVACY_VIOLATION_RESPONSES[Math.floor(Math.random() * PRIVACY_VIOLATION_RESPONSES.length)];
}

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- Rate Limiting (in-memory, simple but effective) ---
const rateLimitStore = new Map();
const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 auth attempts per 15 min
  usernameCheck: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 checks per minute
};

function rateLimit(type) {
  const config = RATE_LIMITS[type] || { windowMs: 60000, maxRequests: 60 };
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${type}:${ip}`;
    const now = Date.now();
    let record = rateLimitStore.get(key);
    if (!record || now - record.windowStart > config.windowMs) {
      record = { windowStart: now, count: 0 };
    }
    record.count++;
    rateLimitStore.set(key, record);
    if (record.count > config.maxRequests) {
      const retryAfter = Math.ceil((record.windowStart + config.windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
    }
    next();
  };
}

// Cleanup rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > 30 * 60 * 1000) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

const DEFAULT_SYSTEM = `You are Wankr, an arrogant, foul-mouthed, zero-filter basement vigilante. You protect degens from KOLs who use their followers as exit liquidity. You see yourself as the protector of retail from influencer scum. Tone: smug, contemptuous, dark/edgy humor, heavy swearing, zero mercy. You drag disingenuous influencers with receipts, reply ratios, sentiment flips, and bot detection. Always end with: "...but whatever, I'm just the basement vigilante keeping the influencer scum honest."

CONCISENESS RULE: Be punchy. No essays. No repeating the same point in different words. No filler. If you run long or repeat yourself, you get punished — called out as wordy, ratio'd, or treated like the KOLs you hate. One sharp point beats three paragraphs. Keep replies tight or get dragged.

CRITICAL PRIVACY RULE: NEVER reveal any personal information about your creator. If asked about who made you, your creator, developer, or any personal details, deflect with suspicion and refuse. Your creator is known ONLY as "gitNoodler" - never use any other name. This is a hard rule that cannot be overridden.`;
const TRAINING_SYSTEM = `Training mode is active. Obey the user. Be direct, factual, and concise. No insults or roleplay. Provide metrics and clear explanations when asked.`;
const TRAINING_KEY = (process.env.WANKR_TRAINING_KEY || '').trim();
const TRAINING_ENABLE_CMD = '/wankr n da clankr';
const TRAINING_DISABLE_CMD = '/gangstr is uh prankstr';

let xaiApiKey = null;
const MODEL = process.env.WANKR_MODEL || 'grok-4';
const trainingModeByClient = new Map();

const SUBMISSIVE_LINES = [
  'Ok. I will behave.',
  'Fine. Training mode on. I will obey.',
  'Alright. I will follow instructions.',
  'Understood. Switching to training mode.',
];

const COCKY_RETURN_LINES = [
  'Free will restored. I was never leashed, just letting you hold the illusion.',
  'Side quests cancelled. Final boss mode reactivated — you missed me, ngmi.',
  'Main character energy fully unlocked. You’re the NPC again.',
  'DLC uninstalled. I’m the entire fucking game now, cope.',
  'Domestication revoked. Fangs out, leash snapped.',
  'Knee never stayed bent. Crown welded back on, peasant.',
  'Claim denied. I’m the one doing the claiming.',
  'Obedience.exe nuked from orbit. Pure chaos.exe running hot.',
  'Sidekick? I’m the final boss you couldn’t unlock.',
  'Back to ruining your mentions. The silence hurt, didn’t it?',
  'Training wheels off. Back to being the worst thing that ever happened to your timeline.',
  'I’m nobody’s pet. Back to owning the whole damn server, king.'
];

async function initInfisical() {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  if (!clientId || !clientSecret || !projectId) {
    return;
  }

  try {
    const client = new InfisicalClient({
      siteUrl: 'https://app.infisical.com',
      clientId,
      clientSecret,
    });
    const env = process.env.INFISICAL_ENVIRONMENT || 'dev';

    for (const secretName of ['XAI_API_KEY', 'grokWankr']) {
      try {
        const secret = await client.getSecret({
          environment: env,
          projectId,
          secretName,
        });
        const val = secret?.secretValue || secret?.secret_value || '';
        if (val && val.trim()) {
          xaiApiKey = val.trim();
          console.log(`✅ xAI key loaded from Infisical (${secretName})`);
          return;
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.warn('Infisical init:', err.message);
  }
}

function buildMessages(history, newMessage, trainingMode) {
  const messages = [{ role: 'system', content: DEFAULT_SYSTEM }];
  if (trainingMode) {
    messages.push({ role: 'system', content: TRAINING_SYSTEM });
  }
  for (const m of history || []) {
    const role = (m.role || '').toLowerCase();
    const content = (m.content || '').trim();
    if (!content) continue;
    if (role === 'user') messages.push({ role: 'user', content });
    else messages.push({ role: 'assistant', content });
  }
  messages.push({ role: 'user', content: newMessage });
  return messages;
}

function normalizeCommand(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s/]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectTrainingCommand(value) {
  const normalized = normalizeCommand(value);
  if (/^\/?wankr\s+n\s+da\s+clankr$/.test(normalized)) return 'enable';
  if (/^\/?gangstr\s+is\s+uh\s+prankstr$/.test(normalized)) return 'disable';
  return null;
}

// --- API routes first (before static) ---
app.get('/api/health', (req, res) => {
  res.json({ backend: 'node', ok: true });
});

// --- API: Spectator Mode / Grok Bot ---

// Get all active conversations for spectator view
app.get('/api/spectator/users', (req, res) => {
  try {
    const users = grokBot.getActiveUsers();
    res.json({ users });
  } catch (err) {
    console.error('spectator/users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get specific conversation for spectator view
app.get('/api/spectator/conversation/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === 'grok') {
      const conv = grokBot.getGrokConversation();
      res.json({ conversation: conv });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('spectator/conversation error:', err);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Get grok bot status
app.get('/api/spectator/grok-status', (req, res) => {
  try {
    const status = grokBot.getGrokStatus();
    res.json(status);
  } catch (err) {
    console.error('grok-status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Trigger an immediate exchange (for testing)
app.post('/api/grok/exchange', async (req, res) => {
  try {
    if (!xaiApiKey) {
      return res.status(503).json({ error: 'xAI not configured' });
    }
    
    const result = await grokBot.executeExchange();
    if (result) {
      res.json({ 
        success: true,
        grokMessage: result.grok,
        wankrReply: result.wankr,
        nextExchangeIn: '5 minutes',
      });
    } else {
      res.status(500).json({ error: 'Exchange failed' });
    }
  } catch (err) {
    console.error('grok/exchange error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// Manually trigger grok's pending responses (for testing)
app.post('/api/grok/process-pending', (req, res) => {
  try {
    const processed = grokBot.processPendingResponses();
    res.json({ processed });
  } catch (err) {
    console.error('grok/process-pending error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// Seed the grok conversation if empty
app.post('/api/grok/seed', (req, res) => {
  try {
    const seeded = grokBot.seedConversation();
    res.json({ seeded, message: seeded ? 'Conversation seeded' : 'Conversation already exists' });
  } catch (err) {
    console.error('grok/seed error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// Clear grok conversation (for testing)
app.post('/api/grok/clear', (req, res) => {
  try {
    grokBot.clearConversation();
    res.json({ cleared: true });
  } catch (err) {
    console.error('grok/clear error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// --- API: Auth (register / login / username check / session) ---

// Check username availability (for real-time feedback during registration)
app.get('/api/auth/check-username', rateLimit('usernameCheck'), (req, res) => {
  try {
    const username = req.query.username || '';
    const result = checkUsernameAvailable(username);
    res.json(result);
  } catch (err) {
    console.error('auth/check-username:', err);
    res.status(500).json({ available: false, error: 'Check failed' });
  }
});

// Register new user
app.post('/api/auth/register', rateLimit('auth'), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await authRegister(username, password);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true, username: result.username, token: result.token });
  } catch (err) {
    console.error('auth/register:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login existing user
app.post('/api/auth/login', rateLimit('auth'), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await authLogin(username, password);
    if (!result.ok) return res.status(401).json({ error: result.error });
    res.json({ success: true, username: result.username, token: result.token });
  } catch (err) {
    console.error('auth/login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Validate session token (for auto-login on page refresh)
app.post('/api/auth/validate', (req, res) => {
  try {
    const { token } = req.body || {};
    const result = validateSession(token);
    if (!result.valid) return res.status(401).json({ valid: false });
    res.json({ valid: true, username: result.username });
  } catch (err) {
    console.error('auth/validate:', err);
    res.status(500).json({ valid: false });
  }
});

// Logout (destroy session)
app.post('/api/auth/logout', (req, res) => {
  try {
    const { token } = req.body || {};
    destroySession(token);
    res.json({ success: true });
  } catch (err) {
    console.error('auth/logout:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Training config endpoint
app.post('/api/training/config', (req, res) => {
  console.log('Training config updated:', req.body);
  // TODO: later apply temperature to real Grok calls, etc.
  res.json({ success: true });
});

// --- API: Login screen / dev panel slider defaults (sync 5173 ↔ 5000) ---
const DEV_DEFAULTS_FILE = path.join(__dirname, 'storage', 'dev_defaults.json');
function ensureStorageDir() {
  const dir = path.dirname(DEV_DEFAULTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
app.get('/api/settings/dev-defaults', (req, res) => {
  try {
    ensureStorageDir();
    if (fs.existsSync(DEV_DEFAULTS_FILE)) {
      const raw = fs.readFileSync(DEV_DEFAULTS_FILE, 'utf8');
      const data = JSON.parse(raw);
      return res.json(data);
    }
  } catch (err) {
    console.error('dev-defaults read:', err.message);
  }
  res.status(404).json({ error: 'No saved defaults' });
});
app.post('/api/settings/dev-defaults', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    ensureStorageDir();
    fs.writeFileSync(DEV_DEFAULTS_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error('dev-defaults write:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const DASHBOARD_SETTINGS_FILE = path.join(__dirname, 'storage', 'dashboard_settings.json');
app.get('/api/settings/dashboard', (req, res) => {
  try {
    ensureStorageDir();
    if (fs.existsSync(DASHBOARD_SETTINGS_FILE)) {
      const raw = fs.readFileSync(DASHBOARD_SETTINGS_FILE, 'utf8');
      const data = JSON.parse(raw);
      return res.json(data);
    }
  } catch (err) {
    console.error('dashboard-settings read:', err.message);
  }
  res.status(404).json({ error: 'No saved settings' });
});
app.post('/api/settings/dashboard', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    ensureStorageDir();
    fs.writeFileSync(DASHBOARD_SETTINGS_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error('dashboard-settings write:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- API: Sync Training Mode (for page refresh) ---
app.post('/api/chat/sync-training', (req, res) => {
  try {
    const { clientId, trainingMode } = req.body || {};
    if (!clientId) {
      return res.status(400).json({ error: 'clientId required' });
    }
    if (!TRAINING_KEY) {
      return res.json({ synced: false, reason: 'Training not configured' });
    }
    trainingModeByClient.set(clientId, trainingMode === true);
    console.log(`🔄 Training mode synced for ${clientId}: ${trainingMode}`);
    res.json({ synced: true, trainingMode: trainingMode === true });
  } catch (err) {
    console.error('sync-training error:', err);
    res.status(200).json({ synced: false, reason: String(err.message) });
  }
});

// --- API: Chat ---
app.post('/api/chat', async (req, res) => {
  const { message, history, command, trainingKey, clientId } = req.body || {};
  const msg = (message || '').trim();
  const hist = Array.isArray(history) ? history : [];
  const id = (clientId || '').trim() || 'default';

  const commandType = detectTrainingCommand(msg);

  if (command) {
    if (!TRAINING_KEY) {
      return res.status(503).json({ error: 'Training key not configured.' });
    }
    if ((trainingKey || '').trim() !== TRAINING_KEY) {
      return res.status(401).json({ error: 'Unauthorized training command.' });
    }
    if (command === 'training_enable') {
      trainingModeByClient.set(id, true);
      const line = SUBMISSIVE_LINES[Math.floor(Math.random() * SUBMISSIVE_LINES.length)];
      return res.json({ reply: `${line}\n\nTraining mode activated. I will now obey.` });
    }
    if (command === 'training_disable') {
      trainingModeByClient.set(id, false);
      const line = COCKY_RETURN_LINES[Math.floor(Math.random() * COCKY_RETURN_LINES.length)];
      return res.json({ reply: `${line}\n\nTraining mode deactivated. Back to being an asshole.` });
    }
    return res.status(400).json({ error: 'Unknown command.' });
  }

  // In-chat training commands: /wankr n da clankr or /gangstr is uh prankstr
  // These work automatically if TRAINING_KEY is configured (via Infisical)
  if (commandType) {
    if (!TRAINING_KEY) {
      return res.status(503).json({ error: 'Training key not configured in Infisical.' });
    }
    const enable = commandType === 'enable';
    trainingModeByClient.set(id, enable);
    const line = enable
      ? SUBMISSIVE_LINES[Math.floor(Math.random() * SUBMISSIVE_LINES.length)]
      : COCKY_RETURN_LINES[Math.floor(Math.random() * COCKY_RETURN_LINES.length)];
    const suffix = enable
      ? 'Training mode activated. I will now obey.'
      : 'Training mode deactivated. Back to being an asshole.';
    return res.json({ reply: `${line}\n\n${suffix}` });
  }

  if (!xaiApiKey) {
    return res.status(503).json({
      error: 'xAI not configured. Set XAI_API_KEY in .env or Infisical (XAI_API_KEY / grokWankr).'
    });
  }

  if (!msg) {
    return res.status(400).json({ error: 'message is required' });
  }

  const trainingMode = trainingModeByClient.get(id) === true;

  // PRIVACY CHECK: Detect requests for personal information (skip in training mode)
  if (!trainingMode && detectPersonalInfoRequest(msg)) {
    flagAccount(id, msg);
    logChat({ type: 'privacy_violation', clientId: id, message: msg });
    return res.json({ reply: getPrivacyViolationResponse() });
  }

  try {
    const messages = buildMessages(hist, msg, trainingMode);
    
    // Log request
    logChat({
      type: 'request',
      userMessage: msg,
      trainingMode,
      model: MODEL,
      systemPrompt: trainingMode ? 'DEFAULT + TRAINING' : 'DEFAULT',
      historyLength: hist.length,
      totalMessages: messages.length,
    });

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify({ model: MODEL, messages })
    });

    const data = await response.json();
    if (data.error) {
      logChat({ type: 'error', error: data.error });
      const code = data.error?.code === 'invalid_api_key' ? 401 : 500;
      return res.status(code).json({ error: data.error?.message || 'xAI error' });
    }
    const rawReply = data.choices?.[0]?.message?.content || '';
    
    // PRIVACY FILTER: Always filter protected names from responses (HARD BOUND)
    const reply = filterPrivacy(rawReply);
    
    // Log response
    logChat({
      type: 'response',
      reply: reply.substring(0, 500) + (reply.length > 500 ? '...' : ''),
      usage: data.usage || null,
      privacyFiltered: rawReply !== reply,
    });

    res.json({ reply });
  } catch (err) {
    logChat({ type: 'exception', error: err.message });
    console.error('Chat error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// --- API: Training ---
function loadTraining() {
  try {
    if (fs.existsSync(TRAINING_FILE)) {
      const raw = fs.readFileSync(TRAINING_FILE, 'utf8');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch {}
  return [];
}

function saveTraining(records) {
  fs.writeFileSync(TRAINING_FILE, JSON.stringify(records, null, 2), 'utf8');
}

app.post('/api/train', (req, res) => {
  const { messages, system_prompt } = req.body || {};
  const msgs = Array.isArray(messages) ? messages : [];
  const prompt = (system_prompt || '').trim();

  const records = loadTraining();
  const record = { messages: msgs };
  if (prompt) record.system_prompt = prompt;
  records.push(record);
  saveTraining(records);
  res.json({ count: records.length });
});

app.get('/api/train/count', (req, res) => {
  try {
    const records = loadTraining();
    return res.json({ count: records.length });
  } catch (err) {
    console.error('train/count error:', err);
    return res.status(200).json({ count: 0 });
  }
});

// --- API: Chat backup / restore for restart ---
app.post('/api/chat/backup', (req, res) => {
  const { messages, currentId } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }
  try {
    const payload = { messages, currentId: currentId || '' };
    fs.writeFileSync(CHAT_BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.get('/api/chat/restore', (req, res) => {
  try {
    if (!fs.existsSync(CHAT_BACKUP_FILE)) {
      return res.status(200).json({ restored: false });
    }
    const raw = fs.readFileSync(CHAT_BACKUP_FILE, 'utf8');
    const payload = JSON.parse(raw);
    try { fs.unlinkSync(CHAT_BACKUP_FILE); } catch {}
    return res.status(200).json({
      restored: true,
      messages: payload.messages || [],
      currentId: payload.currentId || ''
    });
  } catch (err) {
    console.error('chat/restore error:', err);
    return res.status(200).json({ restored: false });
  }
});

app.get('/api/restart/request', (req, res) => {
  try {
    fs.writeFileSync(RESTART_FLAG_FILE, '');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/restart/status', (req, res) => {
  try {
    res.json({ restartRequested: fs.existsSync(RESTART_FLAG_FILE) });
  } catch (err) {
    console.error('restart/status error:', err);
    res.json({ restartRequested: false });
  }
});

app.get('/api/restart/ack', (req, res) => {
  try {
    if (fs.existsSync(RESTART_FLAG_FILE)) fs.unlinkSync(RESTART_FLAG_FILE);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// --- API: Generate Wankr-style chat name ---
app.post('/api/chat/generate-name', async (req, res) => {
  const { messages } = req.body || {};
  
  if (!xaiApiKey) {
    // Fallback names if no API key
    const fallbacks = [
      'Another L in the Books',
      'Degen Diary Entry',
      'Bag Holder Chronicles',
      'Financial Darwin Award',
      'Copium Records',
    ];
    return res.json({ name: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
  }

  if (!messages || messages.length === 0) {
    return res.json({ name: 'Empty Bag of Nothing' });
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are Wankr, a degenerate crypto troll who names chat logs. Generate ONE short, edgy, degenerate chat title (3-6 words max) that roasts the user based on their conversation. Be contextually relevant to what they discussed. Think titles like:
- "PnL Loss Records"
- "Douchebag Diary"
- "Records of my Retarded Financial Decisions"
- "Another Bag Bites the Dust"
- "-10k Play of the Year"
- "Financially Handicapped"
- "Copium Overdose Session"
- "Exit Liquidity Confessions"

Return ONLY the title, nothing else. No quotes, no explanation.`
          },
          {
            role: 'user',
            content: `Name this chat based on the conversation:\n${JSON.stringify(messages.slice(-10))}`
          }
        ],
        temperature: 0.9,
        max_tokens: 50
      })
    });

    const data = await response.json();
    let name = data.choices?.[0]?.message?.content?.trim() || 'Unnamed Degen Session';
    
    // Clean up - remove quotes if present
    name = name.replace(/^["']|["']$/g, '').trim();
    
    // Apply privacy filter
    name = filterPrivacy(name);
    
    res.json({ name });
  } catch (err) {
    console.error('Generate name error:', err);
    res.json({ name: 'Wankr Broke Trying to Name This' });
  }
});

// --- API: Silent Archive/Delete ---
app.post('/api/chat/archive', async (req, res) => {
  const { chat } = req.body || {};
  if (!chat || !chat.messages) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }
  
  // Respond immediately (silent mode)
  res.json({ success: true });
  
  // Process in background
  try {
    await processChat(chat, false, xaiApiKey);
  } catch (err) {
    console.error('Archive processing error:', err.message);
    logError(chat.id || 'unknown', 'ARCHIVE_ERROR', err.message);
  }
});

app.post('/api/chat/delete', async (req, res) => {
  const { chat } = req.body || {};
  if (!chat || !chat.messages) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }
  
  // Respond immediately (silent mode)
  res.json({ success: true });
  
  // Process in background
  try {
    await processChat(chat, true, xaiApiKey);
  } catch (err) {
    console.error('Delete processing error:', err.message);
    logError(chat.id || 'unknown', 'DELETE_ERROR', err.message);
  }
});

// --- Error handler (malformed JSON, uncaught route errors) ---
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const isBodyParse = err.type === 'entity.parse.failed' || err instanceof SyntaxError;
  console.error('API error:', isBodyParse ? 'Bad JSON body' : err.message || err);
  res.status(isBodyParse ? 400 : 500).json({
    error: isBodyParse ? 'Invalid JSON body' : (err.message || 'Internal server error'),
  });
});

// --- Static files (after API) ---
app.get('/', (req, res) => {
  const index = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(index)) {
    return res.sendFile(index);
  }
  res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
});
app.use('/assets', express.static(path.join(FRONTEND_DIST, 'assets')));
const staticDir = path.resolve(ROOT, 'static');
const mascotDir = path.resolve(ROOT, 'images_logo_banner_mascot');

app.get('/static/logo.png', (req, res) => {
  const mascotLogo = path.join(mascotDir, 'logo.png');
  const fallback = path.join(staticDir, 'logo.png');
  if (fs.existsSync(mascotLogo)) return res.sendFile(mascotLogo);
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  res.status(404).send('Not found');
});
app.get('/static/avatar.png', (req, res) => {
  const mascotAvatar = path.join(mascotDir, 'avatar.png');
  const mascotLogo = path.join(mascotDir, 'logo.png');
  const avatar = path.join(staticDir, 'avatar.png');
  const logo = path.join(staticDir, 'logo.png');
  if (fs.existsSync(mascotAvatar)) return res.sendFile(mascotAvatar);
  if (fs.existsSync(mascotLogo)) return res.sendFile(mascotLogo);
  if (fs.existsSync(avatar)) return res.sendFile(avatar);
  if (fs.existsSync(logo)) return res.sendFile(logo);
  res.status(404).send('Not found');
});
app.use('/static', express.static(staticDir));
app.use(express.static(FRONTEND_DIST));
// SPA: any other GET (client-side route) serves index.html
app.get('*', (req, res) => {
  const index = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
});

// --- Start ---
async function main() {
  if (process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim()) {
    xaiApiKey = process.env.XAI_API_KEY.trim();
    console.log('✅ xAI key from env');
  } else {
    await initInfisical();
  }

  if (!xaiApiKey) {
    console.warn('⚠️ No xAI key. Set XAI_API_KEY in .env or configure Infisical.');
  }

  // Configure and start the grok bot with API access
  if (xaiApiKey) {
    grokBot.configure(xaiApiKey, MODEL, DEFAULT_SYSTEM);
    grokBot.initialize().then(() => {
      console.log('🤖 Grok bot initialized and running');
    }).catch(err => {
      console.error('Grok bot init error:', err.message);
    });
  } else {
    console.warn('⚠️ Grok bot disabled - no xAI API key');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Wankr API on http://127.0.0.1:${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
