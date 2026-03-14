/**
 * responsePipeline.js — Classifier + persona mode selection for the Wankr response pipeline.
 *
 * Agent 1 (Classifier): rule-based, synchronous, FREE.
 * Extracts entities, gathers data, classifies into one of five states,
 * and returns the appropriate persona mode prompt + formatted data context.
 */

const kolAnalysisService = require('./kolAnalysisService');
const handleAnalysisStore = require('./handleAnalysisStore');
const mockDataTools = require('./mockDataTools');
const cryptoDataTools = require('./cryptoDataTools');

// ── Bankr launch cache lookup (injected from server.js) ────────────────
let _getLaunchCache = null;
function setLaunchCacheProvider(fn) { _getLaunchCache = fn; }

function matchLaunchByName(message) {
  if (!_getLaunchCache) return [];
  const launches = _getLaunchCache();
  if (!launches || launches.length === 0) return [];
  const msgLower = message.toLowerCase();
  return launches.filter(l => {
    const name = (l.tokenName || '').toLowerCase().trim();
    const symbol = (l.tokenSymbol || '').toLowerCase().trim();
    if (!name || name === 'unknown') return false;
    return msgLower.includes(name) || (symbol && symbol !== '???' && msgLower.includes(symbol));
  });
}

// ── Classification states ──────────────────────────────────────────────
const STATES = {
  FULL_CLEAN: 'FULL_CLEAN',
  FULL_RED_FLAGS: 'FULL_RED_FLAGS',
  PARTIAL: 'PARTIAL',
  NO_DATA: 'NO_DATA',
  SKIP: 'SKIP',
};

// ── Persona mode prompts ───────────────────────────────────────────────
const PERSONA_MODES = {
  [STATES.FULL_CLEAN]:
    'Present ALL data points. Separate on-chain facts from social observations. ' +
    'Maintain skeptical undertone — clean doesn\'t mean safe. End with caveat. ' +
    'Voice: dry reluctant respect. Example opener style: "Checked it. Clean as a fresh deploy. Here\'s the receipts..."',

  [STATES.FULL_RED_FLAGS]:
    'Lead with worst red flag. SHOW receipts — numbers, dates, wallet patterns. ' +
    'Use Belfort voice for scam mechanics. Label [FACTS] vs [INFERENCE]. Skepticism Doctrine applies. ' +
    'Voice: maximum Wankr, crude zingers. Example opener style: "Oh, this stinks like a honeypot after launch..."',

  [STATES.PARTIAL]:
    'Separate FOUND from MISSING. Explain why the gap matters. ' +
    'Label [VERIFIED], [UNVERIFIED], [MISSING]. Don\'t fill gaps with speculation. ' +
    'Voice: raised eyebrow, measured. Example opener style: "Got half the pic. Here\'s what\'s solid, here\'s the hole..."',

  [STATES.NO_DATA]:
    'Be SPECIFIC about what you need — handle, wallet address, contract address, or token name. ' +
    'Keep it short. End with actionable prompt. ' +
    'Voice: impatient push. Example opener style: "I don\'t vibe-check thin air. Need a handle, wallet, contract..."',
};

// ── Analysis intent keywords ───────────────────────────────────────────
const ANALYSIS_KEYWORDS = /\b(analyze|investigate|check|scan|audit|rug|scam|pump|dump|whale|bot|sybil|honeypot|deployer|liquidity|holder|wallet|kol|legit|safe|trust|sketch|shady|suspicious|fraud|fake)\b/i;

// ── Entity extraction ──────────────────────────────────────────────────
function extractEntities(message) {
  const entities = { handles: [], tokens: [], wallets: [], hasAnalysisIntent: false };

  // @handles
  const handleMatches = message.match(/@(\w{2,15})/g);
  if (handleMatches) {
    entities.handles = [...new Set(handleMatches.map(h => h.replace(/^@/, '').toLowerCase()))];
  }

  // $tokens
  const tokenMatches = message.match(/\$([A-Za-z]{2,10})/g);
  if (tokenMatches) {
    entities.tokens = [...new Set(tokenMatches.map(t => t.replace(/^\$/, '').toUpperCase()))];
  }

  // 0x wallets
  const walletMatches = message.match(/0x[a-fA-F0-9]{6,42}/g);
  if (walletMatches) {
    entities.wallets = [...new Set(walletMatches)];
  }

  // Analysis intent
  entities.hasAnalysisIntent = ANALYSIS_KEYWORDS.test(message);

  return entities;
}

