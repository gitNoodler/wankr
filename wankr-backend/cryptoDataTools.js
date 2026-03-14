/**
 * cryptoDataTools.js — Grok x_search powered intel + free on-chain APIs.
 * All X data flows through Grok as the sentiment/analysis engine.
 */

const handleStore = require('./handleStore');

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

// ── xAI Batch API: submit launch poll as batch request ──────────────────
const BATCH_ID = 'batch_e82402db-0c72-4e0d-916e-5460f751bdaa';

function buildLaunchMessages(options = {}) {
  const { sinceDate, knownNames } = options;
  const sinceClause = sinceDate
    ? `\nIMPORTANT: Only return launches posted AFTER ${sinceDate}. Skip anything older.`
    : '';
  const knownClause = knownNames && knownNames.length > 0
    ? `\nSkip these tokens we already know about: ${knownNames.slice(0, 30).join(', ')}.`
    : '';

  return [
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
  ];
}

async function submitBatchLaunchPoll(xaiApiKey, options = {}) {
  if (!xaiApiKey) return { submitted: false, error: 'No API key' };

  const requestId = `launch_poll_${Date.now()}`;
  const messages = buildLaunchMessages(options);

  try {
    const res = await fetch(`https://api.x.ai/v1/batches/${BATCH_ID}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        batch_requests: [{
          batch_request_id: requestId,
          batch_request: {
            chat_get_completion: {
              model: 'grok-4-1-fast-non-reasoning',
              messages,
              tools: [{ type: 'x_search' }],
              max_tokens: 2500,
              temperature: 0.1,
            }
          }
        }]
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Batch submit error:', data);
      return { submitted: false, error: data.error || res.statusText };
    }
    console.log(`📦 Batch request submitted: ${requestId}`);
    return { submitted: true, requestId };
  } catch (err) {
    console.error('submitBatchLaunchPoll error:', err.message);
    return { submitted: false, error: err.message };
  }
}

async function collectBatchResults(xaiApiKey, options = {}) {
  if (!xaiApiKey) return { source: 'none', launches: [] };
  const { skipSentiment } = options;

  try {
    // Check batch status
    const statusRes = await fetch(`https://api.x.ai/v1/batches/${BATCH_ID}`, {
      headers: { 'Authorization': `Bearer ${xaiApiKey}` },
    });
    const status = await statusRes.json();
    const pending = status.state?.num_pending || 0;
    const succeeded = status.state?.num_success || 0;
    if (pending > 0) {
      console.log(`📦 Batch: ${succeeded} done, ${pending} pending`);
    }

    // Fetch completed results
    const resultsRes = await fetch(`https://api.x.ai/v1/batches/${BATCH_ID}/results?page_size=100`, {
      headers: { 'Authorization': `Bearer ${xaiApiKey}` },
    });
    const resultsData = await resultsRes.json();

    const allLaunches = [];
    const processedIds = [];
    for (const result of (resultsData.succeeded || [])) {
      // Only process launch_poll results
      if (!result.batch_request_id?.startsWith('launch_poll_')) continue;
      processedIds.push(result.batch_request_id);

      const content = result.result?.choices?.[0]?.message?.content || '';
      const parsed = parseGrokJSON(content);
      if (!parsed?.launches) continue;

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
      };});
      allLaunches.push(...launches);
    }

    if (processedIds.length > 0) {
      console.log(`📦 Collected ${allLaunches.length} launches from ${processedIds.length} batch results`);
    }
    return { source: processedIds.length > 0 ? 'batch' : 'none', launches: allLaunches, processedIds };
  } catch (err) {
    console.error('collectBatchResults error:', err.message);
    return { source: 'error', launches: [], error: err.message };
  }
}

module.exports = {
  fetchHandleIntel,
  fetchBankrLaunches,
  fetchContractSecurity,
  fetchTokenInfo,
  submitBatchLaunchPoll,
  collectBatchResults,
  BATCH_ID,
};
