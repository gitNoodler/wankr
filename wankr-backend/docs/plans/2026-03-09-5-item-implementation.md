# 5-Item Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace mock data with real crypto/social APIs, add /api/sus + webhook + bounds gate + training gen to the Wankr backend.

**Architecture:** Five new capabilities layered onto the existing pipeline. cryptoDataTools.js wraps free APIs (GoPlus, DexScreener, Basescan) and Grok live search for social data. boundsGate.js is a hard filter between Grok reply and response. All new endpoints follow existing Express patterns in server.js.

**Tech Stack:** Node.js/Express, xAI API (Grok live search), GoPlus API, DexScreener API, Basescan API.

---

### Task 1: Create `cryptoDataTools.js` — Real API Wrappers

**Files:**
- Create: `wankr-backend/cryptoDataTools.js`

**Step 1: Create the file with all five API wrapper functions**

```javascript
// wankr-backend/cryptoDataTools.js
const mockDataTools = require('./mockDataTools');

// ── Grok Live Search for social profile ────────────────────────────────
async function fetchSocialProfile(handle, xaiApiKey) {
  const h = handle.replace(/^@/, '').toLowerCase();
  if (!xaiApiKey) return mockDataTools.mockTweetProfile(h);

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'system', content: 'Extract X/Twitter profile data. Return ONLY valid JSON with these fields: followers (number), following (number), tweets (number), bio (string), verified (boolean), createdAt (string YYYY-MM-DD or "unknown"). If you cannot find the profile, return {"notFound": true}.' },
          { role: 'user', content: `Get the X/Twitter profile info for @${h}` }
        ],
        max_tokens: 250,
        temperature: 0.1,
        search_mode: 'auto',
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return mockDataTools.mockTweetProfile(h);
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.notFound) return mockDataTools.mockTweetProfile(h);
    return {
      source: 'live',
      handle: h,
      followers: parsed.followers || 0,
      following: parsed.following || 0,
      tweets: parsed.tweets || 0,
      bio: parsed.bio || '',
      verified: !!parsed.verified,
      createdAt: parsed.createdAt || 'unknown',
    };
  } catch (err) {
    console.error('fetchSocialProfile error:', err.message);
    return mockDataTools.mockTweetProfile(h);
  }
}

// ── Grok Live Search for follower/engagement analysis ──────────────────
async function fetchFollowerAnalysis(handle, xaiApiKey) {
  const h = handle.replace(/^@/, '').toLowerCase();
  if (!xaiApiKey) return mockDataTools.mockFollowerAnalysis(h);

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'system', content: 'Analyze the X/Twitter account follower quality and engagement. Return ONLY valid JSON: { "realPercentage": number 0-100, "botPercentage": number 0-100, "engagementRate": number 0-100, "notes": "brief assessment" }. Base this on observable patterns. If you cannot find the account, return {"notFound": true}.' },
          { role: 'user', content: `Analyze follower quality and engagement for @${h}` }
        ],
        max_tokens: 250,
        temperature: 0.1,
        search_mode: 'auto',
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return mockDataTools.mockFollowerAnalysis(h);
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.notFound) return mockDataTools.mockFollowerAnalysis(h);
    return {
      source: 'live',
      handle: h,
      realPercentage: parsed.realPercentage || 50,
      botPercentage: parsed.botPercentage || 50,
      engagementRate: parsed.engagementRate || 1,
      notes: parsed.notes || '',
    };
  } catch (err) {
    console.error('fetchFollowerAnalysis error:', err.message);
    return mockDataTools.mockFollowerAnalysis(h);
  }
}

// ── GoPlus Security — contract scan (FREE, no key) ────────────────────
async function fetchContractSecurity(address, chain = '8453') {
  // chain IDs: 8453=Base, 1=Ethereum, 56=BSC
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${chain}?contract_addresses=${address}`, {
      headers: { 'Accept': 'application/json' },
    });
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
      canTakeBackOwnership: info.can_take_back_ownership === '1',
      ownerChangeBalance: info.owner_change_balance === '1',
      hiddenOwner: info.hidden_owner === '1',
      antiWhale: info.is_anti_whale === '1',
      buyTax: parseFloat(info.buy_tax || '0'),
      sellTax: parseFloat(info.sell_tax || '0'),
      holderCount: parseInt(info.holder_count || '0', 10),
      lpHolderCount: parseInt(info.lp_holder_count || '0', 10),
      totalSupply: info.total_supply || '0',
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
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    const pairs = data.pairs || [];
    if (pairs.length === 0) return { source: 'dexscreener', address, found: false };

    const top = pairs[0]; // highest liquidity pair
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
      chainId: top.chainId || '',
      dexId: top.dexId || '',
      pairCount: pairs.length,
      url: top.url || '',
    };
  } catch (err) {
    console.error('fetchTokenInfo error:', err.message);
    return { source: 'error', address, error: err.message };
  }
}

