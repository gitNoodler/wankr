/**
 * learningIndex.js — In-memory keyword index of training pairs for RAG-lite retrieval.
 * Loads all training pairs from storage/training/conversations/*.json.gz on startup,
 * refreshes every 5 minutes. Retrieves top matches by keyword overlap.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const STORAGE_ROOT = require('./storagePath');
const CONVERSATIONS_DIR = path.join(STORAGE_ROOT, 'training', 'conversations');
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Crypto/finance terms get 2x scoring weight
const CRYPTO_TERMS = new Set([
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'token', 'wallet',
  'defi', 'dex', 'nft', 'rug', 'rugpull', 'pump', 'dump', 'whale', 'airdrop',
  'staking', 'yield', 'liquidity', 'swap', 'bridge', 'chain', 'contract',
  'deployer', 'honeypot', 'sybil', 'mev', 'bot', 'sniper', 'memecoin',
  'presale', 'launch', 'scam', 'audit', 'exploit', 'hack', 'drain',
  'holder', 'supply', 'mcap', 'volume', 'chart', 'candle', 'degen',
  'alpha', 'kol', 'influencer', 'shill', 'fud', 'hodl', 'gwei', 'gas',
]);

// Indexed training pairs: { user, assistant, keywords: Set }
let indexedPairs = [];
let lastRefresh = 0;

function extractKeywords(text) {
  if (!text) return new Set();
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s@$#]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return new Set(words);
}

function loadPairsFromDisk() {
  const pairs = [];
  if (!fs.existsSync(CONVERSATIONS_DIR)) return pairs;

  const files = fs.readdirSync(CONVERSATIONS_DIR).filter(f => f.endsWith('.json.gz'));
  for (const f of files) {
    try {
      const compressed = fs.readFileSync(path.join(CONVERSATIONS_DIR, f));
      const data = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
      for (const pair of (data.trainingPairs || [])) {
        if (pair.user && pair.assistant) {
          const keywords = extractKeywords(pair.user + ' ' + pair.assistant);
          pairs.push({ user: pair.user, assistant: pair.assistant, keywords });
        }
      }
    } catch {}
  }
  return pairs;
}

function refreshIndex() {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_INTERVAL_MS && indexedPairs.length > 0) return;
  indexedPairs = loadPairsFromDisk();
  lastRefresh = now;
  if (indexedPairs.length > 0) {
    console.log(`Learning index refreshed: ${indexedPairs.length} pairs loaded`);
  }
}

// Initial load
refreshIndex();

/**
 * Retrieve the most relevant training pairs for a given message + recent history.
 * @param {string} newMessage - The current user message
 * @param {Array} history - Recent conversation history (last few messages)
 * @param {number} maxExamples - Max pairs to return (default 3)
 * @returns {Array<{user: string, assistant: string, score: number}>}
 */
function retrieveExamples(newMessage, history = [], maxExamples = 3) {
  refreshIndex();
  if (indexedPairs.length === 0) return [];

  // Build query keywords from current message + last 4 history messages
  const contextMessages = (history || []).slice(-4).map(m => m.content || '').join(' ');
  const queryText = newMessage + ' ' + contextMessages;
  const queryKeywords = extractKeywords(queryText);

  if (queryKeywords.size === 0) return [];

  // Score each pair by keyword overlap
  const scored = [];
  for (const pair of indexedPairs) {
    let score = 0;
    for (const kw of queryKeywords) {
      if (pair.keywords.has(kw)) {
        score += CRYPTO_TERMS.has(kw) ? 2 : 1;
      }
    }
    if (score > 0) {
      scored.push({ user: pair.user, assistant: pair.assistant, score });
    }
  }

  // Sort by score descending, return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxExamples);
}

/**
 * Force a refresh of the index (e.g., after new training data is saved).
 */
function forceRefresh() {
  lastRefresh = 0;
  refreshIndex();
}

module.exports = { retrieveExamples, forceRefresh, refreshIndex };
