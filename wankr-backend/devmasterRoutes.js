// devmasterRoutes.js — DevMaster quarantine, activity, rules, stack-status, stats
const fs = require('fs');
const path = require('path');

// Dependencies injected via init()
let ROOT, PORT, spectatorClients, isClientOnline;
let getXaiKeyChat, getXaiApiKey;
let launchPipeline, responseValidator, cryptoDataTools, authSvc;

function init(app, deps) {
  ROOT = deps.ROOT;
  PORT = deps.PORT;
  spectatorClients = deps.spectatorClients;
  isClientOnline = deps.isClientOnline;
  getXaiKeyChat = deps.getXaiKeyChat;
  getXaiApiKey = deps.getXaiApiKey;
  launchPipeline = deps.launchPipeline;
  responseValidator = deps.responseValidator;
  cryptoDataTools = deps.cryptoDataTools;
  authSvc = deps.authSvc;

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

  // --- DevMaster: Stack Status (health checks for CircuitMap) ---
  app.get('/api/devmaster/stack-status', async (req, res) => {
    const status = {};

    // Backend (always ok if we're responding)
    status.backend = { ok: true, port: PORT, uptime: process.uptime(), nodeVersion: process.version };

    // Frontend
    status.frontend = { ok: true };

    // xAI
    status.xai = { ok: !!(getXaiKeyChat() || getXaiApiKey()) };

    // Infisical
    status.infisical = {
      ok: !!(process.env.INFISICAL_CLIENT_ID && process.env.INFISICAL_CLIENT_SECRET && process.env.INFISICAL_PROJECT_ID)
    };

    // Railway
    const railwayDetected = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
    status.railway = {
      detected: railwayDetected,
      ok: railwayDetected,
      env: railwayDetected ? {
        environment: process.env.RAILWAY_ENVIRONMENT || null,
        projectId: process.env.RAILWAY_PROJECT_ID || null
      } : undefined
    };

    // Cloudflare + wankrbot.com (check if the production site is reachable)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const cfRes = await fetch('https://wankrbot.com/health', { signal: ctrl.signal });
      clearTimeout(timer);
      status.cloudflare = { ok: cfRes.status < 500, statusCode: cfRes.status };
    } catch (err) {
      status.cloudflare = { ok: false, error: err.message };
    }

    // GitHub (check if remote is configured)
    try {
      const { execSync } = require('child_process');
      const remoteUrl = execSync('git remote get-url origin', { cwd: ROOT, timeout: 3000 }).toString().trim();
      status.github = { ok: !!remoteUrl, remoteUrl };
    } catch {
      status.github = { ok: false };
    }

    // GrokBot agent (check if any active spectator sessions suggest bot activity)
    const activeUsers = [...spectatorClients.values()].filter(c => isClientOnline(c)).length;
    status.grokBot = { active: activeUsers > 0, ok: true, activeUsers };

    res.json(status);
  });

  // --- DevMaster stats (aggregated dashboard) ---
  app.get('/api/devmaster/stats', (req, res) => {
    // xAI spending
    const xai = cryptoDataTools.getApiUsage();

    // Launches
    const launchCache = launchPipeline.getLaunchCache();
    const sentimentQueue = launchPipeline.getSentimentQueue();
    const sentimentBatchStats = launchPipeline.getSentimentBatchStats();
    let pendingSentiment = 0, failedAttempts = 0;
    for (const entry of launchCache.values()) {
      if (entry.sentimentStatus === 'pending') pendingSentiment++;
      if (entry.failedAttempt) failedAttempts++;
    }
    const activeBatchList = launchPipeline.getActiveBatches();
    const launches = {
      cacheSize: launchCache.size,
      pendingSentiment,
      queueDepth: sentimentQueue.length,
      batchesFired: sentimentBatchStats.fired,
      batchesSuccess: sentimentBatchStats.success,
      batchesFail: sentimentBatchStats.fail,
      activeBatches: activeBatchList.length,
      failedAttempts,
    };

    // Handles
    const handleTracker = launchPipeline.getHandleTracker();
    const handleEntries = Object.entries(handleTracker);
    const flaggedBots = handleEntries.filter(([, d]) => d.botFlag).length;
    const topDeployers = handleEntries
      .sort(([, a], [, b]) => (b.totalLaunches || 0) - (a.totalLaunches || 0))
      .slice(0, 5)
      .map(([h, d]) => ({ handle: `@${h}`, launches: d.totalLaunches || 0, botFlag: d.botFlag || null }));
    const handles = { tracked: handleEntries.length, flaggedBots, topDeployers };

    // Users
    const activeUsersMap = launchPipeline.getActiveUsers();
    const cutoff = Date.now() - launchPipeline.ACTIVE_USER_TTL;
    let activeCount = 0;
    for (const [, ts] of activeUsersMap) { if (ts >= cutoff) activeCount++; }
    const spectatorCount = [...spectatorClients.values()].filter(c => isClientOnline(c)).length;
    const users = { active: activeCount, spectators: spectatorCount };

    // Pipeline quality
    let pipeline = null;
    try {
      pipeline = responseValidator.getValidationStats();
    } catch {}

    // System
    const mem = process.memoryUsage();
    const system = {
      uptime: Math.floor(process.uptime()),
      memoryMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      cacheEntries: launchCache.size,
    };

    res.json({ xai, launches, handles, users, pipeline, system });
  });
}

module.exports = { init };