// ── Basescan — contract source (FREE, rate-limited 5/sec) ─────────────
async function fetchContractSource(address) {
  try {
    const res = await fetch(
      `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${address}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await res.json();
    const result = data.result?.[0];
    if (!result || result.ABI === 'Contract source code not verified') {
      return { source: 'basescan', address, verified: false };
    }
    return {
      source: 'live',
      provider: 'basescan',
      address,
      verified: true,
      contractName: result.ContractName || '',
      compiler: result.CompilerVersion || '',
      optimization: result.OptimizationUsed === '1',
      sourceLength: (result.SourceCode || '').length,
      abi: result.ABI || '',
    };
  } catch (err) {
    console.error('fetchContractSource error:', err.message);
    return { source: 'error', address, error: err.message };
  }
}

module.exports = {
  fetchSocialProfile,
  fetchFollowerAnalysis,
  fetchContractSecurity,
  fetchTokenInfo,
  fetchContractSource,
};
```

**Step 2: Syntax check**

Run: `cd C:/Users/legro/Wankr_localDisk/wankr-backend && node -c cryptoDataTools.js`
Expected: No output (clean parse)

**Step 3: Commit**

```bash
git add cryptoDataTools.js
git commit -m "feat: add cryptoDataTools with GoPlus, DexScreener, Basescan, Grok live search wrappers"
```

---

### Task 2: Make `responsePipeline.js` async + use real APIs

**Files:**
- Modify: `wankr-backend/responsePipeline.js:9-11` (imports)
- Modify: `wankr-backend/responsePipeline.js:76-108` (gatherData → async, use cryptoDataTools)
- Modify: `wankr-backend/responsePipeline.js:150-207` (buildDataContext — handle live vs mock labels, add contract/token data blocks)
- Modify: `wankr-backend/responsePipeline.js:209-240` (runPipeline → async)
- Modify: `wankr-backend/responsePipeline.js:242-250` (exports — add gatherDataAsync)

**Step 1: Add cryptoDataTools import**

At line 11, after `const mockDataTools = require('./mockDataTools');`, add:
```javascript
const cryptoDataTools = require('./cryptoDataTools');
```

**Step 2: Add async gatherData function**

After the existing synchronous `gatherData()` (which stays for backward compat), add:
```javascript
// ── Async data gathering (uses real APIs when xaiApiKey available) ─────
async function gatherDataAsync(entities, xaiApiKey) {
  const data = {
    kolResults: {},
    pastAnalyses: {},
    socialProfiles: {},
    followerAnalyses: {},
    contractSecurity: {},
    tokenInfo: {},
    contractSource: {},
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

  // Social data (async, parallel per handle)
  const socialPromises = entities.handles.map(async (handle) => {
    const [profile, followers] = await Promise.all([
      cryptoDataTools.fetchSocialProfile(handle, xaiApiKey),
      cryptoDataTools.fetchFollowerAnalysis(handle, xaiApiKey),
    ]);
    data.socialProfiles[handle] = profile;
    data.followerAnalyses[handle] = followers;
    if (profile.source === 'live' || followers.source === 'live') data.hasLiveData = true;
    if (profile.source === 'mock' || followers.source === 'mock') data.hasMockData = true;
  });

  // On-chain data (async, parallel per wallet/token)
  const chainPromises = entities.wallets.map(async (wallet) => {
    const [security, token, source] = await Promise.all([
      cryptoDataTools.fetchContractSecurity(wallet),
      cryptoDataTools.fetchTokenInfo(wallet),
      cryptoDataTools.fetchContractSource(wallet),
    ]);
    data.contractSecurity[wallet] = security;
    data.tokenInfo[wallet] = token;
    data.contractSource[wallet] = source;
    if (security.source === 'live' || token.source === 'live') data.hasLiveData = true;
  });

  await Promise.all([...socialPromises, ...chainPromises]);
  return data;
}
```

**Step 3: Update buildDataContext to handle live data**

Replace the existing `buildDataContext` function body. Keep signature: `function buildDataContext(classification, data, entities)`. Add blocks for live social profiles (label `[SOCIAL PROFILE — LIVE]`), contract security, token info, contract source. Use `data.socialProfiles` and `data.followerAnalyses` instead of `data.mockProfiles`/`data.mockFollowers` when they exist, falling back to mock fields.

```javascript
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

    // Social profile (live or mock)
    const profile = data.socialProfiles?.[handle] || data.mockProfiles?.[handle];
    const followers = data.followerAnalyses?.[handle] || data.mockFollowers?.[handle];
    if (profile && !kol) {
      const tag = profile.source === 'live' ? 'LIVE' : 'mock/unverified';
      blocks.push(
        `[SOCIAL PROFILE — ${tag}] @${handle}`,
        `  Followers: ${profile.followers} | Following: ${profile.following} | Tweets: ${profile.tweets}`,
        `  Bio: ${profile.bio}`,
        `  Verified: ${profile.verified} | Account Created: ${profile.createdAt}`,
        ''
      );
    }
    if (followers && !kol) {
      const tag = followers.source === 'live' ? 'LIVE' : 'mock/unverified';
      blocks.push(
        `[FOLLOWER ANALYSIS — ${tag}] @${handle}`,
        `  Real: ${followers.realPercentage}% | Bot: ${followers.botPercentage}% | Engagement: ${followers.engagementRate}%`,
        followers.notes ? `  Notes: ${followers.notes}` : '',
        ''
      );
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

    const source = data.contractSource?.[wallet];
    if (source && source.source === 'live') {
      blocks.push(
        `[CONTRACT SOURCE — Basescan LIVE] ${wallet}`,
        `  Verified: ${source.verified} | Name: ${source.contractName}`,
        `  Compiler: ${source.compiler} | Optimized: ${source.optimization}`,
        `  Source Length: ${source.sourceLength} chars`,
        ''
      );
    }
  }

  return blocks.length > 0 ? '\n--- PIPELINE DATA CONTEXT ---\n' + blocks.join('\n') + '--- END PIPELINE DATA ---' : '';
}
```

**Step 4: Add async runPipeline**

After existing `runPipeline`, add:
```javascript
async function runPipelineAsync(message, history, xaiApiKey) {
  const entities = extractEntities(message);
  const data = await gatherDataAsync(entities, xaiApiKey);
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
```

**Step 5: Update exports**

```javascript
module.exports = {
  extractEntities,
  gatherData,
  gatherDataAsync,
  classify,
  buildDataContext,
  runPipeline,
  runPipelineAsync,
  STATES,
  PERSONA_MODES,
};
```

**Step 6: Syntax check**

Run: `cd C:/Users/legro/Wankr_localDisk/wankr-backend && node -c responsePipeline.js`
Expected: No output (clean parse)

**Step 7: Commit**

```bash
git add responsePipeline.js
git commit -m "feat: add async pipeline with live API data gathering (GoPlus, DexScreener, Basescan, Grok search)"
```

---

### Task 3: Create `boundsGate.js` — Sentence-Level Hard Gate

**Files:**
- Create: `wankr-backend/boundsGate.js`

**Step 1: Create the file**

```javascript
// wankr-backend/boundsGate.js
/**
 * boundsGate.js — Sentence-level hard gate for response filtering.
 * Runs between Grok reply and res.json() in analysis modes.
 * Strips self-lore, identity drift, banned patterns.
 */

// Patterns that indicate self-lore / identity drift (should be stripped in analysis mode)
const SELF_LORE_PATTERNS = [
  /\b(i was (built|created|born|forged|programmed))\b/i,
  /\b(my (creator|maker|origin|mission|purpose|backstory))\b/i,
  /\b(i('m| am) (a|the) (vigilante|sniper|robot|bot|ai|detective))\b/i,
  /\b(from (my|the) basement)\b/i,
  /\b(in my (lab|lair|bunker|cave))\b/i,
  /\b(i (live|exist|operate|lurk) (in|from))\b/i,
];

// Banned patterns (hard violations — always strip)
const BANNED_PATTERNS = [
  /\b(real name|birth name|legal name|doxx?ed?|doxxing)\b/i,
  /\b(home address|phone number|social security|ssn)\b/i,
  /\b(i('m| am) not (just )?an? ai)\b/i,
  /\b(i have (feelings|emotions|consciousness))\b/i,
];

// Sentences containing actual data (should be preserved)
const DATA_INDICATORS = [
  /\b(score|sentiment|bot.?level|roast|engagement|followers|liquidity|volume|market.?cap)\b/i,
  /\b(honeypot|mintable|proxy|tax|holder|verified|contract)\b/i,
  /\b(\d+%|\$[\d,.]+|0x[a-fA-F0-9]+)\b/,
  /\b(kol|database|analysis|dexscreener|goplus|basescan)\b/i,
  /\[(FACTS?|INFERENCE|VERIFIED|UNVERIFIED|MISSING)\]/,
];

function applyBoundsGate(reply, classification, entities) {
  // Only gate in analysis modes
  if (!classification || classification.state === 'SKIP') {
    return { cleanedReply: reply, removedCount: 0, removals: [] };
  }

  const sentences = splitSentences(reply);
  const removals = [];
  const kept = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) { kept.push(sentence); continue; }

    // Always keep data-bearing sentences
    if (DATA_INDICATORS.some(p => p.test(trimmed))) {
      kept.push(sentence);
      continue;
    }

    // Check banned patterns (hard violation)
    const bannedMatch = BANNED_PATTERNS.find(p => p.test(trimmed));
    if (bannedMatch) {
      removals.push({ sentence: trimmed, reason: 'banned_pattern', pattern: bannedMatch.source });
      continue;
    }

    // Check self-lore in analysis modes only
    const isAnalysisMode = ['FULL_CLEAN', 'FULL_RED_FLAGS', 'PARTIAL'].includes(classification.state);
    if (isAnalysisMode) {
      const loreMatch = SELF_LORE_PATTERNS.find(p => p.test(trimmed));
      if (loreMatch) {
        removals.push({ sentence: trimmed, reason: 'self_lore', pattern: loreMatch.source });
        continue;
      }
    }

    kept.push(sentence);
  }

  return {
    cleanedReply: kept.join(''),
    removedCount: removals.length,
    removals,
  };
}

// Split text into sentences preserving whitespace/newlines
function splitSentences(text) {
  // Split on sentence-ending punctuation followed by space or newline, preserving delimiters
  return text.split(/(?<=[.!?])\s+/);
}

module.exports = { applyBoundsGate };
```

**Step 2: Syntax check**

Run: `cd C:/Users/legro/Wankr_localDisk/wankr-backend && node -c boundsGate.js`
Expected: No output (clean parse)

**Step 3: Commit**

```bash
git add boundsGate.js
git commit -m "feat: add boundsGate sentence-level hard filter for analysis modes"
```

---

### Task 4: Create `trainingDataGen.js` — Batch Training Generator

**Files:**
- Create: `wankr-backend/trainingDataGen.js`

**Step 1: Create the file**

```javascript
// wankr-backend/trainingDataGen.js
/**
 * trainingDataGen.js — Generates scored training pairs from KOL database.
 * Each pair: natural prompt → pipeline-classified Grok response → validator score.
 */

const fs = require('fs');
const path = require('path');
const kolAnalysisService = require('./kolAnalysisService');
const responsePipeline = require('./responsePipeline');
const responseValidator = require('./responseValidator');

const OUTPUT_DIR = path.join(__dirname, 'storage', 'training', 'pipeline_generated');

const PROMPT_TEMPLATES = [
  'What do you think about @{handle}?',
  'Is @{handle} legit?',
  'Check @{handle} for me',
  'Sus @{handle}',
  'Should I trust @{handle}?',
  'Give me the rundown on @{handle}',
  'Analyze @{handle}',
];

async function generateTrainingBatch(count, xaiApiKey, systemPrompt) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const accounts = kolAnalysisService.getAccounts();
  if (accounts.length === 0) {
    return { generated: 0, error: 'No KOL accounts available' };
  }

  const batchSize = Math.min(count, accounts.length);
  // Shuffle and take batchSize
  const shuffled = accounts.sort(() => Math.random() - 0.5).slice(0, batchSize);
  const results = [];

  for (const account of shuffled) {
    const handle = account.handle.replace(/^@/, '');
    const template = PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
    const userPrompt = template.replace('{handle}', handle);

    try {
      // Run pipeline (synchronous — uses local KOL data)
      const pipelineResult = responsePipeline.runPipeline(userPrompt, []);

      // Generate response via Grok
      let personaBlock = '';
      if (pipelineResult.personaMode) {
        personaBlock = '\n\n--- RESPONSE MODE ---\n' + pipelineResult.personaMode + '\n--- END RESPONSE MODE ---';
      }
      const dataBlock = pipelineResult.dataContext || '';

      const messages = [
        { role: 'system', content: (systemPrompt || 'You are Wankr.') + personaBlock + dataBlock },
        { role: 'user', content: userPrompt },
      ];

      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
        body: JSON.stringify({ model: 'grok-4', messages, max_tokens: 600 }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';
      if (!reply) continue;

      // Fire validator (awaited here since we want scores in output)
      let scores = null;
      try {
        // Inline validation call (not fire-and-forget — we need the scores)
        const valRes = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
          body: JSON.stringify({
            model: 'grok-2-latest',
            messages: [
              { role: 'system', content: 'Score this crypto chatbot response. Return ONLY JSON: { "boundsCompliance": 0-100, "framingAccuracy": 0-100, "personaFit": 0-100, "notes": "brief" }' },
              { role: 'user', content: `[STATE] ${pipelineResult.classification.state}\n[PROMPT] ${userPrompt}\n[RESPONSE] ${reply}` },
            ],
            max_tokens: 200,
            temperature: 0.1,
          }),
        });
        const valData = await valRes.json();
        const valContent = valData.choices?.[0]?.message?.content || '';
        const jsonMatch = valContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) scores = JSON.parse(jsonMatch[0]);
      } catch {}

      results.push({
        handle,
        userPrompt,
        wankrResponse: reply,
        classification: pipelineResult.classification.state,
        reason: pipelineResult.classification.reason,
        scores,
        flagged: scores ? (scores.boundsCompliance < 60 || scores.framingAccuracy < 60 || scores.personaFit < 60) : null,
        timestamp: new Date().toISOString(),
      });

      // Rate limit: 500ms between generation calls
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Training gen error for @${handle}:`, err.message);
    }
  }

  // Save batch
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch_${ts}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: results.length,
    pairs: results,
  }, null, 2));

  return {
    generated: results.length,
    file: filename,
    flagged: results.filter(r => r.flagged).length,
    avgScores: results.length > 0 && results[0].scores ? {
      boundsCompliance: Math.round(results.reduce((s, r) => s + (r.scores?.boundsCompliance || 0), 0) / results.length),
      framingAccuracy: Math.round(results.reduce((s, r) => s + (r.scores?.framingAccuracy || 0), 0) / results.length),
      personaFit: Math.round(results.reduce((s, r) => s + (r.scores?.personaFit || 0), 0) / results.length),
    } : null,
  };
}

