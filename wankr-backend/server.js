// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { InfisicalClient } = require('@infisical/sdk');
const { processChat, logError, FOLDERS: ARCHIVE_FOLDERS } = require('./archiveService');
const activeChatService = require('./activeChatService');
const {
  register: authRegister,
  login: authLogin,
  checkUsernameAvailable,
  validateSession,
  destroySession,
  getActiveUsernames,
} = require('./authService');
const grokBot = require('./grokBotService');
const kolAnalysis = require('./kolAnalysisService');

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
let viteApiKey = null;
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
  console.log(`🔑 Infisical check: clientId=${clientId ? 'set' : 'MISSING'}, secret=${clientSecret ? 'set' : 'MISSING'}, project=${projectId ? 'set' : 'MISSING'}`);
  if (!clientId || !clientSecret || !projectId) {
    console.warn('⚠️ Infisical skipped: missing credentials');
    return;
  }

  try {
    console.log('🔑 Connecting to Infisical...');
    const client = new InfisicalClient({
      siteUrl: 'https://app.infisical.com',
      clientId,
      clientSecret,
    });
    const env = process.env.INFISICAL_ENVIRONMENT || 'dev';
    console.log(`🔑 Fetching secrets from env="${env}", project="${projectId}"...`);

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
          console.log(`✅ xAI key loaded from Infisical (${secretName}), length=${xaiApiKey.length}`);
          return;
        }
        console.log(`🔑 Secret "${secretName}" found but empty`);
      } catch (secretErr) {
        console.log(`🔑 Secret "${secretName}" not found: ${secretErr.message || secretErr}`);
        continue;
      }
    }
    console.warn('⚠️ Infisical connected but no valid xAI key found');
    try {
      const secret = await client.getSecret({
        environment: env,
        projectId,
        secretName: 'VITE_API_KEY',
      });
      const val = secret?.secretValue || secret?.secret_value || '';
      if (val && val.trim()) {
        viteApiKey = val.trim();
        console.log(`✅ VITE_API_KEY loaded from Infisical, length=${viteApiKey.length}`);
      }
    } catch (secretErr) {
      console.log(`🔑 VITE_API_KEY not in Infisical: ${secretErr.message || secretErr}`);
    }
  } catch (err) {
    console.warn('❌ Infisical init failed:', err.message);
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
// Root /health for Railway/load-balancer liveness (plain 200)
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});
app.get('/api/health', (req, res) => {
  res.json({ backend: 'node', ok: true });
});

// --- API: Spectator Mode / Grok Bot ---

