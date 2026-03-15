/**
 * cryptoDataTools.js — Grok x_search powered intel + free on-chain APIs.
 * All X data flows through Grok as the sentiment/analysis engine.
 */

const fs = require('fs');
const path = require('path');
const handleStore = require('./handleStore');

// ── xAI API call tracking ───────────────────────────────────────────────
const STORAGE_ROOT = require('./storagePath');
const API_USAGE_FILE = path.join(STORAGE_ROOT, 'pipeline', 'api_usage.json');
const COST_PER_TYPE = { detection: 0.005, sentiment: 0.005, sentimentBatch: 0.0025, chat: 0.003, handleIntel: 0.005 };

const DEFAULT_CALLS = { detection: 0, sentiment: 0, sentimentBatch: 0, chat: 0, handleIntel: 0 };

let apiUsage = {
  date: new Date().toISOString().slice(0, 10),
  calls: { ...DEFAULT_CALLS },
  totalCalls: 0,
  startedAt: Date.now(),
};

// Load persisted usage on startup
try {
  if (fs.existsSync(API_USAGE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(API_USAGE_FILE, 'utf8'));
    if (saved.date === apiUsage.date) {
      apiUsage = saved;
    }
  }
} catch {}

function trackApiCall(type) {
  // Reset daily at midnight
  const today = new Date().toISOString().slice(0, 10);
  if (apiUsage.date !== today) {
    apiUsage = { date: today, calls: { ...DEFAULT_CALLS }, totalCalls: 0, startedAt: Date.now() };
  }
  apiUsage.calls[type] = (apiUsage.calls[type] || 0) + 1;
  apiUsage.totalCalls++;
  // Persist (fire-and-forget)
  try { fs.writeFileSync(API_USAGE_FILE, JSON.stringify(apiUsage, null, 2)); } catch {}
}

