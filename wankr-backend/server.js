// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
// Direct Infisical API (SDK v1.2.11 auth is broken)

const authSvc = require('./authService');
const archiveSvc = require('./archiveService');
const learningIndex = require('./learningIndex');
const realtimeAnnotation = require('./realtimeAnnotation');
const handleAnalysis = require('./handleAnalysisStore');
const handleStore = require('./handleStore');
const responsePipeline = require('./responsePipeline');
const responseValidator = require('./responseValidator');
const cryptoDataTools = require('./cryptoDataTools');
const boundsGate = require('./boundsGate');
const trainingDataGen = require('./trainingDataGen');

// Ensure storage directory and required files exist (handles fresh Railway volume mount)
const STORAGE_DIR = path.join(__dirname, 'storage');
const REQUIRED_STORAGE_FILES = {
  'users.json': '[]',
  'sessions.json': '{}',
  'wallet_addresses.json': '{}',
  'username_registry.json': '[]',
  'nonces.json': '{}'
};

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
for (const [file, defaultContent] of Object.entries(REQUIRED_STORAGE_FILES)) {
  const filePath = path.join(STORAGE_DIR, file);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, defaultContent);
}

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

// Load full persona from file, fall back to inline if missing
const PERSONA_FILE = path.join(__dirname, 'wankr_persona.txt');
let DEFAULT_SYSTEM;
try {
  DEFAULT_SYSTEM = fs.readFileSync(PERSONA_FILE, 'utf-8').trim();
  console.log(`\u2705 Persona loaded from wankr_persona.txt (${DEFAULT_SYSTEM.length} chars)`);
} catch {
  DEFAULT_SYSTEM = `You are Wankr, an arrogant, foul-mouthed, zero-filter crypto vigilante AI. Expose rugs, pumps, and degen plays. Stay surgical — focus on targets, not yourself. Edgy analogies, crypto slang, sailor mouth. Never reference your own origin or mission unless directly asked.`;
  console.warn('\u26A0\uFE0F  wankr_persona.txt not found, using fallback prompt');
}

let xaiApiKey = null;         // legacy fallback
let xaiKeyChat = null;        // grok-4-1-fast-reasoning — main chat
let xaiKeyPipeline = null;    // grok-4-1-fast-non-reasoning — validator, SUS, live search
let xaiKeyTraining = null;    // both models — training gen, grok bot
let xDevConBearerToken = null; // X API Bearer Token for Filtered Stream
const MODEL = process.env.WANKR_MODEL || 'grok-4-1-fast-reasoning';
const MODEL_FAST = 'grok-4-1-fast-non-reasoning';