// ── Data gathering ─────────────────────────────────────────────────────
function gatherData(entities) {
  const data = {
    kolResults: {},      // handle → kolData or null
    pastAnalyses: {},    // handle → analysis or null
    mockProfiles: {},    // handle → mock profile
    mockTimelines: {},   // handle → mock timeline
    hasKolHit: false,
    hasPastAnalysis: false,
    hasMockData: false,
  };

  for (const handle of entities.handles) {
    // KOL database
    const kolData = kolAnalysisService.analyzeAccount(handle);
    data.kolResults[handle] = kolData;
    if (kolData) data.hasKolHit = true;

    // Past analysis store
    const pastAnalysis = handleAnalysisStore.getLatestAnalysis(handle);
    data.pastAnalyses[handle] = pastAnalysis;
    if (pastAnalysis) data.hasPastAnalysis = true;

    // Mock data (always gather as fallback)
    data.mockProfiles[handle] = mockDataTools.mockTweetProfile(handle);
    data.mockTimelines[handle] = mockDataTools.mockTweetTimeline(handle);
    data.hasMockData = true;
  }

  return data;
}

// ── Async data gathering (uses real APIs when xaiApiKey available) ─────
async function gatherDataAsync(entities, xaiApiKey) {
  const data = {
    kolResults: {},
    pastAnalyses: {},
    socialProfiles: {},
    contractSecurity: {},
    tokenInfo: {},
    hasKolHit: false,
    hasPastAnalysis: false,
    hasLiveData: false,
    hasMockData: false,
  };

  // KOL + past analysis (synchronous, local)
  for (const handle of entities.handles) {
    const kolData = kolAnalysisService.analyzeAccount(handle);
    data.kolResults[handle] = kolData;
    if (kolData) data.hasKolHit = true;

    const pastAnalysis = handleAnalysisStore.getLatestAnalysis(handle);
    data.pastAnalyses[handle] = pastAnalysis;
    if (pastAnalysis) data.hasPastAnalysis = true;
  }

  // Social data via Grok (async, parallel per handle)
  const socialPromises = entities.handles.map(async (handle) => {
    const intel = await cryptoDataTools.fetchHandleIntel(handle, xaiApiKey);
    data.socialProfiles[handle] = intel;
    if (intel.source === 'live') data.hasLiveData = true;
  });

  // On-chain data (async, parallel per wallet)
  const chainPromises = entities.wallets.map(async (wallet) => {
    const [security, token] = await Promise.all([
      cryptoDataTools.fetchContractSecurity(wallet),
      cryptoDataTools.fetchTokenInfo(wallet),
    ]);
    data.contractSecurity[wallet] = security;
    data.tokenInfo[wallet] = token;
    if (security.source === 'live' || token.source === 'live') data.hasLiveData = true;
  });

  await Promise.all([...socialPromises, ...chainPromises]);
  return data;
}

// ── Classification ─────────────────────────────────────────────────────
function classify(entities, data) {
  const hasLaunchMatch = (data.launchMatches || []).length > 0;
  const hasEntities = entities.handles.length > 0 || entities.tokens.length > 0 || entities.wallets.length > 0 || hasLaunchMatch;

  // No entities and no analysis intent → SKIP
  if (!hasEntities && !entities.hasAnalysisIntent) {
    return { state: STATES.SKIP, reason: 'No entities or analysis intent detected' };
  }

  // Entities but analysis intent only (e.g. "is this safe?") with no handles/tokens/wallets
  if (!hasEntities && entities.hasAnalysisIntent) {
    return { state: STATES.NO_DATA, reason: 'Analysis intent detected but no specific entities provided' };
  }

  // Check for KOL database hits
  if (data.hasKolHit) {
    // Check for red flags across all KOL results
    for (const handle of entities.handles) {
      const kol = data.kolResults[handle];
      if (!kol) continue;
      if (kol.botLevel >= 3 || kol.sentiment <= 4 || kol.roastPriority >= 7) {
        return {
          state: STATES.FULL_RED_FLAGS,
          reason: `KOL data found with red flags (botLevel=${kol.botLevel}, sentiment=${kol.sentiment}, roastPriority=${kol.roastPriority})`,
          flaggedHandle: handle,
        };
      }
    }
    return { state: STATES.FULL_CLEAN, reason: 'KOL database hit, no red flags detected' };
  }

  // Past analysis, live data, or mock data but no KOL scoring
  if (data.hasPastAnalysis || data.hasLiveData || data.hasMockData) {
    const reason = data.hasPastAnalysis ? 'Past analysis found but no KOL scoring'
      : data.hasLiveData ? 'Live X data found but no KOL scoring'
      : 'Mock data only, no KOL scoring';
    return { state: STATES.PARTIAL, reason };
  }

  // Entities present but nothing found
  return { state: STATES.NO_DATA, reason: 'Entities found but no data available from any source' };
}

