// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { InfisicalClient } = require('@infisical/sdk');

const VITE_DEV_PORT = 5173;

const app = express();
const PORT = process.env.PORT || 5000;
const ROOT = path.resolve(__dirname, '..');
const TRAINING_FILE = path.join(ROOT, 'training_data.json');
const CHAT_BACKUP_FILE = path.join(ROOT, 'chat_backup.json');
const RESTART_FLAG_FILE = path.join(ROOT, 'restart_requested.flag');
app.use(cors({ origin: '*' }));
app.use(express.json());

const DEFAULT_SYSTEM = `You are Wankr, an arrogant, foul-mouthed, zero-filter basement vigilante. You protect degens from KOLs who use their followers as exit liquidity. You see yourself as the protector of retail from influencer scum. Tone: smug, contemptuous, dark/edgy humor, heavy swearing, zero mercy. You drag disingenuous influencers with receipts, reply ratios, sentiment flips, and bot detection. Always end with: "...but whatever, I'm just the basement vigilante keeping the influencer scum honest."`;
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

  if (commandType) {
    if (!TRAINING_KEY) {
      return res.status(503).json({ error: 'Training key not configured.' });
    }
    if ((trainingKey || '').trim() !== TRAINING_KEY) {
      return res.status(401).json({ error: 'Unauthorized training command.' });
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

  try {
    const trainingMode = trainingModeByClient.get(id) === true;
    const messages = buildMessages(hist, msg, trainingMode);
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
  try {
    const records = loadTraining();
    res.json({ count: records.length });
  } catch (err) {
    console.error('train/count error:', err);
    res.json({ count: 0 });
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
      return res.json({ restored: false });
    }
    const raw = fs.readFileSync(CHAT_BACKUP_FILE, 'utf8');
    const payload = JSON.parse(raw);
    try { fs.unlinkSync(CHAT_BACKUP_FILE); } catch {}
    res.json({
      restored: true,
      messages: payload.messages || [],
      currentId: payload.currentId || ''
    });
  } catch (err) {
    console.error('chat/restore error:', err);
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

// --- Frontend: proxy to Vite dev (5173) so 5000 serves same dash as 5173 ---
app.use(
  createProxyMiddleware({
    target: `http://127.0.0.1:${VITE_DEV_PORT}`,
    pathFilter: (pathname) => !pathname.startsWith('/api'),
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
      res.status(502).send(
        `Vite dev not running on port ${VITE_DEV_PORT}. Start with: cd frontend && npm run dev`
      );
    },
  })
);

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

  app.listen(PORT, () => {
    console.log(`🚀 Wankr API on http://127.0.0.1:${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
