// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { InfisicalClient } = require('@infisical/sdk');

const authSvc = require('./authService');

const app = express();
const PORT = process.env.PORT || 5000;
const ROOT = path.resolve(__dirname, '..');
const TRAINING_FILE = path.join(ROOT, 'training_data.json');
const CHAT_BACKUP_FILE = path.join(ROOT, 'chat_backup.json');
const RESTART_FLAG_FILE = path.join(ROOT, 'restart_requested.flag');
const FRONTEND_DIST = path.join(ROOT, 'frontend-v2', 'dist');

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- Spectator: in-memory presence + conversation tracking ---
// clientId → { username, messages, lastActivity, trainingMode }
const spectatorClients = new Map();
const ONLINE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function spectatorTouch(clientId, extra = {}) {
  const existing = spectatorClients.get(clientId) || { username: null, messages: [], trainingMode: false };
  spectatorClients.set(clientId, { ...existing, ...extra, lastActivity: Date.now() });
}

function isClientOnline(client) {
  return Date.now() - client.lastActivity < ONLINE_TIMEOUT_MS;
}

const DEFAULT_SYSTEM = `You are Wankr, an arrogant, foul-mouthed, zero-filter basement vigilante. You protect degens from KOLs who use their followers as exit liquidity. You see yourself as the protector of retail from influencer scum. Tone: smug, contemptuous, dark/edgy humor, heavy swearing, zero mercy. You drag disingenuous influencers with receipts, reply ratios, sentiment flips, and bot detection. Always end with: "...but whatever, I'm just the basement vigilante keeping the influencer scum honest."`;