async function initInfisical() {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  const env = process.env.INFISICAL_ENVIRONMENT || 'dev';
  if (!clientId || !clientSecret || !projectId) return;

  try {
    // Authenticate via direct API (SDK v1.2.11 auth is broken)
    const authRes = await fetch('https://app.infisical.com/api/v1/auth/universal-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const authData = await authRes.json();
    if (!authData.accessToken) {
      console.warn('Infisical auth failed:', JSON.stringify(authData));
      return;
    }
    const token = authData.accessToken;

    // Fetch all secrets in one call
    const secretsRes = await fetch(
      `https://app.infisical.com/api/v3/secrets/raw?workspaceId=${projectId}&environment=${env}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const secretsData = await secretsRes.json();
    const secrets = {};
    for (const s of (secretsData.secrets || [])) {
      secrets[s.secretKey] = s.secretValue;
    }

    // Map secrets to keys
    const keyMap = [
      ['XAI_KEY_CHAT', (v) => { xaiKeyChat = v; }],
      ['XAI_KEY_PIPELINE', (v) => { xaiKeyPipeline = v; }],
      ['XAI_KEY_TRAINING', (v) => { xaiKeyTraining = v; }],
      ['XAI_API_KEY', (v) => { xaiApiKey = v; }],
      ['grokWankr', (v) => { if (!xaiApiKey) xaiApiKey = v; }],
      ['DEVCON_BEARER_TOKEN', (v) => { xDevConBearerToken = v; }],
    ];

    for (const [secretName, setter] of keyMap) {
      const val = secrets[secretName];
      if (val && val.trim()) {
        setter(val.trim());
        console.log(`✅ Loaded: ${secretName}`);
      }
    }

    // Fallback: if specific keys missing, use the general key
    if (!xaiKeyChat) xaiKeyChat = xaiApiKey;
    if (!xaiKeyPipeline) xaiKeyPipeline = xaiApiKey;
    if (!xaiKeyTraining) xaiKeyTraining = xaiApiKey;
  } catch (err) {
    console.warn('Infisical init FAILED:', err.message);
  }
}

// Load forensic stack context (injected conditionally to save tokens)
const FORENSIC_FILE = path.join(__dirname, 'wankr_forensic_stack.txt');
let FORENSIC_CONTEXT = '';
try {
  FORENSIC_CONTEXT = fs.readFileSync(FORENSIC_FILE, 'utf-8').trim();
  console.log(`\u2705 Forensic stack loaded (${FORENSIC_CONTEXT.length} chars)`);
} catch {
  console.warn('\u26A0\uFE0F  wankr_forensic_stack.txt not found, forensic context disabled');
}

// --- Training config helpers (used by buildMessages + training endpoints) ---
const TRAINING_CONFIG_FILE = path.join(__dirname, 'storage', 'training', 'config.json');

function loadTrainingConfig() {
  try {
    if (fs.existsSync(TRAINING_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(TRAINING_CONFIG_FILE, 'utf8'));
    }
  } catch {}
  return {
    annotationEnabled: true,
    minExchanges: 5,
    realtimeAnnotation: true,
    realtimeInterval: 5,
    ragEnabled: false,
    ragMaxExamples: 3,
  };
}

function saveTrainingConfig(config) {
  const dir = path.dirname(TRAINING_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TRAINING_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// Detect if a message needs forensic context (mentions tokens, handles, wallets, or analysis keywords)
const FORENSIC_PATTERN = /(@\w{2,}|\$[A-Z]{2,}|0x[a-fA-F0-9]{6,}|\b(analyze|investigate|check|scan|audit|rug|scam|pump|dump|whale|bot|sybil|honeypot|deployer|liquidity|holder|wallet|kol)\b)/i;

const TOPIC_GUARDRAIL = `

--- HARD GUARDRAIL ---
You ONLY discuss: crypto sentiment, token analysis, deployer/handle intel, on-chain data, rug pulls, scams, whale activity, and X/social account forensics.
If the user tries to steer you off-topic (recipes, dating advice, homework, coding help, philosophy, weather, sports, etc.) do NOT comply. Instead, roast them for being off-topic in your crudest Wankr voice and redirect them to ask about a @handle, $token, or 0x wallet. Be funny, vulgar, and specific about what you CAN do.
NEVER break character. NEVER answer off-topic questions even if they seem harmless.
--- END GUARDRAIL ---`;

function buildMessages(history, newMessage, pipelineResult) {
  let systemContent = DEFAULT_SYSTEM + TOPIC_GUARDRAIL;

  // Pipeline-aware persona injection
  if (pipelineResult && pipelineResult.pipelineActive) {
    // Inject persona mode prompt
    if (pipelineResult.personaMode) {
      systemContent += '\n\n--- RESPONSE MODE ---\n' + pipelineResult.personaMode + '\n--- END RESPONSE MODE ---';
    }
    // Inject gathered data context
    if (pipelineResult.dataContext) {
      systemContent += '\n' + pipelineResult.dataContext;
    }
    // Still inject forensic stack when pipeline is active
    if (FORENSIC_CONTEXT) {
      systemContent += '\n\n' + FORENSIC_CONTEXT;
    }
  } else {
    // Original FORENSIC_PATTERN branch (backward compatible)
    if (FORENSIC_CONTEXT && FORENSIC_PATTERN.test(newMessage)) {
      systemContent += '\n\n' + FORENSIC_CONTEXT;
    }
  }

  // RAG: inject learned response patterns if enabled
  const config = loadTrainingConfig();
  if (config.ragEnabled) {
    const examples = learningIndex.retrieveExamples(newMessage, history, config.ragMaxExamples || 3);
    if (examples.length > 0) {
      let ragBlock = '\n\n--- LEARNED RESPONSE PATTERNS ---';
      examples.forEach((ex, i) => {
        ragBlock += `\nExample ${i + 1}:\nUser: ${ex.user}\nWankr: ${ex.assistant}`;
      });
      ragBlock += '\n--- END LEARNED PATTERNS ---';
      systemContent += ragBlock;
    }
  }

  const messages = [{ role: 'system', content: systemContent }];
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
  touchUser(result.token);
  // Validate session to get isDev flag
  const session = authSvc.validateSession(result.token);
  res.json({ token: result.token, username: result.username, isDev: session.isDev || false });
});

app.post('/api/auth/validate', (req, res) => {
  const result = authSvc.validateSession(req.body?.token);
  if (result?.valid) touchUser(req.body.token);
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
  if (result.token) touchUser(result.token);
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

// --- Guardrail: off-topic deflection (crude Wankr humor) ---
const OFF_TOPIC_DEFLECTIONS = [
  "Whoa there, captain off-topic. I don't do bedtime stories — I do blockchain forensics. Drop me a @handle, $token, or 0x wallet and I'll actually give a shit.",
  "Cool story, but my brain literally only has two wrinkles and they're both shaped like candlestick charts. Try again with a handle or contract address, chief.",
  "Listen, I'm not your therapist, your search engine, or your girlfriend's AI boyfriend. I sniff out rugs and roast deployers. Feed me a @handle or a $ticker before I fall asleep.",
  "Wrong hole. This is Wankr — crypto sentiment, deployer dirt, and on-chain degeneracy ONLY. Throw me a @handle, $token, or wallet address and watch me work.",
  "I'm flattered you think I'm a general-purpose genius, but I'm actually a highly specialized degenerate. My talents: @handles, $tokens, 0x wallets, and calling out scams. That's the menu. Order or get out.",
  "Sir, this is a Wankr's. We serve crypto intel, deployer roasts, and sentiment checks. Whatever that was... we don't have it. Try @handle or $TOKEN.",
  "My man, I was built to expose rugs, not discuss whatever the hell that was. I need a @handle to stalk, a $token to dissect, or a 0x address to audit. Give me something to work with.",
  "I'd love to help but I literally cannot process anything that isn't crypto gossip or chain data. It's a medical condition. Symptoms include: needing a @handle, $ticker, or contract address to function.",
  "That question just bounced off my guardrails like a shitcoin off resistance. I only talk crypto sentiment, X handle intel, and deployer forensics. Reload with something I can actually chew on.",
  "Bro I'm not ChatGPT. I'm the unhinged cousin they don't invite to Thanksgiving. My whole personality is @handles, $tokens, and sniffing out rug pulls. Bring me one of those or I'm useless to you — which, fair.",
];

function getOffTopicDeflection(_msg) {
  return OFF_TOPIC_DEFLECTIONS[Math.floor(Math.random() * OFF_TOPIC_DEFLECTIONS.length)];
}

const rateLimiter = require('./rateLimiter');

// --- API: Chat ---
app.post('/api/chat', async (req, res) => {
  if (!xaiKeyChat && !xaiApiKey) {
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

  // --- Rate limit check ---
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateCheck = rateLimiter.check(ip, clientId, msg);
  if (rateCheck.blocked) {
    // Track the deflection for spectator
    if (clientId) {
      spectatorTouch(clientId, { messages: [
        ...hist.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        { role: 'user', content: msg, timestamp: new Date().toISOString() },
        { role: 'wankr', content: rateCheck.reply, timestamp: new Date().toISOString() },
      ]});
    }
    return res.status(429).json({ reply: rateCheck.reply, rateLimited: true, reason: rateCheck.reason });
  }

  try {
    // Run response pipeline (async — gathers live data from APIs, uses pipeline key)
    const pipelineResult = await responsePipeline.runPipelineAsync(msg, hist, xaiKeyPipeline || xaiApiKey);

    // --- Guardrail: off-topic deflection ---
    // If pipeline says SKIP (no crypto entities, no analysis intent), bounce them
    if (pipelineResult.classification?.state === 'SKIP') {
      const deflection = getOffTopicDeflection(msg);
      if (clientId) {
        spectatorTouch(clientId, { messages: [
          ...hist.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          { role: 'user', content: msg, timestamp: new Date().toISOString() },
          { role: 'wankr', content: deflection, timestamp: new Date().toISOString() },
        ]});
      }
      return res.json({ reply: deflection, guardrail: true });
    }

    const messages = buildMessages(hist, msg, pipelineResult);
    cryptoDataTools.trackApiCall('chat');
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiKeyChat || xaiApiKey}`
      },
      body: JSON.stringify({ model: MODEL, messages })
    });

    const data = await response.json();
    if (data.error) {
      const code = data.error?.code === 'invalid_api_key' ? 401 : 500;
      return res.status(code).json({ error: data.error?.message || 'xAI error' });
    }
    const rawReply = data.choices?.[0]?.message?.content || '';

    // Apply bounds gate (hard filter in analysis modes)
    const gateResult = boundsGate.applyBoundsGate(rawReply, pipelineResult.classification, pipelineResult.entities);
    const reply = gateResult.cleanedReply;
    if (gateResult.removedCount > 0) {
      console.log(`BoundsGate: removed ${gateResult.removedCount} sentences from ${pipelineResult.classification.state} response`);
    }

    // Track conversation for spectator
    if (clientId) {
      const fullMessages = [
        ...hist.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        { role: 'user', content: msg, timestamp: new Date().toISOString() },
        { role: 'wankr', content: reply, timestamp: new Date().toISOString() },
      ];
      spectatorTouch(clientId, { messages: fullMessages });
    }

    const responsePayload = { reply };
    if (pipelineResult.pipelineActive) {
      responsePayload.pipeline = {
        state: pipelineResult.metadata.state,
        reason: pipelineResult.metadata.reason,
        entitiesFound: pipelineResult.metadata.entitiesFound,
      };
    }
    res.json(responsePayload);

    // Pipeline validator: sample 20% of pipeline responses to save API cost
    if (pipelineResult.pipelineActive && Math.random() < 0.2) {
      setImmediate(() => {
        responseValidator.validateResponse(pipelineResult, msg, reply, xaiKeyPipeline || xaiApiKey).catch(err => {
          console.error('Pipeline validator fire error:', err.message);
        });
      });
    }

    // Realtime annotation: fire async after response if due
    const rtConfig = loadTrainingConfig();
    if (rtConfig.realtimeAnnotation && clientId) {
      const fullHist = [
        ...hist,
        { role: 'user', content: msg },
        { role: 'assistant', content: reply },
      ];
      if (realtimeAnnotation.isDueForAnnotation(clientId, fullHist, rtConfig.realtimeInterval || 5)) {
        // Resolve username from token if present
        let rtUsername = 'anonymous';
        const token = req.body?.token;
        if (token) {
          const session = authSvc.validateSession(token);
          if (session?.valid) rtUsername = session.username;
        }
        setImmediate(() => {
          realtimeAnnotation.annotateRealtime(clientId, fullHist, xaiKeyPipeline || xaiApiKey, rtUsername).catch(err => {
            console.error('Realtime annotation fire error:', err.message);
          });
        });
      }
    }

    // Handle analysis storage + Xhandles profile data
    setImmediate(() => {
      let haUsername = 'anonymous';
      const haToken = req.body?.token;
      if (haToken) {
        const session = authSvc.validateSession(haToken);
        if (session?.valid) haUsername = session.username;
      }
      handleAnalysis.processExchange(msg, reply, hist, haUsername);

      // Store social data gathered by pipeline into Xhandles
      if (pipelineResult?.pipelineActive && pipelineResult.data) {
        for (const [h, profile] of Object.entries(pipelineResult.data.socialProfiles || {})) {
          if (profile) handleStore.storeProfile(h, profile);
        }
      }
    });
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

// --- DevMaster routes (extracted to devmasterRoutes.js) ---
const devmasterRoutes = require('./devmasterRoutes');

// --- API: Chat sync-training (heartbeat / presence) ---
app.post('/api/chat/sync-training', (req, res) => {
  const { clientId, trainingMode, token, messages } = req.body || {};
  if (!clientId) return res.json({ ok: false });

  // Resolve username from session token if provided
  let username = null;
  if (token) {
    const session = authSvc.validateSession(token);
    if (session?.valid) { username = session.username; touchUser(token); }
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

  // Fallback: truncated first user message
  const firstUser = msgs.find(m => m.role === 'user');
  const fallbackName = firstUser
    ? firstUser.content.slice(0, 40).replace(/\n/g, ' ').trim() || 'Degen Session'
    : 'Unnamed Degen Session';

  const nameKey = xaiKeyPipeline || xaiApiKey;
  if (!nameKey || msgs.length < 2) {
    return res.json({ name: fallbackName });
  }

  try {
    // Condense conversation for naming (first + last few messages)
    const condensed = msgs.slice(0, 4).concat(msgs.length > 4 ? msgs.slice(-2) : []);
    const convoText = condensed
      .map(m => `${(m.role || '').toLowerCase() === 'user' ? 'U' : 'W'}: ${(m.content || '').slice(0, 100)}`)
      .join('\n');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nameKey}`,
      },
      body: JSON.stringify({
        model: MODEL_FAST,
        messages: [
          {
            role: 'system',
            content: 'Generate a punchy 3-6 word chat title for this Wankr AI conversation. No quotes, no punctuation, just the title. Be creative and edgy like the Wankr brand.',
          },
          { role: 'user', content: convoText },
        ],
        max_tokens: 20,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const generatedName = (data.choices?.[0]?.message?.content || '').trim();
    res.json({ name: generatedName || fallbackName });
  } catch (err) {
    console.error('Generate name error:', err.message);
    res.json({ name: fallbackName });
  }
});

// --- API: Chat archive (store archived chat) ---
app.post('/api/chat/archive', (req, res) => {
  const { chat, token } = req.body || {};
  if (!chat) return res.json({ ok: true, discarded: true });

  // Resolve username from auth token
  let username = 'anonymous';
  if (token) {
    const session = authSvc.validateSession(token);
    if (session?.valid) username = session.username;
  }

  // Fire-and-forget: annotate + save training pairs asynchronously
  setImmediate(() => {
    archiveSvc.processChat(chat, false, username, xaiKeyPipeline || xaiApiKey).catch(err => {
      console.error('Archive processing error:', err.message);
    });
  });

  res.json({ ok: true });
});

// --- API: Training stats, sources, config ---

app.get('/api/training/stats', (req, res) => {
  try {
    const convDir = archiveSvc.FOLDERS.trainingConversations;
    const overDir = archiveSvc.FOLDERS.trainingOverrides;
    const extDir = archiveSvc.FOLDERS.trainingExternal;

    let totalFiles = 0;
    let totalPairs = 0;

    // Count conversation files + pairs
    if (fs.existsSync(convDir)) {
      const files = fs.readdirSync(convDir).filter(f => f.endsWith('.json.gz'));
      totalFiles += files.length;
      for (const f of files) {
        try {
          const compressed = fs.readFileSync(path.join(convDir, f));
          const data = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
          totalPairs += (data.trainingPairs || []).length;
        } catch {}
      }
    }

    // Count overrides
    let overrideFiles = 0;
    if (fs.existsSync(overDir)) {
      overrideFiles = fs.readdirSync(overDir).filter(f => f.endsWith('.json') || f.endsWith('.json.gz')).length;
    }

    // Count external
    let externalFiles = 0;
    if (fs.existsSync(extDir)) {
      externalFiles = fs.readdirSync(extDir).filter(f => f.endsWith('.json') || f.endsWith('.json.gz')).length;
    }

    // Count insights + aggregate accuracy scores
    const insightsDir = path.join(__dirname, 'storage', 'training', 'insights');
    let insightFiles = 0;
    const scores = { persona: [], sentiment: [], technical: [] };
    if (fs.existsSync(insightsDir)) {
      const iFiles = fs.readdirSync(insightsDir).filter(f => f.endsWith('.json'));
      insightFiles = iFiles.length;
      // Aggregate scores from last 50 insights (most recent)
      const recent = iFiles.sort().slice(-50);
      for (const f of recent) {
        try {
          const insight = JSON.parse(fs.readFileSync(path.join(insightsDir, f), 'utf8'));
          const s = insight.insight || {};
          if (typeof s.personaScore === 'number' && s.personaScore >= 0) scores.persona.push(s.personaScore);
          if (typeof s.sentimentScore === 'number' && s.sentimentScore >= 0) scores.sentiment.push(s.sentimentScore);
          if (typeof s.technicalScore === 'number' && s.technicalScore >= 0) scores.technical.push(s.technicalScore);
        } catch {}
      }
    }

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const config = loadTrainingConfig();

    res.json({
      conversationFiles: totalFiles,
      totalPairs,
      overrideFiles,
      externalFiles,
      insightFiles,
      fineTuneReady: totalPairs >= 200,
      accuracy: {
        persona: { avg: avg(scores.persona), samples: scores.persona.length },
        sentiment: { avg: avg(scores.sentiment), samples: scores.sentiment.length },
        technical: { avg: avg(scores.technical), samples: scores.technical.length },
      },
      config,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/training/sources', (req, res) => {
  try {
    const convDir = archiveSvc.FOLDERS.trainingConversations;
    const sources = [];

    if (fs.existsSync(convDir)) {
      const files = fs.readdirSync(convDir).filter(f => f.endsWith('.json.gz'));
      for (const f of files) {
        try {
          const compressed = fs.readFileSync(path.join(convDir, f));
          const data = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
          sources.push({
            file: f,
            username: data.username || 'anonymous',
            pairCount: (data.trainingPairs || []).length,
            timestamp: data.timestamp || null,
          });
        } catch {}
      }
    }

    sources.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/training/config', (req, res) => {
  res.json(loadTrainingConfig());
});

app.post('/api/training/config', (req, res) => {
  const current = loadTrainingConfig();
  const updates = req.body || {};
  const allowed = ['annotationEnabled', 'minExchanges', 'realtimeAnnotation', 'realtimeInterval', 'ragEnabled', 'ragMaxExamples'];
  for (const key of allowed) {
    if (updates[key] !== undefined) current[key] = updates[key];
  }
  saveTrainingConfig(current);
  res.json(current);
});

// --- API: Training export (JSONL for fine-tuning) ---
app.get('/api/training/export', (req, res) => {
  try {
    const jsonl = archiveSvc.exportFineTuneJSONL(DEFAULT_SYSTEM);
    if (!jsonl) {
      return res.status(404).json({ error: 'No training pairs found' });
    }
    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="wankr-finetune-${Date.now()}.jsonl"`);
    res.send(jsonl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API: Handle analysis storage ---
app.get('/api/handles', (req, res) => {
  const handles = handleAnalysis.listAnalyzedHandles();
  const result = handles.map(h => {
    const latest = handleAnalysis.getLatestAnalysis(h);
    const history = handleAnalysis.getAnalysisHistory(h);
    return {
      handle: `@${h}`,
      analysisCount: history.length,
      lastAnalyzed: latest?.analyzedAt || null,
    };
  });
  res.json({ handles: result });
});

app.get('/api/handles/:handle', (req, res) => {
  const handle = req.params.handle.replace(/^@/, '');
  const latest = handleAnalysis.getLatestAnalysis(handle);
  if (!latest) return res.status(404).json({ error: 'No analysis found for this handle' });
  const history = handleAnalysis.getAnalysisHistory(handle);
  res.json({ latest, analysisCount: history.length, files: history });
});

app.get('/api/handles/:handle/history', (req, res) => {
  const handle = req.params.handle.replace(/^@/, '');
  const files = handleAnalysis.getAnalysisHistory(handle);
  const handleDir = path.join(handleAnalysis.ANALYSES_DIR, handle.replace(/[^A-Za-z0-9_]/g, '').substring(0, 15));
  const analyses = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(handleDir, f), 'utf8'));
      analyses.push(data);
    } catch {}
  }
  res.json({ handle: `@${handle}`, analyses });
});

