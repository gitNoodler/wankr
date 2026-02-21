// kolAnalysisService.js — KOL database + scoring engine (WANKR_SPEC.md Phase 1)
// Loads from CSV (primary, pre-scored) and XLSX (secondary, auto-scored), merges by handle.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data', 'wankr_kol_database.csv');
const XLSX_PATH = path.join(ROOT, 'crypto_x_accounts.xlsx');

// Bot level icon system (WANKR_SPEC.md Section 4)
const BOT_LEVELS = [
  { maxLevel: 1, icon: '\u{1F916}', label: 'Low Bot' },
  { maxLevel: 2, icon: '\u{1F916}\u{1F916}', label: 'Medium Bot' },
  { maxLevel: 3, icon: '\u{1F916}\u{1F916}\u{1F916}', label: 'High Bot' },
  { maxLevel: 5, icon: '\u{1F916}\u{1F916}\u{1F916}\u{1F916}\u{1F916}', label: 'MAXIMUM BOT' },
];

// Rating → defaults for xlsx-only accounts (no pre-scored data)
const RATING_MAP = {
  '\u2705': { category: 'Legit', sentiment: 7, botLevel: 1 },
  '\u{1F937}\u200D\u2642\uFE0F': { category: 'Meh', sentiment: 5, botLevel: 2 },
  '\u{1F6A9}': { category: 'Flag', sentiment: 3, botLevel: 4 },
};
const DEFAULT_RATING = { category: 'Unknown', sentiment: 5, botLevel: 2 };

let cachedAccounts = null;

function parseFollowerCount(str) {
  if (!str) return 0;
  const s = String(str).replace(/[+,]/g, '').trim().toLowerCase();
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  if (s.includes('m')) return num * 1_000_000;
  if (s.includes('k')) return num * 1_000;
  return num;
}

function getBotIcon(level) {
  for (const entry of BOT_LEVELS) {
    if (level <= entry.maxLevel) return entry.icon;
  }
  return BOT_LEVELS[BOT_LEVELS.length - 1].icon;
}

// WANKR_SPEC.md Section 5: Scoring formula
function calculateScore(sentiment, botLevel, replyQualityRatio) {
  const botPenalty = botLevel / 5.0;
  const adjusted = sentiment * (1 - botPenalty);
  return Math.round(adjusted * replyQualityRatio * 100) / 100;
}

// WANKR_SPEC.md Section 7: Roast priority
function calculateRoastPriority(sentiment, botLevel) {
  if (sentiment >= 7 && botLevel >= 4) return 10;
  if (sentiment >= 6 && botLevel >= 3) return 9;
  if (botLevel >= 4) return 8;
  if (sentiment >= 5 && botLevel >= 3) return 7;
  if (botLevel >= 2) return 6;
  if (botLevel >= 1 && sentiment >= 4) return 5;
  return Math.max(1, Math.min(4, botLevel + 1));
}

// WANKR_SPEC.md Section 6: Verdict
function getVerdict(score) {
  if (score <= 2.0) return { icon: '\u{1F916}\u{1F916}\u{1F916}\u{1F916}\u{1F916}', verdict: 'Maximum Bot Trap' };
  if (score <= 4.0) return { icon: '\u{1F916}\u{1F916}\u{1F916}', verdict: 'High Bot - deceptive' };
  if (score <= 6.0) return { icon: '\u{1F916}\u{1F916}', verdict: 'Medium Bot - sus' };
  if (score <= 8.0) return { icon: '\u{1F916}', verdict: 'Low Bot - mostly real' };
  return { icon: '\u{1F9D1}', verdict: 'Real Human - rare respect' };
}