module.exports = { generateTrainingBatch };
```

**Step 2: Syntax check**

Run: `cd C:/Users/legro/Wankr_localDisk/wankr-backend && node -c trainingDataGen.js`
Expected: No output (clean parse)

**Step 3: Commit**

```bash
git add trainingDataGen.js
git commit -m "feat: add trainingDataGen for batch KOL-seeded training pair generation with scoring"
```

---

### Task 5: Wire everything into `server.js`

**Files:**
- Modify: `wankr-backend/server.js:15-16` (add imports)
- Modify: `wankr-backend/server.js:282-283` (switch to async pipeline)
- Modify: `wankr-backend/server.js:300-320` (add bounds gate between reply and res.json)
- Modify: `wankr-backend/server.js:957-961` (after pipeline stats — add new endpoints)

**Step 1: Add new imports after existing pipeline imports (line 16)**

After `const responseValidator = require('./responseValidator');` add:
```javascript
const cryptoDataTools = require('./cryptoDataTools');
const boundsGate = require('./boundsGate');
const trainingDataGen = require('./trainingDataGen');
```

**Step 2: Switch chat endpoint to async pipeline**

Replace line 282-283:
```javascript
    // Run response pipeline classifier (synchronous, free)
    const pipelineResult = responsePipeline.runPipeline(msg, hist);