// Get all active conversations for spectator view (grok + logged-in users with valid session)
app.get('/api/spectator/users', (req, res) => {
  try {
    const grokUsers = grokBot.getActiveUsers();
    const activeUsernames = getActiveUsernames();
    const realUsers = activeUsernames
      .filter((u) => u !== 'grok')
      .map((username) => {
        const chats = activeChatService.getChats(username);
        const latest = [...chats].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
        const lastMessages = latest && Array.isArray(latest.messages) ? latest.messages.slice(-4) : [];
        return {
          id: username,
          username,
          online: true,
          lastMessages,
        };
      });
    const users = [...grokUsers, ...realUsers];
    res.json({ users });
  } catch (err) {
    console.error('spectator/users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get specific conversation for spectator view (grok or real user by username)
app.get('/api/spectator/conversation/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === 'grok') {
      const conv = grokBot.getGrokConversation();
      res.json({ conversation: conv });
      return;
    }
    const chats = activeChatService.getChats(userId);
    const latest = [...chats].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
    if (!latest || !Array.isArray(latest.messages)) {
      return res.json({ conversation: { messages: [] } });
    }
    res.json({ conversation: { messages: latest.messages } });
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

// Emergency kill: stop grok processor and clear queue (conversation history preserved)
app.post('/api/grok/kill', (req, res) => {
  try {
    grokBot.emergencyKill();
    res.json({ killed: true, message: 'Grok conversation stopped' });
  } catch (err) {
    console.error('grok/kill error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// --- API: KOL Analysis (WANKR_SPEC.md social analysis engine) ---

// Get all KOL accounts with scores
app.get('/api/kol/accounts', (req, res) => {
  try {
    const accounts = kolAnalysis.getAccounts();
    const sort = req.query.sort || 'roastPriority';
    const asc = req.query.order === 'asc';
    const sorted = [...accounts].sort((a, b) => {
      const av = a[sort] ?? 0;
      const bv = b[sort] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return asc ? cmp : -cmp;
    });
    res.json({ accounts: sorted });
  } catch (err) {
    console.error('GET /api/kol/accounts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get aggregate stats
app.get('/api/kol/stats', (req, res) => {
  try {
    const stats = kolAnalysis.getStats();
    res.json(stats);
  } catch (err) {
    console.error('GET /api/kol/stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Analyze a single account
app.get('/api/kol/analyze/:handle', (req, res) => {
  try {
    const result = kolAnalysis.analyzeAccount(req.params.handle);
    if (!result) {
      return res.status(404).json({ error: 'Account not found in KOL database' });
    }
    res.json(result);
  } catch (err) {
    console.error('GET /api/kol/analyze:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reload KOL database from xlsx
app.post('/api/kol/reload', (req, res) => {
  try {
    const accounts = kolAnalysis.getAccounts(true);
    res.json({ reloaded: true, count: accounts.length });
  } catch (err) {
    console.error('POST /api/kol/reload:', err);
    res.status(500).json({ error: err.message });
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
    const { username, password, email } = req.body || {};
    const result = await authRegister(username, password, email);
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

// --- API: Training storage (sources, override, stats) ---
const TRAINING_MANIFEST_PATH = path.join(path.dirname(ARCHIVE_FOLDERS.trainingConversations), 'manifest.json');

function readTrainingManifest() {
  try {
    if (fs.existsSync(TRAINING_MANIFEST_PATH)) {
      const raw = fs.readFileSync(TRAINING_MANIFEST_PATH, 'utf8');
      const data = JSON.parse(raw);
      return {
        conversations: Array.isArray(data.conversations) ? data.conversations : [],
        overrides: Array.isArray(data.overrides) ? data.overrides : [],
        external: Array.isArray(data.external) ? data.external : [],
      };
    }
  } catch (err) {
    console.error('readTrainingManifest:', err.message);
  }
  return { conversations: [], overrides: [], external: [] };
}

function writeTrainingManifest(manifest) {
  const dir = path.dirname(TRAINING_MANIFEST_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TRAINING_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

app.get('/api/training/sources', (req, res) => {
  try {
    const manifest = readTrainingManifest();
    const conversations = [];
    if (fs.existsSync(ARCHIVE_FOLDERS.trainingConversations)) {
      const files = fs.readdirSync(ARCHIVE_FOLDERS.trainingConversations)
        .filter(f => f.endsWith('.json.gz'))
        .map(f => {
          const fullPath = path.join(ARCHIVE_FOLDERS.trainingConversations, f);
          const stat = fs.statSync(fullPath);
          return { file: f, mtime: stat.mtime.toISOString(), path: fullPath };
        });
      for (const { file, mtime, path: fullPath } of files) {
        let username = '';
        let pairCount = 0;
        try {
          const buf = fs.readFileSync(fullPath);
          const json = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
          username = json.username || '';
          pairCount = Array.isArray(json.trainingPairs) ? json.trainingPairs.length : 0;
        } catch (_) { /* ignore */ }
        conversations.push({ file, username, timestamp: mtime, pairCount });
      }
    }
    const overrides = manifest.overrides.slice();
    if (fs.existsSync(ARCHIVE_FOLDERS.trainingOverrides)) {
      const seen = new Set(overrides.map(o => o.file));
      fs.readdirSync(ARCHIVE_FOLDERS.trainingOverrides).forEach(f => {
        if (!seen.has(f)) {
          overrides.push({ file: f, description: '', active: true });
          seen.add(f);
        }
      });
    }
    const external = manifest.external.slice();
    if (fs.existsSync(ARCHIVE_FOLDERS.trainingExternal)) {
      const seen = new Set(external.map(e => e.file));
      fs.readdirSync(ARCHIVE_FOLDERS.trainingExternal).forEach(f => {
        if (!seen.has(f)) {
          const fullPath = path.join(ARCHIVE_FOLDERS.trainingExternal, f);
          const stat = fs.statSync(fullPath);
          external.push({ file: f, description: '', addedAt: stat.mtime.toISOString() });
          seen.add(f);
        }
      });
    }
    res.json({ conversations, overrides, external });
  } catch (err) {
    console.error('GET /api/training/sources:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/training/override', (req, res) => {
  try {
    const { name, content, description, active } = req.body || {};
    const safeName = (name || 'override').replace(/[^a-zA-Z0-9_-]/g, '_').trim() || 'override';
    const fileName = `${safeName}.txt`;
    const dir = ARCHIVE_FOLDERS.trainingOverrides;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, String(content ?? ''), 'utf8');
    const manifest = readTrainingManifest();
    const existing = manifest.overrides.findIndex(o => o.file === fileName);
    const entry = { file: fileName, description: String(description ?? ''), active: active !== false };
    if (existing >= 0) manifest.overrides[existing] = entry;
    else manifest.overrides.push(entry);
    writeTrainingManifest(manifest);
    res.json({ success: true, file: fileName });
  } catch (err) {
    console.error('POST /api/training/override:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/training/stats', (req, res) => {
  try {
    const manifest = readTrainingManifest();
    let conversationCount = 0;
    let conversationPairs = 0;
    if (fs.existsSync(ARCHIVE_FOLDERS.trainingConversations)) {
      const files = fs.readdirSync(ARCHIVE_FOLDERS.trainingConversations).filter(f => f.endsWith('.json.gz'));
      conversationCount = files.length;
      for (const f of files) {
        try {
          const buf = fs.readFileSync(path.join(ARCHIVE_FOLDERS.trainingConversations, f));
          const json = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
          conversationPairs += Array.isArray(json.trainingPairs) ? json.trainingPairs.length : 0;
        } catch (_) { /* ignore */ }
      }
    }
    const overrideCount = fs.existsSync(ARCHIVE_FOLDERS.trainingOverrides)
      ? fs.readdirSync(ARCHIVE_FOLDERS.trainingOverrides).length
      : 0;
    const externalCount = fs.existsSync(ARCHIVE_FOLDERS.trainingExternal)
      ? fs.readdirSync(ARCHIVE_FOLDERS.trainingExternal).length
      : 0;
    res.json({
      conversations: { files: conversationCount, pairs: conversationPairs },
      overrides: { files: overrideCount },
      external: { files: externalCount },
      manifest: { overrides: manifest.overrides.length, external: manifest.external.length },
    });
  } catch (err) {
    console.error('GET /api/training/stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Dev-only: UI architecture and developer tools only on dev local port ---
const DEV_UI_PORT = process.env.DEV_UI_PORT || '5173';
function isRequestFromDevOrigin(req) {
  const origin = req.get('origin') || req.get('referer') || '';
  return origin.includes(`:${DEV_UI_PORT}`);
}
function rejectUnlessDevOrigin(req, res, next) {
  if (isRequestFromDevOrigin(req)) return next();
  res.status(403).json({ error: 'UI architecture and developer tools are only available on the dev local port' });
}

// --- API: Login screen / dev panel slider defaults (sync 5173 ↔ 5000) ---
const DEV_DEFAULTS_FILE = path.join(__dirname, 'storage', 'dev_defaults.json');
function ensureStorageDir() {
  const dir = path.dirname(DEV_DEFAULTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
app.get('/api/config', (req, res) => {
  const apiKey = viteApiKey || (process.env.VITE_API_KEY || '').trim();
  res.json({ apiKey: apiKey || undefined });
});

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
app.post('/api/settings/dev-defaults', rejectUnlessDevOrigin, (req, res) => {
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
app.post('/api/settings/dashboard', rejectUnlessDevOrigin, (req, res) => {
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
      error: 'xAI not configured. Set XAI_API_KEY or grokWankr in Infisical, or XAI_API_KEY in .env.'
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
      const errCode = typeof data.error === 'string' ? data.error : (data.error?.code || 'unknown');
      const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
      logChat({ type: 'error', error: data.error });
      console.error(`xAI API error (${response.status}):`, errMsg);
      const code = errCode === 'invalid_api_key' ? 401 : 500;
      return res.status(code).json({ error: errMsg });
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
    const restartRequested = fs.existsSync(RESTART_FLAG_FILE);
    res.status(200).json({ restartRequested });
  } catch (err) {
    console.error('restart/status error:', err);
    res.status(200).json({ restartRequested: false });
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

// --- API: Silent Archive/Delete + Active Chats (temporary folder) ---
function getUsernameFromRequest(req) {
  const body = req.body || {};
  const { token } = body;
  const tokenValue = token || req.query?.token;
  // Always validate via session token first (prevents username spoofing)
  if (tokenValue) {
    const result = validateSession(tokenValue);
    if (result.valid && result.username) return result.username;
  }
  // Fallback: trust body username/chat.username only when no token is present (backward compat for unauthenticated flows)
  const { chat, username } = body;
  if (username && String(username).trim()) return String(username).trim();
  if (chat && chat.username && String(chat.username).trim()) return String(chat.username).trim();
  return null;
}

// --- API: Active chats (per-user temporary folder, recallable) ---
app.get('/api/chats/active', (req, res) => {
  const username = getUsernameFromRequest(req);
  if (!username) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const chats = activeChatService.getChats(username);
    res.json({ chats });
  } catch (err) {
    console.error('GET /api/chats/active:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/active', (req, res) => {
  const username = getUsernameFromRequest(req);
  if (!username) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { chat } = req.body || {};
  if (!chat || !Array.isArray(chat.messages)) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }
  res.json({ success: true });
  try {
    const overflow = activeChatService.addChat(username, chat);
    if (overflow) {
      processChat(overflow, true, username, xaiApiKey).catch(err => {
        console.error('Active chat overflow processing:', err.message);
        logError(overflow.id || 'unknown', 'OVERFLOW_ERROR', err.message);
      });
    }
    // Red box (Stored): also store in global archives and keep updated there until delete
    processChat(chat, false, username, xaiApiKey).catch(err => {
      console.error('Active chat global archive sync:', err.message);
      logError(chat.id || 'unknown', 'ACTIVE_SYNC_ERROR', err.message);
    });
  } catch (err) {
    console.error('POST /api/chats/active:', err);
  }
});

app.delete('/api/chats/active/:chatId', (req, res) => {
  const username = getUsernameFromRequest(req);
  if (!username) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const chatId = req.params.chatId;
  if (!chatId) {
    return res.status(400).json({ error: 'chatId required' });
  }
  res.json({ success: true });
  try {
    const removed = activeChatService.removeChat(username, chatId);
    if (removed && removed.messages && removed.messages.length > 0) {
      processChat(removed, true, username, xaiApiKey).catch(err => {
        console.error('Active chat delete processing:', err.message);
        logError(removed.id || 'unknown', 'DELETE_ACTIVE_ERROR', err.message);
      });
    }
  } catch (err) {
    console.error('DELETE /api/chats/active:', err);
  }
});

app.post('/api/chat/archive', async (req, res) => {
  const { chat } = req.body || {};
  if (!chat || !chat.messages) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }
  const username = getUsernameFromRequest(req);

  // Respond immediately (silent mode)
  res.json({ success: true });

  try {
    if (username) {
      const overflow = activeChatService.addChat(username, chat);
      if (overflow) {
        processChat(overflow, true, username, xaiApiKey).catch(err => {
          console.error('Archive overflow processing:', err.message);
          logError(overflow.id || 'unknown', 'OVERFLOW_ERROR', err.message);
        });
      }
    }
    await processChat(chat, false, username, xaiApiKey);
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
  const username = getUsernameFromRequest(req);

  // Respond immediately (silent mode)
  res.json({ success: true });

  try {
    if (username && chat.id) {
      activeChatService.removeChat(username, chat.id);
    }
    await processChat(chat, true, username, xaiApiKey);
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

// Dev: proxy UI to Vite so opening 5000 shows live app (set PROXY_UI_TO_VITE=1). /api stays on this server.
if (process.env.PROXY_UI_TO_VITE === '1') {
  const { createProxyMiddleware } = require('http-proxy-middleware');
  app.use(
    createProxyMiddleware({
      target: `http://127.0.0.1:${DEV_UI_PORT}`,
      changeOrigin: true,
      ws: true,
    })
  );
  console.log(`🔄 UI proxying to Vite at http://127.0.0.1:${DEV_UI_PORT} (PROXY_UI_TO_VITE=1)`);
} else {
  app.use(express.static(FRONTEND_DIST));
  // SPA: any other GET (client-side route) serves index.html
  app.get('*', (req, res) => {
    const index = path.join(FRONTEND_DIST, 'index.html');
    if (fs.existsSync(index)) return res.sendFile(index);
    res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
  });
}

// --- Start ---
async function main() {
  // Prefer Infisical for xAI API key (Grok bot and chat); fall back to .env
  await initInfisical();
  if (!xaiApiKey && process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim()) {
    xaiApiKey = process.env.XAI_API_KEY.trim();
    console.log('✅ xAI key from .env (fallback)');
  }
  if (!xaiApiKey) {
    console.warn('⚠️ No xAI key. Set XAI_API_KEY (or grokWankr) in Infisical, or XAI_API_KEY in .env.');
  }
  if (!viteApiKey && process.env.VITE_API_KEY && process.env.VITE_API_KEY.trim()) {
    viteApiKey = process.env.VITE_API_KEY.trim();
  }

  // Configure and start the grok bot with API access (uses key from Infisical or .env)
  if (xaiApiKey) {
    grokBot.configure(xaiApiKey, MODEL, DEFAULT_SYSTEM);
    grokBot.initialize().then(() => {
      console.log('🤖 Grok bot initialized and running (API key from Infisical or .env)');
    }).catch(err => {
      console.error('Grok bot init error:', err.message);
    });
  } else {
    console.warn('⚠️ Grok bot disabled - no xAI API key');
  }

  // Hourly cleanup of stale active chats (< 5 exchanges, idle 7+ days)
  activeChatService.runCleanup();
  setInterval(activeChatService.runCleanup, 60 * 60 * 1000);

  // Railway (and similar) set PORT; use that port only. Local dev uses 5000 with fallback range.
  const portFromEnv = process.env.PORT;
  const { server, port: actualPort } = portFromEnv
    ? await listenSingle(Number(portFromEnv))
    : await tryListenPort(5000);

  console.log(`🚀 Wankr API on http://127.0.0.1:${actualPort}`);
  if (actualPort !== 5000 && !portFromEnv) {
    console.warn(`⚠️ Frontend proxy expects port 5000. This process is on ${actualPort}. Stop the other backend or use PORT=5000.`);
  }
  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

/** Listen on a single port (for Railway etc.). Resolves with { server, port } or rejects. */
function listenSingle(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve({ server, port }));
    server.once('error', reject);
  });
}

/** Try ports from startPort up to 5010; resolve with { server, port } or reject. Used when PORT is not set (local dev). */
function tryListenPort(startPort) {
  const maxPort = 5010;
  return new Promise((resolve, reject) => {
    function attempt(port) {
      if (port > maxPort) {
        return reject(new Error(`Ports ${startPort}-${maxPort} in use`));
      }
      const server = app.listen(port, () => {
        resolve({ server, port });
      });
      server.once('error', (err) => {
        server.close(() => {});
        if (err.code === 'EADDRINUSE') {
          attempt(port + 1);
        } else {
          reject(err);
        }
      });
    }
    attempt(startPort);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