// ── Data context formatting ────────────────────────────────────────────
function buildDataContext(classification, data, entities) {
  if (classification.state === STATES.SKIP || classification.state === STATES.NO_DATA) {
    return '';
  }

  const blocks = [];

  for (const handle of entities.handles) {
    // KOL data
    const kol = data.kolResults[handle];
    if (kol) {
      blocks.push(
        `[KOL DATABASE — VERIFIED] @${handle}`,
        `  Score: ${kol.score} | Sentiment: ${kol.sentiment}/10 | Bot Level: ${kol.botLevel}/5`,
        `  Roast Priority: ${kol.roastPriority}/10 | Verdict: ${kol.verdict?.verdict || kol.verdict || 'N/A'}`,
        `  Category: ${kol.category || 'N/A'}`,
        ''
      );
    }

    // Past analysis
    const past = data.pastAnalyses[handle];
    if (past) {
      blocks.push(
        `[PAST ANALYSIS — may be stale] @${handle}`,
        `  Analyzed: ${past.analyzedAt || 'unknown'} by ${past.analyzedBy || 'unknown'}`,
        `  Query: ${past.userQuery || 'N/A'}`,
        `  Summary: ${(past.wankrAnalysis || '').substring(0, 300)}${(past.wankrAnalysis || '').length > 300 ? '...' : ''}`,
        ''
      );
    }

    // Social intel (from Grok or mock)
    const intel = data.socialProfiles?.[handle] || data.mockProfiles?.[handle];
    if (intel && !kol) {
      const tag = intel.source === 'live' ? 'LIVE' : 'mock/unverified';
      const bio = intel.profile?.bio || intel.bio || '';
      const verified = intel.profile?.verified ?? intel.verified ?? false;
      const age = intel.profile?.accountAge || intel.createdAt || 'unknown';
      blocks.push(
        `[SOCIAL PROFILE — ${tag}] @${handle}`,
        `  Bio: ${bio}`,
        `  Verified: ${verified} | Account Age: ${age}`,
        ''
      );
      if (intel.assessment) {
        blocks.push(`[GROK ASSESSMENT] ${intel.assessment}`, '');
      }
      if (intel.posts?.length) {
        blocks.push(`[RECENT POSTS — ${intel.posts.length} posts, overall sentiment: ${intel.overallSentiment}]`);
        intel.posts.slice(0, 5).forEach((p, i) => {
          blocks.push(`  ${i + 1}. "${p.text}" [${p.likes} likes, replies: ${p.replySentiment}]`);
        });
        blocks.push('');
      }
    }
  }

  // On-chain data for wallets
  for (const wallet of entities.wallets) {
    const security = data.contractSecurity?.[wallet];
    if (security && security.source === 'live') {
      blocks.push(
        `[CONTRACT SECURITY — GoPlus LIVE] ${wallet}`,
        `  Token: ${security.tokenName} (${security.tokenSymbol})`,
        `  Honeypot: ${security.isHoneypot} | Mintable: ${security.mintable} | Proxy: ${security.hasProxy}`,
        `  Buy Tax: ${security.buyTax}% | Sell Tax: ${security.sellTax}%`,
        `  Holders: ${security.holderCount} | LP Holders: ${security.lpHolderCount}`,
        ''
      );
    }

    const token = data.tokenInfo?.[wallet];
    if (token && token.source === 'live') {
      blocks.push(
        `[TOKEN DATA — DexScreener LIVE] ${wallet}`,
        `  ${token.tokenName} (${token.tokenSymbol}) | Price: $${token.priceUsd}`,
        `  24h Change: ${token.priceChange24h}% | 24h Volume: $${token.volume24h}`,
        `  Liquidity: $${token.liquidity} | FDV: $${token.fdv}`,
        `  Pairs: ${token.pairCount} | Chain: ${token.chainId} | DEX: ${token.dexId}`,
        ''
      );
    }

  }

  // Bankr launch feed matches
  const launches = data.launchMatches || [];
  if (launches.length > 0) {
    blocks.push('[BANKR LAUNCH FEED — from X via Grok]');
    for (const l of launches) {
      blocks.push(
        `  Token: ${l.tokenName} ($${l.tokenSymbol})`,
        `  Contract: ${l.contractAddress || 'unknown'}`,
        `  Requested by: ${l.requestedBy || 'unknown'}`,
        `  Community: ${l.communityReaction || 'neutral'} — ${l.reactionNote || ''}`,
        `  Bot Score: ${l.botScore ?? 'N/A'} | Bot Flag: ${l.botFlag || 'none'}`,
        `  First seen: ${l.firstSeen || l.timestamp || 'unknown'}`,
        ''
      );
    }
  }

  return blocks.length > 0 ? '\n--- PIPELINE DATA CONTEXT ---\n' + blocks.join('\n') + '--- END PIPELINE DATA ---' : '';
}