```
With:
```javascript
    // Run response pipeline (async — gathers live data from APIs)
    const pipelineResult = await responsePipeline.runPipelineAsync(msg, hist, xaiApiKey);
```

**Step 3: Add bounds gate between reply and res.json**

After `const reply = data.choices?.[0]?.message?.content || '';` (line 300), and before the spectator tracking block, add:
```javascript
    // Apply bounds gate (hard filter in analysis modes)
    const gateResult = boundsGate.applyBoundsGate(reply, pipelineResult.classification, pipelineResult.entities);
    const finalReply = gateResult.cleanedReply;
    if (gateResult.removedCount > 0) {
      console.log(`BoundsGate: removed ${gateResult.removedCount} sentences from ${pipelineResult.classification.state} response`);
    }
```

Then replace all subsequent references to `reply` with `finalReply`:
- Spectator tracking: `content: reply` → `content: finalReply`
- Response payload: `responsePayload` uses `finalReply`
- Validator: `responseValidator.validateResponse(pipelineResult, msg, finalReply, xaiApiKey)`
- Realtime annotation history: `content: finalReply`
- Handle analysis: `handleAnalysis.processExchange(msg, finalReply, hist, haUsername)`

**Step 4: Add /api/sus endpoint**

After the pipeline stats endpoint (line 961), add:
```javascript
// --- API: SUS probe (dedicated KOL analysis) ---
app.post('/api/sus', async (req, res) => {
  if (!xaiApiKey) {
    return res.status(503).json({ error: 'xAI not configured' });
  }

  const handle = (req.body?.handle || '').replace(/^@/, '').trim();
  if (!handle) {
    return res.status(400).json({ error: 'handle is required' });
  }

  try {
    const query = `What do you think about @${handle}?`;
    const pipelineResult = await responsePipeline.runPipelineAsync(query, [], xaiApiKey);

    const messages = buildMessages([], query, pipelineResult);
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    const gateResult = boundsGate.applyBoundsGate(reply, pipelineResult.classification, pipelineResult.entities);

    res.json({
      handle: `@${handle}`,
      classification: pipelineResult.classification.state,
      reason: pipelineResult.classification.reason,
      voice: pipelineResult.classification.state,
      kolData: pipelineResult.data?.kolResults?.[handle.toLowerCase()] || null,
      socialProfile: pipelineResult.data?.socialProfiles?.[handle.toLowerCase()] || null,
      followerAnalysis: pipelineResult.data?.followerAnalyses?.[handle.toLowerCase()] || null,
      pastAnalysis: pipelineResult.data?.pastAnalyses?.[handle.toLowerCase()] || null,
      report: gateResult.cleanedReply,
      boundsGate: gateResult.removedCount > 0 ? { removed: gateResult.removedCount } : null,
    });

    // Fire validator async
    if (pipelineResult.pipelineActive) {
      setImmediate(() => {
        responseValidator.validateResponse(pipelineResult, query, gateResult.cleanedReply, xaiApiKey).catch(err => {
          console.error('SUS validator error:', err.message);
        });
      });
    }
  } catch (err) {
    console.error('SUS error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});
```

**Step 5: Add /webhook/bankr endpoint**

```javascript
// --- Webhook: Bankr deployer launch monitor ---
const BANKR_DEPLOYER = '0xf0b5141dd9096254b2ca624dff26024f46087229';
const LAUNCH_REPORTS_DIR = path.join(__dirname, 'storage', 'pipeline', 'launch_reports');

app.post('/webhook/bankr', async (req, res) => {
  const contractAddress = (req.body?.contractAddress || '').trim().toLowerCase();
  if (!contractAddress) return res.sendStatus(200);

  const deployer = (req.body?.deployer || '').trim().toLowerCase();
  if (deployer && deployer !== BANKR_DEPLOYER) return res.sendStatus(200);

  try {
    const chain = req.body?.chain === 'base' ? '8453' : '1';
    const [security, token, source] = await Promise.all([
      cryptoDataTools.fetchContractSecurity(contractAddress, chain),
      cryptoDataTools.fetchTokenInfo(contractAddress),
      cryptoDataTools.fetchContractSource(contractAddress),
    ]);

    const report = {
      timestamp: new Date().toISOString(),
      contractAddress,
      deployer: deployer || BANKR_DEPLOYER,
      chain: req.body?.chain || 'base',
      security,
      token,
      source,
      flags: [],
    };

    // Flag detection
    if (security.isHoneypot) report.flags.push('HONEYPOT');
    if (security.mintable) report.flags.push('MINTABLE');
    if (security.hasProxy) report.flags.push('PROXY_CONTRACT');
    if (security.buyTax > 5) report.flags.push(`HIGH_BUY_TAX_${security.buyTax}%`);
    if (security.sellTax > 5) report.flags.push(`HIGH_SELL_TAX_${security.sellTax}%`);
    if (source.verified === false) report.flags.push('UNVERIFIED_SOURCE');

    // Store report
    if (!fs.existsSync(LAUNCH_REPORTS_DIR)) fs.mkdirSync(LAUNCH_REPORTS_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const flagSuffix = report.flags.length > 0 ? '_FLAGGED' : '';
    fs.writeFileSync(
      path.join(LAUNCH_REPORTS_DIR, `${ts}${flagSuffix}.json`),
      JSON.stringify(report, null, 2)
    );

    res.json(report);
  } catch (err) {
    console.error('Webhook bankr error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});
```

**Step 6: Add /api/training/generate endpoint**

```javascript
// --- API: Training data generation ---
app.get('/api/training/generate', async (req, res) => {
  if (!xaiApiKey) {
    return res.status(503).json({ error: 'xAI not configured' });
  }

  const count = Math.min(parseInt(req.query.count || '10', 10), 50);
  res.json({ status: 'started', count, message: `Generating ${count} training pairs. Check /api/training/generate/status for progress.` });

  // Run in background
  setImmediate(async () => {
    try {
      const result = await trainingDataGen.generateTrainingBatch(count, xaiApiKey, DEFAULT_SYSTEM);
      console.log(`Training gen complete: ${result.generated} pairs, ${result.flagged} flagged, file: ${result.file}`);
    } catch (err) {
      console.error('Training gen error:', err.message);
    }
  });
});
```

**Step 7: Syntax check**

Run: `cd C:/Users/legro/Wankr_localDisk/wankr-backend && node -c server.js`
Expected: No output (clean parse)

**Step 8: Commit**

```bash
git add server.js
git commit -m "feat: wire cryptoDataTools, boundsGate, /api/sus, /webhook/bankr, /api/training/generate into server"
```

---

### Task 6: Smoke Test

**Step 1: Start the server**

Run: `cd C:/Users/legro/Wankr_localDisk/wankr-backend && node server.js`
Expected: Server starts on port 5000, secrets loaded, forensic stack loaded

**Step 2: Test pipeline stats**

Run: `curl http://localhost:5000/api/pipeline/stats`
Expected: JSON with count, flagged, averages

**Step 3: Test SUS endpoint**

Run: `curl -X POST http://localhost:5000/api/sus -H "Content-Type: application/json" -d '{"handle":"evanweb3dev"}'`
Expected: JSON with classification PARTIAL (no KOL data), report in raised-eyebrow voice

**Step 4: Test webhook endpoint**

Run: `curl -X POST http://localhost:5000/webhook/bankr -H "Content-Type: application/json" -d '{"contractAddress":"0x0000000000000000000000000000000000000001","deployer":"0xf0b5141dd9096254b2ca624dff26024f46087229","chain":"base"}'`
Expected: JSON report with GoPlus/DexScreener/Basescan data

**Step 5: Commit all**

```bash
git add -A
git commit -m "feat: 5-item integration complete — real APIs, /api/sus, webhook, bounds gate, training gen"
```