function getApiUsage() {
  const today = new Date().toISOString().slice(0, 10);
  if (apiUsage.date !== today) {
    apiUsage = { date: today, calls: { ...DEFAULT_CALLS }, totalCalls: 0, startedAt: Date.now() };
  }
  // Per-type cost breakdown sorted by cost descending
  const perType = Object.entries(apiUsage.calls)
    .map(([type, count]) => ({
      type,
      count,
      costPerCall: COST_PER_TYPE[type] || 0,
      totalCost: count * (COST_PER_TYPE[type] || 0),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
  const totalCost = perType.reduce((sum, t) => sum + t.totalCost, 0);
  // Burn rate: cost per hour based on tracking window
  const hoursElapsed = Math.max((Date.now() - (apiUsage.startedAt || Date.now())) / 3600000, 0.01);
  const burnPerHour = totalCost / hoursElapsed;
  const projectedDaily = burnPerHour * 24;
  return {
    ...apiUsage,
    perType,
    estimatedCost: Math.round(totalCost * 10000) / 10000,
    burnPerHour: Math.round(burnPerHour * 10000) / 10000,
    projectedDaily: Math.round(projectedDaily * 10000) / 10000,
    hoursTracked: Math.round(hoursElapsed * 100) / 100,
    costBreakdown: COST_PER_TYPE,
  };
}

// ── Helper: extract text from Responses API output ──────────────────────
function extractResponseText(data) {
  for (const item of (data.output || [])) {
    if (item.type === 'message') {
      const text = item.content?.[0]?.text;
      if (text) return text;
    }
  }
  return '';
}

function parseGrokJSON(content) {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ── Grok x_search: full handle intel (profile + posts + sentiment) ─────
async function fetchHandleIntel(handle, xaiApiKey) {
  const h = handle.replace(/^@/, '').toLowerCase();
  if (!xaiApiKey) return { source: 'none', handle: h, error: 'No API key' };

  try {
    trackApiCall('handleIntel');
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        input: [
          {
            role: 'system',
            content: `Search X for @${h}. Find their profile and their last 10 ORIGINAL posts (not replies to others). For each post, read the replies/comments and judge the sentiment. Return ONLY valid JSON:
{
  "profile": {
    "displayName": "string",
    "bio": "string",
    "verified": boolean,
    "accountAge": "e.g. '2 years' or 'unknown'",
    "location": "string or empty"
  },
  "posts": [
    {
      "text": "post text truncated to 180 chars",
      "likes": number,
      "retweets": number,
      "replies": number,
      "replySentiment": "positive" | "negative" | "mixed" | "neutral",
      "sentimentNote": "1 sentence why"
    }
  ],
  "overallSentiment": "positive" | "negative" | "mixed" | "neutral",
  "assessment": "2-3 sentence overall read on this account"
}
If you cannot find this account return {"notFound": true}.`
          },
          {
            role: 'user',
            content: `Search X for @${h}. Get their profile info, find their last 10 original posts (skip replies), and analyze the sentiment in the comments/replies on each post.`
          },
        ],
        tools: [{ type: 'x_search' }],
        max_output_tokens: 3000,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    const content = extractResponseText(data);
    const parsed = parseGrokJSON(content);
    if (!parsed || parsed.notFound) return { source: 'none', handle: h, notFound: true };

    // Clean posts — drop replies that slipped through and short junk
    const posts = (parsed.posts || [])
      .filter(p => {
        const text = (p.text || '').trim();
        if (/^@\w/.test(text)) return false;
        if (text.length < 10) return false;
        return true;
      })
      .slice(0, 10)
      .map(p => ({
        text: (p.text || '').slice(0, 180),
        likes: p.likes || 0,
        retweets: p.retweets || 0,
        replies: p.replies || 0,
        replySentiment: ['positive', 'negative', 'mixed', 'neutral'].includes(p.replySentiment) ? p.replySentiment : 'neutral',
        sentimentNote: p.sentimentNote || '',
      }));

    // Compute sentiment breakdown
    const counts = { positive: 0, negative: 0, mixed: 0, neutral: 0 };
    posts.forEach(p => counts[p.replySentiment]++);

    const result = {
      source: 'live',
      handle: h,
      profile: {
        displayName: parsed.profile?.displayName || '',
        bio: parsed.profile?.bio || '',
        verified: !!parsed.profile?.verified,
        accountAge: parsed.profile?.accountAge || 'unknown',
        location: parsed.profile?.location || '',
      },
      posts,
      overallSentiment: parsed.overallSentiment || 'neutral',
      sentimentBreakdown: counts,
      assessment: parsed.assessment || '',
    };

    handleStore.storeProfile(h, result.profile);
    return result;
  } catch (err) {
    console.error('fetchHandleIntel error:', err.message);
    return { source: 'error', handle: h, error: err.message };
  }
}

// ── Grok x_search: Bankr launch feed ───────────────────────────────────
async function fetchBankrLaunches(xaiApiKey, options = {}) {
  if (!xaiApiKey) return { source: 'none', launches: [] };

  const { sinceDate, knownNames } = options;
  // Build a "since" clause so Grok only searches for NEW launches
  const sinceClause = sinceDate
    ? `\nIMPORTANT: Only return launches posted AFTER ${sinceDate}. Skip anything older.`
    : '';
  // Build a "skip known" clause so Grok doesn't re-return tokens we already have
  const knownClause = knownNames && knownNames.length > 0
    ? `\nSkip these tokens we already know about: ${knownNames.slice(0, 30).join(', ')}.`
    : '';

  try {
    trackApiCall('detection');
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        input: [
          {
            role: 'system',
            content: `Search X for recent posts from or about @bankr_official activity on Base chain. This includes token launches, fee claims, airdrops, and other bankr bot interactions. Classify each result by its action type. For token launches, identify who REQUESTED the token creation (the @handle that replied to or tagged @bankrbot asking to deploy).${sinceClause}${knownClause} Return ONLY valid JSON:
{
  "launches": [
    {
      "actionType": "launch" | "fee_claim" | "airdrop" | "other",
      "tokenName": "string — the token name if this is a launch, otherwise a short label like 'Fee Claim' or 'Airdrop'",
      "tokenSymbol": "string — ticker if launch, otherwise empty",
      "contractAddress": "0x... or empty if not mentioned",
      "announcement": "brief description of what happened",
      "requestedBy": "@handle who initiated the action, or empty if unknown",
      "communityReaction": "positive" | "negative" | "mixed" | "neutral",
      "reactionNote": "1 sentence summary of community sentiment",
      "timestamp": "ISO date or approximate like '2 days ago'",
      "postAuthor": "@handle who posted about it"
    }
  ]
}
Return up to 15 most recent items. If nothing found return {"launches": []}.`
          },
          {
            role: 'user',
            content: sinceDate
              ? `Search X for all @bankr_official or Bankr bot activity on Base posted AFTER ${sinceDate}. Include token launches, fee claims, airdrops, and other interactions. Classify each by action type (launch, fee_claim, airdrop, other). For launches, find who requested the token creation. Include community reaction and sentiment from the replies.`
              : `Search X for the most recent @bankr_official or Bankr bot activity on Base. Include token launches, fee claims, airdrops, and other interactions. Classify each by action type (launch, fee_claim, airdrop, other). For launches, find who requested the token creation. Include community reaction and sentiment from the replies.`
          },
        ],
        tools: [{ type: 'x_search' }],
        max_output_tokens: 2500,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    const content = extractResponseText(data);
    const parsed = parseGrokJSON(content);
    if (!parsed) return { source: 'none', launches: [] };

    const VALID_ACTIONS = ['launch', 'fee_claim', 'airdrop', 'other'];
    const launches = (parsed.launches || []).slice(0, 15).map(l => {
      const actionType = VALID_ACTIONS.includes(l.actionType) ? l.actionType : 'launch';
      return {
        actionType,
        tokenName: actionType === 'launch' ? (l.tokenName || 'Unknown') : (l.tokenName || ''),
        tokenSymbol: actionType === 'launch' ? (l.tokenSymbol || '???') : (l.tokenSymbol || ''),
        contractAddress: l.contractAddress || '',
        announcement: l.announcement || '',
        requestedBy: l.requestedBy || '',
        communityReaction: ['positive', 'negative', 'mixed', 'neutral'].includes(l.communityReaction) ? l.communityReaction : 'neutral',
        reactionNote: l.reactionNote || '',
        timestamp: l.timestamp || '',
        postAuthor: l.postAuthor || '',
      };
    });

    return { source: 'live', launches };
  } catch (err) {
    console.error('fetchBankrLaunches error:', err.message);
    return { source: 'error', launches: [], error: err.message };
  }
}

// ── GoPlus Security — contract scan (FREE, no key) ────────────────────
async function fetchContractSecurity(address, chain = '8453') {
  try {
    const res = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chain}?contract_addresses=${address}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await res.json();
    const info = data.result?.[address.toLowerCase()];
    if (!info) return { source: 'goplus', address, found: false };
    return {
      source: 'live',
      provider: 'goplus',
      address,
      chain,
      isHoneypot: info.is_honeypot === '1',
      mintable: info.is_mintable === '1',
      hasProxy: info.is_proxy === '1',
      buyTax: parseFloat(info.buy_tax || '0'),
      sellTax: parseFloat(info.sell_tax || '0'),
      holderCount: parseInt(info.holder_count || '0', 10),
      tokenName: info.token_name || '',
      tokenSymbol: info.token_symbol || '',
    };
  } catch (err) {
    console.error('fetchContractSecurity error:', err.message);
    return { source: 'error', address, error: err.message };
  }
}

// ── DexScreener — token/LP data (FREE, no key) ────────────────────────
async function fetchTokenInfo(address) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await res.json();
    const pairs = data.pairs || [];
    if (pairs.length === 0) return { source: 'dexscreener', address, found: false };
    const top = pairs[0];
    return {
      source: 'live',
      provider: 'dexscreener',
      address,
      tokenName: top.baseToken?.name || '',
      tokenSymbol: top.baseToken?.symbol || '',
      priceUsd: top.priceUsd || '0',
      priceChange24h: top.priceChange?.h24 || 0,
      volume24h: top.volume?.h24 || 0,
      liquidity: top.liquidity?.usd || 0,
      fdv: top.fdv || 0,
      pairCreatedAt: top.pairCreatedAt || null,
      url: top.url || '',
    };
  } catch (err) {
    console.error('fetchTokenInfo error:', err.message);
    return { source: 'error', address, error: err.message };
  }
}

// ── Free xAI detection: fast 1s poll, NO x_search (free tier) ───────────
async function detectBankrLaunches(xaiApiKey, options = {}) {
  if (!xaiApiKey) return { source: 'none', launches: [] };

  const { knownNames } = options;
  const knownClause = knownNames && knownNames.length > 0
    ? `\nSkip these tokens we already know about: ${knownNames.slice(0, 30).join(', ')}.`
    : '';

  try {
    trackApiCall('detection');
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        tools: [{ type: 'x_search' }],
        input: [
          {
            role: 'system',
            content: `Search X for the most recent @bankr_official or Bankr bot activity on Base chain. This includes token launches, fee claims, airdrops, and other bankr bot interactions. For token launches, identify who REQUESTED the token creation. Do NOT analyze sentiment or community reaction — just extract the raw data.${knownClause} Return ONLY valid JSON:
{
  "launches": [
    {
      "actionType": "launch" | "fee_claim" | "airdrop" | "other",
      "tokenName": "string — token name for launches AND fee claims (the token fees were claimed from), short label for other types",
      "tokenSymbol": "string — ticker if launch, otherwise empty",
      "contractAddress": "0x... or empty",
      "announcement": "brief description of what happened",
      "requestedBy": "@handle who initiated, or empty",
      "chain": "base",
      "timestamp": "ISO date or approximate like '2 hours ago'",
      "postAuthor": "@handle who posted"
    }
  ]
}
Return up to 15 most recent. If nothing found return {"launches": []}.`
          },
          {
            role: 'user',
            content: `Search X for the latest @bankr_official or Bankr bot activity on Base. List token launches, fee claims, airdrops, other interactions. Just the raw data — token name, symbol, contract, who requested it, action type. No sentiment analysis needed.`
          },
        ],
        max_output_tokens: 2000,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    const content = extractResponseText(data);
    const parsed = parseGrokJSON(content);
    if (!parsed) return { source: 'none', launches: [] };

    const VALID_ACTIONS = ['launch', 'fee_claim', 'airdrop', 'other'];
    const launches = (parsed.launches || []).slice(0, 15).map(l => {
      const actionType = VALID_ACTIONS.includes(l.actionType) ? l.actionType : 'launch';
      return {
        actionType,
        tokenName: actionType === 'launch' ? (l.tokenName || 'Unknown') : (l.tokenName || ''),
        tokenSymbol: actionType === 'launch' ? (l.tokenSymbol || '???') : (l.tokenSymbol || ''),
        contractAddress: l.contractAddress || '',
        announcement: l.announcement || '',
        requestedBy: l.requestedBy || '',
        chain: l.chain || 'base',
        timestamp: l.timestamp || '',
        postAuthor: l.postAuthor || '',
        sentimentStatus: 'pending',
        communityReaction: 'neutral',
        reactionNote: '',
      };
    });

    return { source: 'live', launches };
  } catch (err) {
    console.error('detectBankrLaunches error:', err.message);
    return { source: 'error', launches: [], error: err.message };
  }
}

// ── Batched sentiment: single x_search call for N tokens ────────────────
async function batchSentiment(tokens, xaiApiKey) {
  if (!xaiApiKey || !tokens.length) return {};

  // Build a compact list: "1. $TOKEN (0x1234...) 2. $TOKEN2 ..."
  const tokenList = tokens.map((t, i) => {
    const label = t.tokenSymbol ? `$${t.tokenSymbol}` : t.tokenName;
    const addr = t.contractAddress ? ` (${t.contractAddress})` : '';
    const handle = t.requestedBy ? ` by ${t.requestedBy}` : '';
    return `${i + 1}. ${label}${addr}${handle}`;
  }).join('\n');

  try {
    trackApiCall('sentiment');
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        input: [
          {
            role: 'system',
            content: `Search X for community sentiment on each of these Bankr token launches/activities. For each, check the replies and community reaction. Return ONLY valid JSON:
{
  "results": [
    {
      "index": 1,
      "communityReaction": "positive" | "negative" | "mixed" | "neutral",
      "reactionNote": "1 sentence summary of community sentiment"
    }
  ]
}
If you can't find sentiment for an item, return "neutral" with note "No community data found".`
          },
          {
            role: 'user',
            content: `Search X for community sentiment on these recent Bankr launches/activities:\n${tokenList}\n\nFor each one, analyze the replies and reactions. What's the community saying?`
          },
        ],
        tools: [{ type: 'x_search' }],
        max_output_tokens: 2000,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    const content = extractResponseText(data);
    const parsed = parseGrokJSON(content);
    if (!parsed?.results) return {};

    // Map results back by index
    const sentimentMap = {};
    for (const r of parsed.results) {
      const idx = (r.index || 0) - 1; // 1-indexed → 0-indexed
      if (idx >= 0 && idx < tokens.length) {
        const key = tokens[idx].contractAddress?.toLowerCase() || (tokens[idx].tokenName || '').toLowerCase().trim();
        sentimentMap[key] = {
          communityReaction: ['positive', 'negative', 'mixed', 'neutral'].includes(r.communityReaction) ? r.communityReaction : 'neutral',
          reactionNote: r.reactionNote || '',
        };
      }
    }
    console.log(`🎯 Batch sentiment: ${Object.keys(sentimentMap).length}/${tokens.length} results`);
    return sentimentMap;
  } catch (err) {
    console.error('batchSentiment error:', err.message);
    return {};
  }
}

// ── Batch API: submit sentiment as async batch (half price) ─────────────

// Build the sentiment prompt for a set of tokens (shared between sync and batch)
function buildSentimentPrompt(tokens) {
  const tokenList = tokens.map((t, i) => {
    const label = t.tokenSymbol ? `$${t.tokenSymbol}` : t.tokenName;
    const addr = t.contractAddress ? ` (${t.contractAddress})` : '';
    const handle = t.requestedBy ? ` by ${t.requestedBy}` : '';
    return `${i + 1}. ${label}${addr}${handle}`;
  }).join('\n');
  return {
    system: `Search X for community sentiment on each of these Bankr token launches/activities. For each, check the replies and community reaction. Return ONLY valid JSON:
{
  "results": [
    {
      "index": 1,
      "communityReaction": "positive" | "negative" | "mixed" | "neutral",
      "reactionNote": "1 sentence summary of community sentiment"
    }
  ]
}
If you can't find sentiment for an item, return "neutral" with note "No community data found".`,
    user: `Search X for community sentiment on these recent Bankr launches/activities:\n${tokenList}\n\nFor each one, analyze the replies and reactions. What's the community saying?`,
  };
}

async function createSentimentBatch(tokens, xaiApiKey) {
  if (!xaiApiKey || !tokens.length) return null;

  try {
    // Step 1: Create batch
    const createRes = await fetch('https://api.x.ai/v1/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({ name: `sentiment_${Date.now()}` }),
    });
    const batch = await createRes.json();
    const batchId = batch.id || batch.batch_id;
    if (!batchId) {
      console.error('Batch API: no batch_id returned', JSON.stringify(batch));
      return null;
    }

    // Step 2: Add sentiment request to batch
    const prompt = buildSentimentPrompt(tokens);
    const addRes = await fetch(`https://api.x.ai/v1/batches/${batchId}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        batch_requests: [{
          batch_request_id: `sentiment_${Date.now()}`,
          batch_request: {
            chat_get_completion: {
              model: 'grok-4-1-fast-non-reasoning',
              messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
              ],
              max_tokens: 2000,
              temperature: 0.1,
            },
          },
        }],
      }),
    });
    const addData = await addRes.json();
    if (addData.error) {
      console.error('Batch API: add request error', JSON.stringify(addData.error));
      return null;
    }

    trackApiCall('sentimentBatch');
    console.log(`📦 Created sentiment batch ${batchId} for ${tokens.length} tokens`);
    return batchId;
  } catch (err) {
    console.error('createSentimentBatch error:', err.message);
    return null;
  }
}

async function pollBatchStatus(batchId, xaiApiKey) {
  try {
    const res = await fetch(`https://api.x.ai/v1/batches/${batchId}`, {
      headers: { 'Authorization': `Bearer ${xaiApiKey}` },
    });
    const data = await res.json();
    return {
      id: batchId,
      state: data.state || data.status || 'unknown',
      numPending: data.num_pending ?? null,
      numSuccess: data.num_success ?? null,
      numError: data.num_error ?? null,
      done: (data.num_pending === 0) || data.state === 'completed' || data.state === 'ended',
    };
  } catch (err) {
    console.error(`pollBatchStatus error for ${batchId}:`, err.message);
    return { id: batchId, state: 'error', done: false };
  }
}

async function fetchBatchResults(batchId, xaiApiKey) {
  try {
    const res = await fetch(`https://api.x.ai/v1/batches/${batchId}/results`, {
      headers: { 'Authorization': `Bearer ${xaiApiKey}` },
    });
    const data = await res.json();
    // Results come as array of response objects
    const results = data.results || data.batch_results || [];
    for (const r of results) {
      const content = r.response?.content || r.result?.content ||
        r.response?.choices?.[0]?.message?.content ||
        r.result?.choices?.[0]?.message?.content || '';
      if (content) {
        const parsed = parseGrokJSON(content);
        if (parsed?.results) return parsed;
      }
    }
    return null;
  } catch (err) {
    console.error(`fetchBatchResults error for ${batchId}:`, err.message);
    return null;
  }
}

module.exports = {
  fetchHandleIntel,
  fetchBankrLaunches,
  detectBankrLaunches,
  batchSentiment,
  createSentimentBatch,
  pollBatchStatus,
  fetchBatchResults,
  fetchContractSecurity,
  fetchTokenInfo,
  getApiUsage,
  trackApiCall,
};
