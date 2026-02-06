// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { InfisicalClient } = require('@infisical/sdk');

const app = express();
const PORT = process.env.PORT || 5000;
const ROOT = path.resolve(__dirname, '..');
const TRAINING_FILE = path.join(ROOT, 'training_data.json');
const CHAT_BACKUP_FILE = path.join(ROOT, 'chat_backup.json');
const RESTART_FLAG_FILE = path.join(ROOT, 'restart_requested.flag');
const FRONTEND_DIST = path.join(ROOT, 'frontend', 'dist');

app.use(cors({ origin: '*' }));
app.use(express.json());

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

// --- Static files ---
app.get('/', (req, res) => {
  const index = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(index)) {
    return res.sendFile(index);
  }
  res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
});

app.use('/assets', express.static(path.join(FRONTEND_DIST, 'assets')));
// Serve avatar.png explicitly (fallback to logo.png) so legacy/root index.html don't 404
const staticDir = path.resolve(ROOT, 'static');
app.get('/static/avatar.png', (req, res) => {
  const avatar = path.resolve(staticDir, 'avatar.png');
  const logo = path.resolve(staticDir, 'logo.png');
  if (fs.existsSync(avatar)) return res.sendFile(avatar);
  if (fs.existsSync(logo)) return res.sendFile(logo);
  res.status(404).send('Not found');
});
app.use('/static', express.static(staticDir));
app.use(express.static(FRONTEND_DIST));

app.get('/api/health', (req, res) => {
  res.json({ backend: 'node', ok: true });
});

// --- API: Chat ---
app.post('/api/chat', async (req, res) => {
  if (!xaiApiKey) {
    return res.status(503).json({
      error: 'xAI not configured. Set XAI_API_KEY in .env or Infisical (XAI_API_KEY / grokWankr).'
    });
  }

  const { message, history } = req.body || {};
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