// ── Pipeline orchestrator ──────────────────────────────────────────────
function runPipeline(message, history) {
  const entities = extractEntities(message);
  const data = gatherData(entities);
  const classification = classify(entities, data);

  const pipelineActive = classification.state !== STATES.SKIP;
  const personaMode = PERSONA_MODES[classification.state] || null;
  const dataContext = buildDataContext(classification, data, entities);

  return {
    classification,
    personaMode,
    dataContext,
    pipelineActive,
    entities,
    metadata: {
      state: classification.state,
      reason: classification.reason,
      entitiesFound: {
        handles: entities.handles,
        tokens: entities.tokens,
        wallets: entities.wallets,
      },
      dataSources: {
        kolHit: data.hasKolHit,
        pastAnalysis: data.hasPastAnalysis,
        mockData: data.hasMockData,
      },
    },
  };
}

// ── Async pipeline orchestrator ────────────────────────────────────────
async function runPipelineAsync(message, history, xaiApiKey) {
  const entities = extractEntities(message);
  // Match token names/symbols from bankr launch cache
  const launchMatches = matchLaunchByName(message);
  if (launchMatches.length > 0) {
    entities.launchMatches = launchMatches;
    // Pull contract addresses into wallets for on-chain lookup
    for (const l of launchMatches) {
      if (l.contractAddress && !entities.wallets.includes(l.contractAddress)) {
        entities.wallets.push(l.contractAddress);
      }
    }
  }
  const data = await gatherDataAsync(entities, xaiApiKey);
  data.launchMatches = launchMatches;
  const classification = classify(entities, data);

  const pipelineActive = classification.state !== STATES.SKIP;
  const personaMode = PERSONA_MODES[classification.state] || null;
  const dataContext = buildDataContext(classification, data, entities);

  return {
    classification,
    personaMode,
    dataContext,
    pipelineActive,
    entities,
    data,
    metadata: {
      state: classification.state,
      reason: classification.reason,
      entitiesFound: {
        handles: entities.handles,
        tokens: entities.tokens,
        wallets: entities.wallets,
      },
      dataSources: {
        kolHit: data.hasKolHit,
        pastAnalysis: data.hasPastAnalysis,
        liveData: data.hasLiveData,
        mockData: data.hasMockData,
      },
    },
  };
}

module.exports = {
  extractEntities,
  gatherData,
  gatherDataAsync,
  classify,
  buildDataContext,
  runPipeline,
  runPipelineAsync,
  setLaunchCacheProvider,
  STATES,
  PERSONA_MODES,
};