// --- CSV parser (primary source: pre-scored data) ---
function loadFromCsv() {
  if (!fs.existsSync(CSV_PATH)) return [];
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const accounts = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

    const handle = row['X Handle'] || '';
    if (!handle) continue;

    const sentiment = parseInt(row['Sentiment Score'], 10) || 5;
    const organicEngagement = parseInt(row['Organic Engagement Score'], 10) || 5;
    const engagementDrop = parseInt(row['Engagement Drop %'], 10) || 50;
    const botLevel = parseInt(row['Bot Level'], 10) || 2;
    const roastPriority = parseInt(row['Wankr Roast Priority'], 10) || calculateRoastPriority(sentiment, botLevel);
    const replyQualityRatio = organicEngagement / 10.0;
    const score = calculateScore(sentiment, botLevel, replyQualityRatio);
    const verdictInfo = getVerdict(score);

    accounts.push({
      handle,
      followers: row['Followers'] || '',
      followerCount: parseFollowerCount(row['Followers']),
      rating: row['Rating'] || '',
      category: row['Chain Preference'] || '',
      notes: row['Notes'] || '',
      sentimentReason: row['Sentiment Reason'] || '',
      sentiment,
      organicEngagement,
      engagementDrop,
      botLevel,
      botIcon: row['Bot Icon'] || getBotIcon(botLevel),
      replyQualityRatio,
      score,
      roastPriority,
      verdictIcon: verdictInfo.icon,
      verdict: verdictInfo.verdict,
      source: 'csv',
    });
  }

  return accounts;
}

// --- XLSX parser (secondary source: auto-scored from basic data) ---
function loadFromXlsx() {
  if (!fs.existsSync(XLSX_PATH)) return [];
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws);

  return raw.map((row) => {
    const handle = (row['X Account'] || '').trim();
    if (!handle || handle === 'Column') return null;

    const rating = row['Rating'] || '';
    const ratingInfo = RATING_MAP[rating] || DEFAULT_RATING;
    const sentiment = ratingInfo.sentiment;
    const botLevel = ratingInfo.botLevel;
    const replyQualityRatio = 1.0;
    const score = calculateScore(sentiment, botLevel, replyQualityRatio);
    const roastPriority = calculateRoastPriority(sentiment, botLevel);
    const verdictInfo = getVerdict(score);

    return {
      handle,
      followers: row['Followers'] || '',
      followerCount: parseFollowerCount(row['Followers']),
      rating,
      category: row['Category'] || ratingInfo.category,
      notes: row['Notes'] || '',
      sentimentReason: '',
      sentiment,
      organicEngagement: 5,
      engagementDrop: 50,
      botLevel,
      botIcon: getBotIcon(botLevel),
      replyQualityRatio,
      score,
      roastPriority,
      verdictIcon: verdictInfo.icon,
      verdict: verdictInfo.verdict,
      source: 'xlsx',
    };
  }).filter(Boolean);
}

// --- Merge: CSV wins over XLSX for same handle ---
function loadAllAccounts() {
  const csvAccounts = loadFromCsv();
  const xlsxAccounts = loadFromXlsx();

  const byHandle = new Map();

  // CSV first (primary)
  for (const a of csvAccounts) {
    byHandle.set(a.handle.replace(/^@/, '').toLowerCase(), a);
  }
  // XLSX: only add if not already in CSV
  for (const a of xlsxAccounts) {
    const key = a.handle.replace(/^@/, '').toLowerCase();
    if (!byHandle.has(key)) {
      byHandle.set(key, a);
    }
  }

  return Array.from(byHandle.values());
}

function getAccounts(forceReload) {
  if (!cachedAccounts || forceReload) {
    cachedAccounts = loadAllAccounts();
    console.log(`KOL database loaded: ${cachedAccounts.length} accounts (CSV: ${cachedAccounts.filter(a => a.source === 'csv').length}, XLSX-only: ${cachedAccounts.filter(a => a.source === 'xlsx').length})`);
  }
  return cachedAccounts;
}

function analyzeAccount(handle) {
  const accounts = getAccounts();
  const normalized = handle.replace(/^@/, '').toLowerCase();
  return accounts.find(
    (a) => a.handle.replace(/^@/, '').toLowerCase() === normalized
  ) || null;
}

function getStats() {
  const accounts = getAccounts();
  const total = accounts.length;
  const byCategory = {};
  const byVerdict = {};
  let avgScore = 0;
  let avgRoast = 0;

  for (const a of accounts) {
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    byVerdict[a.verdict] = (byVerdict[a.verdict] || 0) + 1;
    avgScore += a.score;
    avgRoast += a.roastPriority;
  }

  return {
    total,
    byCategory,
    byVerdict,
    avgScore: total > 0 ? Math.round((avgScore / total) * 100) / 100 : 0,
    avgRoastPriority: total > 0 ? Math.round((avgRoast / total) * 100) / 100 : 0,
  };
}

module.exports = {
  getAccounts,
  analyzeAccount,
  getStats,
  calculateScore,
  calculateRoastPriority,
  getVerdict,
};
