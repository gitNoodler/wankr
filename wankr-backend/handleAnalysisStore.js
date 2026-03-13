/**
 * handleAnalysisStore.js — Delegates to unified handleStore.js.
 * Keeps the same API so existing callers don't break.
 */

const handleStore = require('./handleStore');

// Pattern to detect X handles in text
const HANDLE_PATTERN = /@([A-Za-z0-9_]{2,15})/g;

const HANDLE_BLACKLIST = new Set([
  'the', 'and', 'for', 'you', 'all', 'can', 'has', 'its', 'may', 'new',
  'now', 'old', 'see', 'way', 'who', 'did', 'get', 'let', 'say', 'she',
  'too', 'use', 'bot', 'dev', 'nft', 'eth', 'btc', 'sol',
]);

function extractHandles(text) {
  if (!text) return [];
  const matches = [];
  let match;
  while ((match = HANDLE_PATTERN.exec(text)) !== null) {
    const handle = match[1].toLowerCase();
    if (!HANDLE_BLACKLIST.has(handle) && handle.length >= 3) {
      matches.push(match[1]);
    }
  }
  HANDLE_PATTERN.lastIndex = 0;
  return [...new Set(matches)];
}

function detectAnalyzedHandles(userMessage, wankrResponse) {
  const userHandles = extractHandles(userMessage);
  if (userHandles.length === 0) return [];
  const responseLower = (wankrResponse || '').toLowerCase();
  return userHandles.filter(h => {
    return responseLower.includes(h.toLowerCase()) && wankrResponse.length > 200;
  });
}

function processExchange(userMessage, wankrResponse, history, username) {
  const handles = detectAnalyzedHandles(userMessage, wankrResponse);
  if (handles.length === 0) return;

  const timestamp = new Date().toISOString();

  for (const handle of handles) {
    const handleLower = handle.toLowerCase();
    const relevantHistory = (history || [])
      .filter(m => (m.content || '').toLowerCase().includes(handleLower))
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    const analysisData = {
      handle: `@${handle}`,
      analyzedAt: timestamp,
      analyzedBy: username || 'anonymous',
      userQuery: userMessage,
      wankrAnalysis: wankrResponse,
      conversationContext: relevantHistory,
      metadata: {
        responseLength: wankrResponse.length,
        historyDepth: (history || []).length,
      },
    };

    // Write to unified Xhandles store
    handleStore.storeAnalysis(handle, analysisData);
  }
}

module.exports = {
  processExchange,
  getLatestAnalysis: handleStore.getLatestAnalysis,
  getAnalysisHistory: handleStore.getAnalysisHistory,
  listAnalyzedHandles: () => handleStore.listHandles().map(h => h.handle),
  extractHandles,
  detectAnalyzedHandles,
  ANALYSES_DIR: handleStore.XHANDLES_DIR,
};
