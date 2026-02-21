// kolAnalysisService.js — KOL database + scoring engine (WANKR_SPEC.md Phase 1)
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'crypto_x_accounts.xlsx');
const CACHE_FILE = path.join(ROOT, 'storage', 'kol_cache.json');

// Bot level icon system (WANKR_SPEC.md Section 4)
const BOT_LEVELS = [
  { maxDrop: 30, level: 1, icon: '\u{1F916}', label: 'Low Bot' },
  { maxDrop: 55, level: 2, icon: '\u{1F916}\u{1F916}', label: 'Medium Bot' },
  { maxDrop: 89, level: 3, icon: '\u{1F916}\u{1F916}\u{1F916}', label: 'High Bot' },
  { maxDrop: 100, level: 5, icon: '\u{1F916}\u{1F916}\u{1F916}\u{1F916}\u{1F916}', label: 'MAXIMUM BOT' },
];

// Rating → category mapping
const RATING_MAP = {
  '\u2705': { category: 'Legit', sentiment: 7, botLevel: 1 },
  '\u{1F937}\u200D\u2642\uFE0F': { category: 'Meh', sentiment: 5, botLevel: 2 },
  '\u{1F6A9}': { category: 'Flag', sentiment: 3, botLevel: 4 },
};

// Fallback for unknown ratings
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

function getBotLevelInfo(engagementDrop) {
  for (const entry of BOT_LEVELS) {
    if (engagementDrop <= entry.maxDrop) return entry;
  }
  return BOT_LEVELS[BOT_LEVELS.length - 1];
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

function loadFromXlsx() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.warn('KOL xlsx not found at', XLSX_PATH);
    return [];
  }
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws);

  return raw.map((row) => {
    const handle = (row['X Account'] || '').trim();
    if (!handle || handle === 'Column') return null;

    const followers = row['Followers'] || '';
    const rating = row['Rating'] || '';
    const category = row['Category'] || '';
    const notes = row['Notes'] || '';

    const ratingInfo = RATING_MAP[rating] || DEFAULT_RATING;
    const sentiment = ratingInfo.sentiment;
    const botLevel = ratingInfo.botLevel;
    const replyQualityRatio = 1.0; // Phase 1 default until reply data is available
    const score = calculateScore(sentiment, botLevel, replyQualityRatio);
    const roastPriority = calculateRoastPriority(sentiment, botLevel);
    const verdictInfo = getVerdict(score);

    return {
      handle,
      followers,
      followerCount: parseFollowerCount(followers),
      rating,
      category: category || ratingInfo.category,
      notes,
      sentiment,
      botLevel,
      botIcon: getBotLevelInfo(botLevel * 20).icon,
      replyQualityRatio,
      score,
      roastPriority,
      verdictIcon: verdictInfo.icon,
      verdict: verdictInfo.verdict,
    };
  }).filter(Boolean);
}

function getAccounts(forceReload) {
  if (!cachedAccounts || forceReload) {
    cachedAccounts = loadFromXlsx();
    // Persist to cache for fast subsequent loads
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedAccounts, null, 2), 'utf8');
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