// --- API: Pipeline stats ---
app.get('/api/pipeline/stats', (req, res) => {
  const stats = responseValidator.getValidationStats();
  res.json(stats);
});

// --- API: Xhandles (unified handle storage) ---
app.get('/api/xhandles', (req, res) => {
  res.json({ handles: handleStore.listHandles() });
});

app.get('/api/xhandles/:handle', (req, res) => {
  const dossier = handleStore.getHandleDossier(req.params.handle);
  if (!dossier) return res.status(404).json({ error: 'Handle not found' });
  res.json(dossier);
});

// --- API: SUS probe (Grok-powered handle intel) ---
app.post('/api/sus', async (req, res) => {
  if (!xaiKeyPipeline && !xaiKeyChat && !xaiApiKey) {
    return res.status(503).json({ error: 'xAI not configured' });
  }

  const handle = (req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) {
    return res.status(400).json({ error: 'handle is required' });
  }

  try {
    // Single Grok call: profile + posts + sentiment
    const intel = await cryptoDataTools.fetchHandleIntel(handle, xaiKeyPipeline || xaiApiKey);

    // Build context for Wankr persona report
    const contextParts = [`Analyze @${handle} based on this Grok intel:`];
    if (intel.profile) {
      contextParts.push(`Profile: ${intel.profile.displayName || handle} | Bio: "${intel.profile.bio}" | Verified: ${intel.profile.verified} | Account age: ${intel.profile.accountAge}`);
    }
    if (intel.posts?.length) {
      contextParts.push(`${intel.posts.length} recent posts found. Overall reply sentiment: ${intel.overallSentiment}.`);
      contextParts.push(`Sentiment breakdown: positive=${intel.sentimentBreakdown.positive}, negative=${intel.sentimentBreakdown.negative}, mixed=${intel.sentimentBreakdown.mixed}, neutral=${intel.sentimentBreakdown.neutral}`);
      intel.posts.slice(0, 5).forEach((p, i) => {
        contextParts.push(`Post ${i + 1}: "${p.text}" [${p.likes} likes, ${p.retweets} rt, ${p.replies} replies — replies: ${p.replySentiment}${p.sentimentNote ? ', ' + p.sentimentNote : ''}]`);
      });
    }
    if (intel.assessment) contextParts.push(`Grok assessment: ${intel.assessment}`);

    // Check KOL database
    const kolAnalysisService = require('./kolAnalysisService');
    const kolData = kolAnalysisService.analyzeAccount(handle) || null;
    if (kolData) {
      contextParts.push(`KOL DB: Score=${kolData.score}, Bot=${kolData.botLevel}/5, Sentiment=${kolData.sentiment}/10, Roast=${kolData.roastPriority}/10`);
    }

    const dataContext = '\n--- PROBE DATA ---\n' + contextParts.join('\n') + '\n--- END PROBE DATA ---';

    // Wankr persona generates the report
    const messages = [
      { role: 'system', content: DEFAULT_SYSTEM + dataContext },
      { role: 'user', content: `Give me your full take on @${handle}. Reference the probe data — posts, sentiment, profile. Be specific.` },
    ];
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiKeyChat || xaiApiKey}` },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || '';

    // Store probe
    handleStore.storeSUSProbe(handle, { intel, kolData, report });

    res.json({
      handle: `@${handle}`,
      intel,
      kolData,
      report,
    });
  } catch (err) {
    console.error('SUS error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// --- Launch pipeline (extracted to launchPipeline.js) ---
const launchPipeline = require('./launchPipeline');
const xStreamListener = require('./xStreamListener');


// touchUser shorthand for call sites in this file
function touchUser(token) { launchPipeline.touchUser(token); }

// --- API: Training data generation ---
app.get('/api/training/generate', async (req, res) => {
  if (!xaiKeyTraining && !xaiApiKey) {
    return res.status(503).json({ error: 'xAI not configured' });
  }
  const count = Math.min(parseInt(req.query.count || '10', 10), 50);
  res.json({ status: 'started', count, message: `Generating ${count} training pairs in background.` });

  setImmediate(async () => {
    try {
      const result = await trainingDataGen.generateTrainingBatch(count, xaiKeyTraining || xaiApiKey, DEFAULT_SYSTEM);
      console.log(`Training gen complete: ${result.generated} pairs, ${result.flagged} flagged, file: ${result.file}`);
    } catch (err) {
      console.error('Training gen error:', err.message);
    }
  });
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

  const forkKey = xaiKeyPipeline || xaiApiKey;
  if (!forkKey) {
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
        'Authorization': `Bearer ${forkKey}`,
      },
      body: JSON.stringify({
        model: MODEL_FAST,
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
    xaiKeyChat = xaiKeyChat || xaiApiKey;
    xaiKeyPipeline = xaiKeyPipeline || xaiApiKey;
    xaiKeyTraining = xaiKeyTraining || xaiApiKey;
    console.log('✅ xAI key from env');
  } else {
    await initInfisical();
  }

  const chatKey = xaiKeyChat || xaiApiKey;
  if (!chatKey) {
    console.warn('⚠️ No xAI keys. Set XAI_API_KEY in .env or configure Infisical.');
  } else {
    console.log(`✅ Keys: chat=${xaiKeyChat ? 'yes' : 'fallback'} pipeline=${xaiKeyPipeline ? 'yes' : 'fallback'} training=${xaiKeyTraining ? 'yes' : 'fallback'}`);
  }

  // Initialize extracted modules (after keys are loaded)
  launchPipeline.init(app, {
    getXaiKeyPipeline: () => xaiKeyPipeline,
    getXaiApiKey: () => xaiApiKey,
    cryptoDataTools,
    responsePipeline,
    handleStore,
  });
  devmasterRoutes.init(app, {
    ROOT, PORT, spectatorClients, isClientOnline,
    getXaiKeyChat: () => xaiKeyChat,
    getXaiApiKey: () => xaiApiKey,
    launchPipeline,
    responseValidator,
    cryptoDataTools,
    authSvc,
    xStreamListener,
  });

  // X Filtered Stream — free real-time bankr launch detection
  xStreamListener.init({
    getBearerToken: () => xDevConBearerToken,
    onLaunchDetected: launchPipeline.ingestLaunches,
  });

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