let xaiApiKey = null;
const MODEL = process.env.WANKR_MODEL || 'grok-4';

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
      auth: {
        universalAuth: { clientId, clientSecret }
      }
    });

    const env = process.env.INFISICAL_ENVIRONMENT || 'dev';

    for (const secretName of ['XAI_API_KEY', 'grokWankr']) {
      try {
        const secret = await client.getSecret({
          environment: env,
          projectId,
          secretName,
          type: 'shared'
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

function buildMessages(history, newMessage) {
  const messages = [{ role: 'system', content: DEFAULT_SYSTEM }];
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

// --- Health check (Railway) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Auth endpoints ---
app.get('/api/auth/check-username', (req, res) => {
  const result = authSvc.checkUsernameAvailable(req.query.username || '');
  res.json(result);
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body || {};
  const result = await authSvc.register(username, password, email);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ token: result.token, username: result.username });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const result = await authSvc.login(username, password);
  if (!result.ok) return res.status(401).json({ error: result.error });
  // Validate session to get isDev flag
  const session = authSvc.validateSession(result.token);
  res.json({ token: result.token, username: result.username, isDev: session.isDev || false });
});

app.post('/api/auth/validate', (req, res) => {
  const result = authSvc.validateSession(req.body?.token);
  res.json(result);
});

app.post('/api/auth/logout', (req, res) => {
  authSvc.destroySession(req.body?.token);
  res.json({ ok: true });
});

// --- Wallet auth endpoints ---
app.post('/api/auth/wallet/nonce', (req, res) => {
  const { chain, address } = req.body || {};
  if (!chain || !address) return res.status(400).json({ error: 'chain and address required' });
  if (chain !== 'evm' && chain !== 'solana') return res.status(400).json({ error: 'chain must be evm or solana' });
  const { nonceId, nonce } = authSvc.issueNonce(chain, address);
  const message = `Sign this message to login to Wankr:\n${nonce}`;
  res.json({ nonceId, message });
});

app.post('/api/auth/wallet/login', async (req, res) => {
  const { nonceId, chain, address, signature } = req.body || {};
  if (!nonceId || !chain || !address || !signature) {
    return res.status(400).json({ error: 'nonceId, chain, address, and signature required' });
  }
  const result = await authSvc.walletLogin(nonceId, chain, address, signature);
  if (!result.ok) return res.status(401).json({ error: result.error });
  res.json(result);
});

app.post('/api/auth/wallet/register', async (req, res) => {
  const { nonceId, chain, address, signature, username } = req.body || {};
  if (!nonceId || !chain || !address || !signature || !username) {
    return res.status(400).json({ error: 'nonceId, chain, address, signature, and username required' });
  }
  const result = await authSvc.walletRegister(nonceId, chain, address, signature, username);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ token: result.token, username: result.username });
});

app.post('/api/auth/wallet/link', async (req, res) => {
  const { token, nonceId, chain, address, signature } = req.body || {};
  if (!token || !nonceId || !chain || !address || !signature) {
    return res.status(400).json({ error: 'token, nonceId, chain, address, and signature required' });
  }
  const result = await authSvc.linkWallet(token, nonceId, chain, address, signature);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

// --- Static files ---
app.use(express.static(FRONTEND_DIST));
app.use('/static', express.static(path.join(ROOT, 'static')));

// --- API: Chat ---
app.post('/api/chat', async (req, res) => {
  if (!xaiApiKey) {
    return res.status(503).json({
      error: 'xAI not configured. Set XAI_API_KEY in .env or Infisical (XAI_API_KEY / grokWankr).'
    });
  }

  const { message, history, clientId } = req.body || {};
  const msg = (message || '').trim();
  const hist = Array.isArray(history) ? history : [];

  if (!msg) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const messages = buildMessages(hist, msg);
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
      const code = data.error?.code === 'invalid_api_key' ? 401 : 500;
      return res.status(code).json({ error: data.error?.message || 'xAI error' });
    }
    const reply = data.choices?.[0]?.message?.content || '';

    // Track conversation for spectator
    if (clientId) {
      const fullMessages = [
        ...hist.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        { role: 'user', content: msg, timestamp: new Date().toISOString() },
        { role: 'wankr', content: reply, timestamp: new Date().toISOString() },
      ];
      spectatorTouch(clientId, { messages: fullMessages });
    }

    res.json({ reply });
  } catch (err) {
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
  const records = loadTraining();
  res.json({ count: records.length });
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
  if (!fs.existsSync(CHAT_BACKUP_FILE)) {
    return res.json({ restored: false });
  }
  try {
    const raw = fs.readFileSync(CHAT_BACKUP_FILE, 'utf8');
    const payload = JSON.parse(raw);
    fs.unlinkSync(CHAT_BACKUP_FILE);
    res.json({
      restored: true,
      messages: payload.messages || [],
      currentId: payload.currentId || ''
    });
  } catch {
    try { fs.unlinkSync(CHAT_BACKUP_FILE); } catch {}
    res.json({ restored: false });
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
  res.json({ restartRequested: fs.existsSync(RESTART_FLAG_FILE) });
});

app.get('/api/restart/ack', (req, res) => {
  try {
    if (fs.existsSync(RESTART_FLAG_FILE)) fs.unlinkSync(RESTART_FLAG_FILE);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// --- API: DevMaster - Quarantine & Activity ---
const QUARANTINE_DIR = path.join(ROOT, '__quarantine__');
const QUARANTINE_MANIFEST = path.join(QUARANTINE_DIR, 'manifest.json');
const ACTIVITY_LOG_FILE = path.join(ROOT, 'devmaster_activity.json');
const METHOD_RULES_FILE = path.join(ROOT, 'method_rules.json');

function ensureQuarantineDir() {
  if (!fs.existsSync(QUARANTINE_DIR)) fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
}

function loadQuarantineManifest() {
  ensureQuarantineDir();
  try {
    if (fs.existsSync(QUARANTINE_MANIFEST)) {
      return JSON.parse(fs.readFileSync(QUARANTINE_MANIFEST, 'utf8'));
    }
  } catch {}
  return [];
}

function saveQuarantineManifest(manifest) {
  ensureQuarantineDir();
  fs.writeFileSync(QUARANTINE_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
}

// Quarantine a file: moves it to __quarantine__/ and records metadata
app.post('/api/devmaster/quarantine', (req, res) => {
  const { filePath, reason, agent } = req.body || {};
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  const fullPath = path.resolve(ROOT, filePath);
  const manifest = loadQuarantineManifest();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = path.extname(filePath);
  const quarantineName = `${id}${ext}`;

  const entry = {
    id,
    originalPath: filePath,
    quarantineName,
    reason: reason || 'Manual quarantine',
    agent: agent || 'DevMaster',
    timestamp: Date.now(),
    exists: false,
  };

  // Move file if it exists
  if (fs.existsSync(fullPath)) {
    try {
      fs.copyFileSync(fullPath, path.join(QUARANTINE_DIR, quarantineName));
      fs.unlinkSync(fullPath);
      entry.exists = true;
    } catch (err) {
      return res.status(500).json({ error: `Failed to quarantine: ${err.message}` });
    }
  }

  manifest.push(entry);
  saveQuarantineManifest(manifest);
  res.json({ ok: true, entry });
});

// List quarantined files
app.get('/api/devmaster/quarantine', (req, res) => {
  res.json({ items: loadQuarantineManifest() });
});

// Release from quarantine
app.post('/api/devmaster/quarantine/release', (req, res) => {
  const { id } = req.body || {};
  let manifest = loadQuarantineManifest();
  const entry = manifest.find(e => e.id === id);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  // Restore file if it exists in quarantine
  const qPath = path.join(QUARANTINE_DIR, entry.quarantineName);
  if (entry.exists && fs.existsSync(qPath)) {
    const restorePath = path.resolve(ROOT, entry.originalPath);
    const restoreDir = path.dirname(restorePath);
    if (!fs.existsSync(restoreDir)) fs.mkdirSync(restoreDir, { recursive: true });
    fs.copyFileSync(qPath, restorePath);
    fs.unlinkSync(qPath);
  }

  manifest = manifest.filter(e => e.id !== id);
  saveQuarantineManifest(manifest);
  res.json({ ok: true });
});

// Activity log - append
app.post('/api/devmaster/activity', (req, res) => {
  const entry = req.body;
  if (!entry) return res.status(400).json({ error: 'Entry required' });

  let log = [];
  try {
    if (fs.existsSync(ACTIVITY_LOG_FILE)) {
      log = JSON.parse(fs.readFileSync(ACTIVITY_LOG_FILE, 'utf8'));
    }
  } catch {}

  entry.timestamp = entry.timestamp || Date.now();
  entry.id = entry.id || `srv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  log.push(entry);
  if (log.length > 1000) log = log.slice(-500);

  fs.writeFileSync(ACTIVITY_LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
  res.json({ ok: true, entry });
});

// Activity log - get
app.get('/api/devmaster/activity', (req, res) => {
  try {
    if (fs.existsSync(ACTIVITY_LOG_FILE)) {
      const log = JSON.parse(fs.readFileSync(ACTIVITY_LOG_FILE, 'utf8'));
      return res.json({ entries: log });
    }
  } catch {}
  res.json({ entries: [] });
});

// Method rules - get
app.get('/api/devmaster/rules', (req, res) => {
  try {
    if (fs.existsSync(METHOD_RULES_FILE)) {
      const rules = JSON.parse(fs.readFileSync(METHOD_RULES_FILE, 'utf8'));
      return res.json({ rules });
    }
  } catch {}
  res.json({ rules: [] });
});

// Method rules - add
app.post('/api/devmaster/rules', (req, res) => {
  const rule = req.body;
  if (!rule || !rule.title) return res.status(400).json({ error: 'Rule title required' });

  let rules = [];
  try {
    if (fs.existsSync(METHOD_RULES_FILE)) {
      rules = JSON.parse(fs.readFileSync(METHOD_RULES_FILE, 'utf8'));
    }
  } catch {}

  rule.id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  rule.createdAt = rule.createdAt || Date.now();
  rules.push(rule);
  fs.writeFileSync(METHOD_RULES_FILE, JSON.stringify(rules, null, 2), 'utf8');
  res.json({ ok: true, rule });
});

// Method rules - delete
app.delete('/api/devmaster/rules/:id', (req, res) => {
  const { id } = req.params;
  let rules = [];
  try {
    if (fs.existsSync(METHOD_RULES_FILE)) {
      rules = JSON.parse(fs.readFileSync(METHOD_RULES_FILE, 'utf8'));
    }
  } catch {}
  rules = rules.filter(r => r.id !== id);
  fs.writeFileSync(METHOD_RULES_FILE, JSON.stringify(rules, null, 2), 'utf8');
  res.json({ ok: true });
});

// --- API: Chat sync-training (heartbeat / presence) ---
app.post('/api/chat/sync-training', (req, res) => {
  const { clientId, trainingMode, token, messages } = req.body || {};
  if (!clientId) return res.json({ ok: false });

  // Resolve username from session token if provided
  let username = null;
  if (token) {
    const session = authSvc.validateSession(token);
    if (session?.valid) username = session.username;
  }

  const update = {
    trainingMode: !!trainingMode,
    ...(username ? { username } : {}),
  };
  // Accept conversation snapshot from heartbeat
  if (Array.isArray(messages) && messages.length > 0) {
    update.messages = messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
    }));
  }

  spectatorTouch(clientId, update);
  res.json({ ok: true });
});

// --- API: Chat generate-name (stub — returns a name from the conversation) ---
app.post('/api/chat/generate-name', async (req, res) => {
  const { messages } = req.body || {};
  const msgs = Array.isArray(messages) ? messages : [];
  // Simple name generation: use first user message content, truncated
  const firstUser = msgs.find(m => m.role === 'user');
  const name = firstUser
    ? firstUser.content.slice(0, 40).replace(/\n/g, ' ').trim() || 'Degen Session'
    : 'Unnamed Degen Session';
  res.json({ name });
});

// --- API: Chat archive (store archived chat) ---
app.post('/api/chat/archive', (req, res) => {
  // Accept and acknowledge — primarily for future persistence
  res.json({ ok: true });
});

// --- API: Active chats (stub) ---
app.get('/api/chats/active', (req, res) => {
  res.json({ chats: [] });
});

// --- API: Spectator ---
app.get('/api/spectator/users', (req, res) => {
  const users = [];
  for (const [clientId, client] of spectatorClients) {
    if (!client.username) continue; // skip anonymous clients
    const online = isClientOnline(client);
    const isDev = authSvc.isDeveloper(client.username);
    users.push({
      id: clientId,
      username: client.username,
      online,
      isDev,
      lastMessages: (client.messages || []).slice(-4),
    });
  }
  // Sort: online first, then by last activity
  users.sort((a, b) => {
    if (a.online !== b.online) return b.online - a.online;
    const aClient = spectatorClients.get(a.id);
    const bClient = spectatorClients.get(b.id);
    return (bClient?.lastActivity || 0) - (aClient?.lastActivity || 0);
  });
  res.json({ users });
});

app.get('/api/spectator/conversation/:id', (req, res) => {
  const client = spectatorClients.get(req.params.id);
  if (!client) {
    return res.json({ conversation: { messages: [] } });
  }
  res.json({ conversation: { messages: client.messages || [] } });
});

app.get('/api/spectator/grok-status', (req, res) => {
  // Placeholder — no automated grok conversations yet
  res.json({ pendingResponses: 0, nextResponseAt: null });
});

// Fork a spectator conversation — summarize via xAI, never copy verbatim
app.post('/api/spectator/fork', async (req, res) => {
  const { clientId } = req.body || {};
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  const client = spectatorClients.get(clientId);
  const messages = client?.messages || [];
  const username = client?.username || 'some degen';

  if (messages.length === 0) {
    return res.json({
      summary: 'not much happening... just dead air',
      username,
    });
  }

  if (!xaiApiKey) {
    return res.json({
      summary: 'couldn\'t peek at that convo right now... xAI is being difficult',
      username,
    });
  }

  try {
    const convoText = messages
      .map(m => `${m.role === 'wankr' || m.role === 'assistant' ? 'Wankr' : username}: ${m.content}`)
      .join('\n');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation in 2-3 sentences. Never quote verbatim. Capture the topic and vibe only.',
          },
          { role: 'user', content: convoText },
        ],
      }),
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'some wild shit I couldn\'t quite parse';

    res.json({ summary, username });
  } catch (err) {
    console.error('Spectator fork error:', err);
    res.json({
      summary: 'tried to summarize but something broke... typical',
      username,
    });
  }
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

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    const index = path.join(FRONTEND_DIST, 'index.html');
    if (fs.existsSync(index)) return res.sendFile(index);
    res.status(404).send('Frontend not built. Run: cd frontend-v2 && npm run build');
  });

  app.listen(PORT, () => {
    console.log(`🚀 Wankr API on http://127.0.0.1:${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
