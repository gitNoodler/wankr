/**
 * handleStore.js — Unified per-handle storage.
 *
 * storage/Xhandles/{handle}/
 *   ├── meta.json              (first seen, last seen, query count, sources)
 *   ├── profile.json           (latest social profile)
 *   ├── analyses/              (timestamped Wankr chat analyses)
 *   │   ├── latest.json
 *   │   └── {timestamp}.json
 *   ├── sus_probes/            (timestamped SUS probe results)
 *   │   ├── latest.json
 *   │   └── {timestamp}.json
 *   └── validations/           (pipeline validations mentioning this handle)
 *       └── {timestamp}.json
 */

const fs = require('fs');
const path = require('path');

const XHANDLES_DIR = path.join(__dirname, 'storage', 'Xhandles');

// Ensure root exists
if (!fs.existsSync(XHANDLES_DIR)) {
  fs.mkdirSync(XHANDLES_DIR, { recursive: true });
}

// ── Helpers ─────────────────────────────────────────────────────────────

function sanitize(handle) {
  return handle.replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '').substring(0, 15).toLowerCase();
}

function ts() {
  return new Date().toISOString();
}

function safeTs() {
  return ts().replace(/[:.]/g, '-');
}

function ensureHandleDir(handle) {
  const h = sanitize(handle);
  const dir = path.join(XHANDLES_DIR, h);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 New X handle folder: ${h}`);
  }
  return { handle: h, dir };
}

function ensureSubDir(handleDir, sub) {
  const d = path.join(handleDir, sub);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {}
  return null;
}

// ── Meta tracking ───────────────────────────────────────────────────────

function touchMeta(handle, source) {
  const { handle: h, dir } = ensureHandleDir(handle);
  const metaPath = path.join(dir, 'meta.json');
  const existing = readJSON(metaPath) || {
    handle: h,
    firstSeen: ts(),
    lastSeen: ts(),
    queryCount: 0,
    sources: [],
  };

  existing.lastSeen = ts();
  existing.queryCount += 1;
  if (source && !existing.sources.includes(source)) {
    existing.sources.push(source);
  }

  writeJSON(metaPath, existing);
  return existing;
}

// ── Profile ─────────────────────────────────────────────────────────────

function storeProfile(handle, profileData) {
  const { dir } = ensureHandleDir(handle);
  const data = { ...profileData, storedAt: ts() };
  writeJSON(path.join(dir, 'profile.json'), data);
  touchMeta(handle, profileData.source === 'live' ? 'live_profile' : 'mock_profile');
}

function getProfile(handle) {
  const h = sanitize(handle);
  return readJSON(path.join(XHANDLES_DIR, h, 'profile.json'));
}

// ── Analyses (from chat pipeline) ───────────────────────────────────────

function storeAnalysis(handle, analysisData) {
  const { dir } = ensureHandleDir(handle);
  const subDir = ensureSubDir(dir, 'analyses');
  const stamp = safeTs();

  const data = { ...analysisData, storedAt: ts() };
  writeJSON(path.join(subDir, `${stamp}.json`), data);
  writeJSON(path.join(subDir, 'latest.json'), data);
  touchMeta(handle, 'chat_analysis');
  console.log(`📝 Analysis stored: @${sanitize(handle)}`);
}

function getLatestAnalysis(handle) {
  const h = sanitize(handle);
  return readJSON(path.join(XHANDLES_DIR, h, 'analyses', 'latest.json'));
}

function getAnalysisHistory(handle) {
  const h = sanitize(handle);
  const dir = path.join(XHANDLES_DIR, h, 'analyses');
  try {
    if (fs.existsSync(dir)) {
      return fs.readdirSync(dir)
        .filter(f => f !== 'latest.json' && f.endsWith('.json'))
        .sort().reverse();
    }
  } catch {}
  return [];
}

// ── SUS Probes ──────────────────────────────────────────────────────────

function storeSUSProbe(handle, probeData) {
  const { dir } = ensureHandleDir(handle);
  const subDir = ensureSubDir(dir, 'sus_probes');
  const stamp = safeTs();

  const data = { ...probeData, storedAt: ts() };
  writeJSON(path.join(subDir, `${stamp}.json`), data);
  writeJSON(path.join(subDir, 'latest.json'), data);
  touchMeta(handle, 'sus_probe');
  console.log(`🔍 SUS probe stored: @${sanitize(handle)}`);
}

function getLatestSUSProbe(handle) {
  const h = sanitize(handle);
  return readJSON(path.join(XHANDLES_DIR, h, 'sus_probes', 'latest.json'));
}

// ── Validations ─────────────────────────────────────────────────────────

function storeValidation(handle, validationData) {
  const { dir } = ensureHandleDir(handle);
  const subDir = ensureSubDir(dir, 'validations');
  const stamp = safeTs();

  writeJSON(path.join(subDir, `${stamp}.json`), validationData);
  touchMeta(handle, 'validation');
}

// ── Query: get everything for a handle ──────────────────────────────────

function getHandleDossier(handle) {
  const h = sanitize(handle);
  const dir = path.join(XHANDLES_DIR, h);
  if (!fs.existsSync(dir)) return null;

  return {
    handle: h,
    meta: readJSON(path.join(dir, 'meta.json')),
    profile: readJSON(path.join(dir, 'profile.json')),
    latestAnalysis: readJSON(path.join(dir, 'analyses', 'latest.json')),
    latestSUSProbe: readJSON(path.join(dir, 'sus_probes', 'latest.json')),
    analysisCount: getAnalysisHistory(h).length,
  };
}

// ── List all known handles ──────────────────────────────────────────────

function listHandles() {
  try {
    return fs.readdirSync(XHANDLES_DIR)
      .filter(f => fs.statSync(path.join(XHANDLES_DIR, f)).isDirectory())
      .map(h => {
        const meta = readJSON(path.join(XHANDLES_DIR, h, 'meta.json'));
        return {
          handle: h,
          firstSeen: meta?.firstSeen || null,
          lastSeen: meta?.lastSeen || null,
          queryCount: meta?.queryCount || 0,
          sources: meta?.sources || [],
        };
      });
  } catch {}
  return [];
}

// ── Check if handle exists ──────────────────────────────────────────────

function handleExists(handle) {
  const h = sanitize(handle);
  return fs.existsSync(path.join(XHANDLES_DIR, h));
}

module.exports = {
  XHANDLES_DIR,
  sanitize,
  ensureHandleDir,
  touchMeta,
  storeProfile,
  getProfile,
  storeAnalysis,
  getLatestAnalysis,
  getAnalysisHistory,
  storeSUSProbe,
  getLatestSUSProbe,
  storeValidation,
  getHandleDossier,
  listHandles,
  handleExists,
};
