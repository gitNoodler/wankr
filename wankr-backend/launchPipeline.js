// launchPipeline.js — Bankr launch feed, handle tracker, sentiment batch, active users
const fs = require('fs');
const path = require('path');

// --- Storage paths ---
const STORAGE_ROOT = require('./storagePath');
const LAUNCH_STORAGE_DIR = path.join(STORAGE_ROOT, 'bankr_launches');
const LAUNCH_CACHE_FILE = path.join(LAUNCH_STORAGE_DIR, 'launch_cache.json');
const LAUNCH_LOG_FILE = path.join(LAUNCH_STORAGE_DIR, 'launch_log.jsonl');
const HANDLE_TRACKER_FILE = path.join(LAUNCH_STORAGE_DIR, 'handle_tracker.json');
const HANDLE_ARCHIVE_DIR = path.join(LAUNCH_STORAGE_DIR, 'handles');
const launchCache = new Map();
const handleTracker = {}; // handle → { launches: [...], firstSeen, totalLaunches }

// --- Active-user presence (controls whether launch polling runs) ---
const activeUsers = new Map(); // token → lastSeen timestamp
const ACTIVE_USER_TTL = 5 * 60 * 1000; // 5 minutes without heartbeat = inactive

// Sentinel batch counters (for stats)
const sentimentBatchStats = { fired: 0, success: 0, fail: 0 };

// Detection: X Filtered Stream (xStreamListener.js) → ingestLaunches()
// x_search polling removed — stream is free, x_search costs $5/1k calls
const SENTIMENT_BATCH_MAX = 5;           // batch at 5 queued
const SENTIMENT_BATCH_TIMEOUT = 600000;  // or 10 min, whichever first
const SENTIMENT_INSTANT_THRESHOLD = 999; // always instant (batch API needs key permission upgrade)
const CACHE_TTL = 48 * 60 * 60 * 1000;  // prune cache entries older than 48h
const CACHE_PRUNE_INTERVAL = 3600000;    // check every hour

let lastBatchTime = Date.now();
let sentimentQueue = [];  // launches awaiting sentiment

// Active batch tracking for async Batch API
// Each entry: { batchId, tokens: [...], createdAt, pollCount }
let activeBatches = [];
const BATCH_POLL_INTERVAL = 15000; // poll active batches every 15s
const BATCH_MAX_POLLS = 40;        // give up after ~10 minutes

// Dependencies injected via init()
let getXaiKeyPipeline, getXaiApiKey, cryptoDataTools, responsePipeline, handleStore;

// --- Persistence helpers ---
function saveLaunchCache() {
  try {
    fs.writeFileSync(LAUNCH_CACHE_FILE, JSON.stringify(Object.fromEntries(launchCache), null, 2));
  } catch (err) { console.error('Launch cache save error:', err.message); }
}

function saveHandleTracker() {
  try {
    fs.writeFileSync(HANDLE_TRACKER_FILE, JSON.stringify(handleTracker, null, 2));
  } catch (err) { console.error('Handle tracker save error:', err.message); }
}

function appendLaunchLog(entry) {
  try {
    fs.appendFileSync(LAUNCH_LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) { console.error('Launch log append error:', err.message); }
}

// Sync sentiment results from launchCache back into handleTracker launch entries
function syncSentimentToHandles() {
  let synced = 0;
  for (const [handle, h] of Object.entries(handleTracker)) {
    for (const launch of h.launches) {
      const cacheKey = launch.contractAddress || (launch.tokenName || '').toLowerCase().trim();
      if (!cacheKey) continue;
      const cached = launchCache.get(cacheKey);
      if (!cached || cached.sentimentStatus !== 'done') continue;
      // Only update if the tracker entry still has default/stale data
      if (launch.communityReaction !== cached.communityReaction || launch.reactionNote !== cached.reactionNote) {
        launch.communityReaction = cached.communityReaction;
        launch.reactionNote = cached.reactionNote;
        launch.sentimentUpdatedAt = new Date().toISOString();
        synced++;
      }
    }
  }
  if (synced > 0) {
    saveHandleTracker();
    console.log(`🔄 Synced sentiment to ${synced} handle-tracker entries`);
  }
  return synced;
}

// Archive a handle's full record to a per-handle JSON file (survives cache clears)
function archiveHandle(handle) {
  const h = handleTracker[handle];
  if (!h || !h.launches.length) return;
  try {
    if (!fs.existsSync(HANDLE_ARCHIVE_DIR)) fs.mkdirSync(HANDLE_ARCHIVE_DIR, { recursive: true });
    const safeHandle = handle.replace(/[^A-Za-z0-9_-]/g, '').substring(0, 30);
    const archiveFile = path.join(HANDLE_ARCHIVE_DIR, `${safeHandle}.json`);
    // Enrich launches with full cache data before archiving
    const enrichedLaunches = h.launches.map(launch => {
      const cacheKey = launch.contractAddress || (launch.tokenName || '').toLowerCase().trim();
      const cached = cacheKey ? launchCache.get(cacheKey) : null;
      return {
        ...launch,
        // Overlay any richer data from the cache
        ...(cached ? {
          communityReaction: cached.communityReaction,
          reactionNote: cached.reactionNote,
          sentimentStatus: cached.sentimentStatus,
          chain: cached.chain,
          failedAttempt: cached.failedAttempt || false,
          firstSeen: cached.firstSeen,
          lastSeen: cached.lastSeen,
        } : {}),
      };
    });
    const archive = {
      handle: `@${handle}`,
      firstSeen: h.firstSeen,
      totalLaunches: h.totalLaunches,
      botScore: h.botScore ?? null,
      botFlag: h.botFlag ?? null,
      intel: (h.intel && !h.intel.pending) ? h.intel : null,
      launches: enrichedLaunches,
      archivedAt: new Date().toISOString(),
    };
    fs.writeFileSync(archiveFile, JSON.stringify(archive, null, 2));
  } catch (err) {
    console.error(`Handle archive error for @${handle}:`, err.message);
  }
}

// Archive all tracked handles (called after sentiment sync)
function archiveAllHandles() {
  for (const handle of Object.keys(handleTracker)) {
    archiveHandle(handle);
  }
  if (Object.keys(handleTracker).length > 0) {
    console.log(`📦 Archived ${Object.keys(handleTracker).length} handles to ${HANDLE_ARCHIVE_DIR}`);
  }
}

// --- Handle tracking + scoring ---
function trackHandle(launch, now) {
  const handle = (launch.requestedBy || '').replace(/^@/, '').toLowerCase().trim();
  if (!handle) return;
  if (!handleTracker[handle]) {
    handleTracker[handle] = { firstSeen: now, totalLaunches: 0, launches: [] };
  }
  const h = handleTracker[handle];
  // Avoid duplicate entries for same contract
  const ca = (launch.contractAddress || '').toLowerCase();
  if (ca && h.launches.some(l => l.contractAddress === ca)) return;
  h.totalLaunches++;
  h.launches.push({
    tokenName: launch.tokenName || 'Unknown',
    tokenSymbol: launch.tokenSymbol || '???',
    contractAddress: ca,
    communityReaction: launch.communityReaction || 'neutral',
    timestamp: launch.timestamp || now,
    loggedAt: now,
  });
  // Score and optionally probe
  scoreHandle(handle);
  probeHandleIntel(handle);
}

function scoreHandle(handle) {
  const h = handleTracker[handle];
  if (!h) return;
  let score = 0;

  // --- Volume signals (need real quantity to matter) ---

  // Signal 1: 8+ launches total → +25 (was 5+ → +30; raising bar)
  if (h.totalLaunches >= 8) score += 25;

  // Signal 2: 5+ launches in last 7 days → +30 (was 3+ → +40; 3 in a week is normal for active deployers)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = h.launches.filter(l => new Date(l.timestamp).getTime() > sevenDaysAgo).length;
  if (recentCount >= 5) score += 30;

  // Signal 3: Negative community reaction on majority of launches → -10 (legit deployers get negative reactions too, but bots get silence)
  // REMOVED: "all neutral" — neutral is the default state before sentiment runs, not evidence of anything

  // Signal 4: Repeated token names (same name launched 3+ times) → +20 (was 2+ → +25; retrying a launch once is normal)
  if (h.launches.length >= 3) {
    const nameCounts = {};
    for (const l of h.launches) {
      const name = (l.tokenName || '').toLowerCase().trim();
      if (name && name !== 'unknown') nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
    const hasRepeats = Object.values(nameCounts).some(c => c >= 3);
    if (hasRepeats) score += 20;
  }

  // --- Grok intel signals (require actual probe data, strongest evidence) ---
  if (h.intel && !h.intel.error && !h.intel.pending) {
    // Account age <14 days + 3+ launches → +25 (brand new account spam-launching)
    const age = (h.intel.profile?.accountAge || '').toLowerCase();
    if (age && age !== 'unknown') {
      const dayMatch = age.match(/(\d+)\s*day/);
      const weekMatch = age.match(/(\d+)\s*week/);
      const monthMatch = age.match(/(\d+)\s*month/);
      let ageDays = 999;
      if (dayMatch) ageDays = parseInt(dayMatch[1]);
      else if (weekMatch) ageDays = parseInt(weekMatch[1]) * 7;
      else if (monthMatch) ageDays = parseInt(monthMatch[1]) * 30;
      if (ageDays < 14 && h.totalLaunches >= 3) score += 25;
    }

    // Posts >70% @bankrbot commands → +30 (strong: account exists only to spam launches)
    if (h.intel.posts?.length >= 5) {
      const botCmdCount = h.intel.posts.filter(p =>
        /@bankr/i.test(p.text || '')
      ).length;
      if (botCmdCount / h.intel.posts.length > 0.7) score += 30;
    }
  }

  h.botScore = Math.min(score, 100);
  // Raised thresholds: need real corroborating evidence, not just weak defaults
  h.botFlag = score >= 70 ? 'likely' : score >= 50 ? 'suspicious' : null;
}

// Async Grok probe — fires once per handle when they cross 3+ launches
function probeHandleIntel(handle) {
  const h = handleTracker[handle];
  if (!h || h.intel || h.totalLaunches < 3) return;
  const key = getXaiKeyPipeline() || getXaiApiKey();
  if (!key) return;
  // Mark as pending so we don't re-fire
  h.intel = { pending: true };
  cryptoDataTools.fetchHandleIntel(handle, key).then(result => {
    h.intel = result;
    scoreHandle(handle); // rescore with intel
    saveHandleTracker();
    archiveHandle(handle); // persist intel + score to per-handle file
    console.log(`🔍 Intel probed @${handle} — botScore: ${h.botScore}, flag: ${h.botFlag || 'none'}`);
  }).catch(err => {
    h.intel = { error: err.message };
    console.error(`Intel probe failed for @${handle}:`, err.message);
  });
}

// Sentiment probe for handles under 3 launches — runs after each poll batch
function probeNewHandleSentiment(launches, apiKey) {
  const seen = new Set();
  for (const l of launches) {
    const handle = (l.requestedBy || '').replace(/^@/, '').toLowerCase().trim();
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    const h = handleTracker[handle];
    if (!h || h.intel || h.totalLaunches >= 3) continue; // skip if already probed or at 3+
    // One-time intel probe for this new handle
    h.intel = { pending: true };
    cryptoDataTools.fetchHandleIntel(handle, apiKey).then(result => {
      h.intel = result;
      scoreHandle(handle);
      saveHandleTracker();
      archiveHandle(handle); // persist intel + score to per-handle file
      console.log(`🔍 Early intel @${handle} (${h.totalLaunches} launches) — botScore: ${h.botScore}, flag: ${h.botFlag || 'none'}`);
    }).catch(err => {
      h.intel = { error: err.message };
      console.error(`Early intel failed for @${handle}:`, err.message);
    });
  }
}

function mergeLaunches(newLaunches) {
  const now = new Date().toISOString();
  let added = 0;
  for (const l of newLaunches) {
    const key = l.contractAddress
      ? l.contractAddress.toLowerCase()
      : (l.tokenName || '').toLowerCase().trim();
    if (!key) continue;
    if (!launchCache.has(key)) {
      // Non-launch items skip sentiment; actual launches start as pending
      const entry = { ...l, firstSeen: now, lastSeen: now };
      if (entry.actionType && entry.actionType !== 'launch') {
        entry.sentimentStatus = 'done';
      } else {
        entry.sentimentStatus = 'pending';
      }
      launchCache.set(key, entry);
      added++;
      // Log new launch to append-only log
      appendLaunchLog({ ...l, firstSeen: now, loggedAt: now });
      // Track the requesting handle
      trackHandle(l, now);
    } else {
      const existing = launchCache.get(key);
      existing.lastSeen = now;
      if (!existing.contractAddress && l.contractAddress) existing.contractAddress = l.contractAddress;
      if (!existing.requestedBy && l.requestedBy) existing.requestedBy = l.requestedBy;
      if (l.communityReaction !== 'neutral') existing.communityReaction = l.communityReaction;
      if (l.reactionNote && l.reactionNote !== existing.reactionNote) existing.reactionNote = l.reactionNote;
    }
  }
  if (added > 0 || newLaunches.length > 0) {
    saveLaunchCache();
    if (added > 0) saveHandleTracker();
  }
}

function getCachedLaunches() {
  return [...launchCache.values()]
    .sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen))
    .map(launch => {
      const handle = (launch.requestedBy || '').replace(/^@/, '').toLowerCase().trim();
      const tracker = handle ? handleTracker[handle] : null;
      return {
        ...launch,
        sentimentStatus: launch.sentimentStatus || 'done',
        chain: launch.chain || 'base',
        failedAttempt: launch.failedAttempt || false,
        botScore: tracker?.botScore ?? null,
        botFlag: tracker?.botFlag ?? null,
      };
    });
}

function touchUser(token) {
  if (!token) return;
  activeUsers.set(token, Date.now());
}

function hasActiveUsers() {
  const cutoff = Date.now() - ACTIVE_USER_TTL;
  for (const [token, ts] of activeUsers) {
    if (ts < cutoff) activeUsers.delete(token);
    else return true;
  }
  return false;
}

// Failed launch attempt detection
function detectFailedAttempts(incomingLaunches) {
  const dominated = new Set();

  for (let i = 0; i < incomingLaunches.length; i++) {
    const l = incomingLaunches[i];
    if (l.actionType !== 'launch') continue;
    const name = (l.tokenName || '').toLowerCase().trim();
    const handle = (l.requestedBy || '').toLowerCase().trim();
    if (!name || name === 'unknown') continue;

    // Check against cache: does a successful version already exist?
    for (const [, cached] of launchCache) {
      if (cached.actionType !== 'launch') continue;
      const cachedName = (cached.tokenName || '').toLowerCase().trim();
      const cachedHandle = (cached.requestedBy || '').toLowerCase().trim();
      if (cachedName !== name || cachedHandle !== handle) continue;

      if (cached.contractAddress && !l.contractAddress) {
        dominated.add(i);
        break;
      }
      if (!cached.contractAddress && l.contractAddress) {
        cached.failedAttempt = true;
        cached.sentimentStatus = 'done';
        cached.communityReaction = 'neutral';
        cached.reactionNote = 'Failed launch attempt';
        console.log(`❌ Marking cached "${cachedName}" by ${cachedHandle} as failed attempt (new one has contract)`);
        break;
      }
      if (!cached.contractAddress && !l.contractAddress) {
        dominated.add(i);
        cached.lastSeen = new Date().toISOString();
        break;
      }
    }
  }

  // Also check incoming against each other
  for (let i = 0; i < incomingLaunches.length; i++) {
    if (dominated.has(i)) continue;
    const a = incomingLaunches[i];
    if (a.actionType !== 'launch') continue;
    const nameA = (a.tokenName || '').toLowerCase().trim();
    const handleA = (a.requestedBy || '').toLowerCase().trim();
    if (!nameA || nameA === 'unknown') continue;

    for (let j = i + 1; j < incomingLaunches.length; j++) {
      if (dominated.has(j)) continue;
      const b = incomingLaunches[j];
      if (b.actionType !== 'launch') continue;
      const nameB = (b.tokenName || '').toLowerCase().trim();
      const handleB = (b.requestedBy || '').toLowerCase().trim();
      if (nameA !== nameB || handleA !== handleB) continue;

      if (a.contractAddress && !b.contractAddress) dominated.add(j);
      else if (b.contractAddress && !a.contractAddress) dominated.add(i);
      else if (!a.contractAddress && !b.contractAddress) dominated.add(j);
    }
  }

  const passed = incomingLaunches.filter((_, i) => !dominated.has(i));
  const failed = dominated.size;
  if (failed > 0) {
    console.log(`❌ Filtered ${failed} failed launch attempt(s) from ${incomingLaunches.length} detected`);
  }
  return passed;
}

// Detection poll — gated by POLLING_ENABLED flag
// Prune cache entries older than CACHE_TTL — log.jsonl is the permanent record
function pruneLaunchCache() {
  const cutoff = Date.now() - CACHE_TTL;
  let pruned = 0;
  for (const [key, entry] of launchCache) {
    const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;
    if (ts > 0 && ts < cutoff && entry.sentimentStatus === 'done') {
      launchCache.delete(key);
      pruned++;
    }
  }
  if (pruned > 0) {
    saveLaunchCache();
    console.log(`🧹 Pruned ${pruned} old cache entries (${launchCache.size} remaining)`);
  }
}

// Ingest launches from external sources (X Filtered Stream, on-chain, etc.)
// Same dedup + processing as runDetectionPoll but callable from outside
function ingestLaunches(launches) {
  if (!launches?.length) return;

  const newLaunches = [];
  for (const l of launches) {
    const cacheKey = l.contractAddress
      ? l.contractAddress.toLowerCase()
      : (l.tokenName || '').toLowerCase().trim();
    if (!cacheKey) continue;
    if (!launchCache.has(cacheKey)) {
      newLaunches.push(l);
    }
  }

  if (newLaunches.length === 0) return;

  const verified = detectFailedAttempts(newLaunches);
  if (verified.length > 0) {
    mergeLaunches(verified);
    const key = getXaiKeyPipeline() || getXaiApiKey();
    if (key) probeNewHandleSentiment(verified, key);
    const launchesForSentiment = verified.filter(l => l.actionType === 'launch');
    if (launchesForSentiment.length > 0) {
      sentimentQueue.push(...launchesForSentiment);
    }
    console.log(`📡 Stream: ${newLaunches.length} items, ${verified.length} verified (${sentimentQueue.length} in queue)`);
  }

  checkSentimentBatchTrigger();
}

// Sentiment batch trigger: SENTIMENT_BATCH_MAX queued OR timeout elapsed
// Queue must never exceed cap — fire as soon as cap is reached (or more)
function checkSentimentBatchTrigger() {
  // Fire immediately if queue >= cap
  if (sentimentQueue.length >= SENTIMENT_BATCH_MAX) {
    fireSentimentBatch();
    return;
  }
  // Fire on timeout if anything is queued
  const elapsed = Date.now() - lastBatchTime;
  if (sentimentQueue.length > 0 && elapsed >= SENTIMENT_BATCH_TIMEOUT) {
    fireSentimentBatch();
  } else if (elapsed >= SENTIMENT_BATCH_TIMEOUT) {
    lastBatchTime = Date.now();
  }
}

// Re-queue failed batch items and reset their cache status to 'pending'
function requeue(items) {
  for (const item of items) {
    const cacheKey = item.contractAddress?.toLowerCase() || (item.tokenName || '').toLowerCase().trim();
    const cached = launchCache.get(cacheKey);
    if (cached && cached.sentimentStatus === 'processing') {
      cached.sentimentStatus = 'pending';
    }
  }
  sentimentQueue.unshift(...items);
}

function fireSentimentBatch() {
  const key = getXaiKeyPipeline() || getXaiApiKey();
  if (!key || sentimentQueue.length === 0) return;

  const batch = sentimentQueue.splice(0).filter(l => {
    const cacheKey = l.contractAddress?.toLowerCase() || (l.tokenName || '').toLowerCase().trim();
    const cached = launchCache.get(cacheKey);
    if (cached?.failedAttempt) {
      console.log(`🗑️ Removed failed attempt "${l.tokenName}" from sentiment batch`);
      return false;
    }
    return true;
  });
  lastBatchTime = Date.now();
  if (batch.length === 0) return;
  sentimentBatchStats.fired++;

  // Mark cache entries as 'processing' so frontend distinguishes queued vs in-flight
  for (const item of batch) {
    const cacheKey = item.contractAddress?.toLowerCase() || (item.tokenName || '').toLowerCase().trim();
    const cached = launchCache.get(cacheKey);
    if (cached && cached.sentimentStatus === 'pending') {
      cached.sentimentStatus = 'processing';
    }
  }

  // Hybrid: slow periods (≤3 items) → instant full-price, busy (>3) → batch half-price
  if (batch.length <= SENTIMENT_INSTANT_THRESHOLD) {
    console.log(`⚡ Instant sentiment for ${batch.length} token(s) (slow period)`);
    cryptoDataTools.batchSentiment(batch, key).then(sentimentMap => {
      applySentimentResults(sentimentMap);
      sentimentBatchStats.success++;
    }).catch(err => {
      console.warn('⚠️  Instant sentiment error — re-queuing:', err.message);
      sentimentBatchStats.fail++;
      requeue(batch);
    });
  } else {
    console.log(`🎯 Batch sentiment for ${batch.length} tokens (half price)`);
    cryptoDataTools.createSentimentBatch(batch, key).then(batchId => {
      if (batchId) {
        activeBatches.push({ batchId, tokens: batch, createdAt: Date.now(), pollCount: 0 });
        console.log(`📦 Batch ${batchId} queued — ${activeBatches.length} active`);
      } else {
        console.warn('⚠️  Batch API returned no ID — re-queuing');
        sentimentBatchStats.fail++;
        requeue(batch);
      }
    }).catch(err => {
      console.warn('⚠️  Batch API error — re-queuing:', err.message);
      sentimentBatchStats.fail++;
      requeue(batch);
    });
  }
}

// Shared: apply a sentimentMap to the launch cache, log, sync handles, archive
function applySentimentResults(sentimentMap) {
  let updated = 0;
  for (const [, entry] of launchCache) {
    if (entry.sentimentStatus === 'done') continue;
    const lookupKey = entry.contractAddress?.toLowerCase() || (entry.tokenName || '').toLowerCase().trim();
    const sentiment = sentimentMap[lookupKey];
    if (sentiment) {
      entry.communityReaction = sentiment.communityReaction;
      entry.reactionNote = sentiment.reactionNote;
      entry.sentimentStatus = 'done';
      updated++;
      appendLaunchLog({
        type: 'sentiment_result',
        tokenName: entry.tokenName,
        contractAddress: entry.contractAddress,
        requestedBy: entry.requestedBy,
        communityReaction: sentiment.communityReaction,
        reactionNote: sentiment.reactionNote,
        timestamp: new Date().toISOString(),
      });
    }
  }
  if (updated > 0) {
    saveLaunchCache();
    syncSentimentToHandles();
    archiveAllHandles();
    console.log(`✅ Sentiment updated for ${updated} launches`);
  }
  return updated;
}

// Poll active batches and process results when ready
function pollActiveBatches() {
  const key = getXaiKeyPipeline() || getXaiApiKey();
  if (!key || activeBatches.length === 0) return;

  const stillActive = [];
  for (const ab of activeBatches) {
    ab.pollCount++;
    if (ab.pollCount > BATCH_MAX_POLLS) {
      console.warn(`⏰ Batch ${ab.batchId} timed out after ${ab.pollCount} polls — re-queuing ${ab.tokens.length} tokens`);
      sentimentBatchStats.fail++;
      sentimentQueue.unshift(...ab.tokens);
      continue;
    }

    cryptoDataTools.pollBatchStatus(ab.batchId, key).then(status => {
      if (status.done) {
        console.log(`✅ Batch ${ab.batchId} completed (polls: ${ab.pollCount})`);
        cryptoDataTools.fetchBatchResults(ab.batchId, key).then(parsed => {
          if (parsed?.results) {
            // Build sentimentMap keyed the same way as the sync path
            const sentimentMap = {};
            for (const r of parsed.results) {
              const idx = (r.index || 1) - 1;
              const token = ab.tokens[idx];
              if (!token) continue;
              const lookupKey = token.contractAddress?.toLowerCase() || (token.tokenName || '').toLowerCase().trim();
              if (lookupKey) {
                sentimentMap[lookupKey] = {
                  communityReaction: r.communityReaction || 'neutral',
                  reactionNote: r.reactionNote || 'No data',
                };
              }
            }
            const updated = applySentimentResults(sentimentMap);
            sentimentBatchStats.success++;
            console.log(`📦 Batch ${ab.batchId} results applied — ${updated} updated`);
          } else {
            console.warn(`⚠️  Batch ${ab.batchId} completed but no parseable results — re-queuing`);
            sentimentBatchStats.fail++;
            sentimentQueue.unshift(...ab.tokens);
          }
        }).catch(err => {
          console.error(`Batch ${ab.batchId} result fetch error:`, err.message);
          sentimentBatchStats.fail++;
          sentimentQueue.unshift(...ab.tokens);
        });
      } else {
        // Still processing — keep in active list
        stillActive.push(ab);
      }
    }).catch(err => {
      console.error(`Batch ${ab.batchId} poll error:`, err.message);
      stillActive.push(ab); // keep trying
    });
  }

  // Note: async callbacks above may still add to activeBatches, but that's fine
  // We replace with what's confirmed still active synchronously
  activeBatches = stillActive;
}

// --- init: called from server.js to wire up deps + routes + intervals ---
function init(app, deps) {
  getXaiKeyPipeline = deps.getXaiKeyPipeline;
  getXaiApiKey = deps.getXaiApiKey;
  cryptoDataTools = deps.cryptoDataTools;
  responsePipeline = deps.responsePipeline;
  handleStore = deps.handleStore;

  // Ensure storage dirs exist
  try { fs.mkdirSync(LAUNCH_STORAGE_DIR, { recursive: true }); } catch {}
  try { fs.mkdirSync(HANDLE_ARCHIVE_DIR, { recursive: true }); } catch {}

  // Load persisted launches on startup
  try {
    if (fs.existsSync(LAUNCH_CACHE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(LAUNCH_CACHE_FILE, 'utf8'));
      for (const [key, val] of Object.entries(saved)) launchCache.set(key, val);
      console.log(`✅ Loaded ${launchCache.size} cached launches`);
    }
  } catch (err) { console.warn('⚠️  Could not load launch cache:', err.message); }

  // Load handle tracker on startup
  try {
    if (fs.existsSync(HANDLE_TRACKER_FILE)) {
      Object.assign(handleTracker, JSON.parse(fs.readFileSync(HANDLE_TRACKER_FILE, 'utf8')));
      console.log(`✅ Loaded ${Object.keys(handleTracker).length} tracked handles`);
    }
  } catch (err) { console.warn('⚠️  Could not load handle tracker:', err.message); }

  // Backfill handle tracker from existing cache (runs once on startup)
  if (Object.keys(handleTracker).length === 0 && launchCache.size > 0) {
    for (const l of launchCache.values()) {
      trackHandle(l, l.firstSeen || new Date().toISOString());
    }
    saveHandleTracker();
    console.log(`✅ Backfilled ${Object.keys(handleTracker).length} handles from cache`);
  }

  // Re-queue launches with missing/pending/processing sentimentStatus on startup
  {
    let requeued = 0;
    for (const entry of launchCache.values()) {
      if (entry.actionType === 'launch' && (!entry.sentimentStatus || entry.sentimentStatus === 'pending' || entry.sentimentStatus === 'processing') && !entry.failedAttempt) {
        entry.sentimentStatus = 'pending';
        sentimentQueue.push(entry);
        requeued++;
      }
    }
    if (requeued > 0) {
      saveLaunchCache();
      console.log(`🔄 Re-queued ${requeued} launches with pending/missing sentimentStatus`);
      // Fire batch immediately if queue already exceeds cap
      checkSentimentBatchTrigger();
    }
  }

  // Score all existing handles on startup
  for (const handle of Object.keys(handleTracker)) {
    scoreHandle(handle);
  }
  if (Object.keys(handleTracker).length > 0) {
    // Sync any existing sentiment data from cache into tracker entries
    syncSentimentToHandles();
    saveHandleTracker();
    // Archive all handles on startup (ensures per-handle files exist with latest data)
    archiveAllHandles();
    const flagged = Object.values(handleTracker).filter(h => h.botFlag).length;
    console.log(`🤖 Scored ${Object.keys(handleTracker).length} handles — ${flagged} flagged`);
  }

  // Wire launch cache into response pipeline so Wankr recognizes token names from the feed
  responsePipeline.setLaunchCacheProvider(getCachedLaunches);
  responsePipeline.setHandleTrackerProvider(() => handleTracker);

  // --- Routes ---
  app.get('/api/pipeline/launch-feed', (req, res) => {
    if (Date.now() - lastBatchTime >= SENTIMENT_BATCH_TIMEOUT) {
      lastBatchTime = Date.now();
    }
    const nextBatchIn = Math.max(0, SENTIMENT_BATCH_TIMEOUT - (Date.now() - lastBatchTime));
    res.json({
      source: 'cache',
      launches: getCachedLaunches(),
      nextBatchIn,
      queuedForSentiment: sentimentQueue.length,
    });
  });

  app.get('/api/pipeline/handle-tracker', (req, res) => {
    const sorted = Object.entries(handleTracker)
      .map(([handle, data]) => ({ handle: `@${handle}`, ...data }))
      .sort((a, b) => b.totalLaunches - a.totalLaunches);
    res.json({ handles: sorted, total: sorted.length });
  });

  app.get('/api/pipeline/handle-tracker/:handle', (req, res) => {
    const h = (req.params.handle || '').replace(/^@/, '').toLowerCase().trim();
    const data = handleTracker[h];
    if (!data) return res.json({ handle: `@${h}`, found: false });
    res.json({ handle: `@${h}`, found: true, ...data });
  });

  // --- Intervals ---
  // Check batch timeout every 10s (runs always — feed must be unified for all users)
  setInterval(checkSentimentBatchTrigger, 10000);

  // Poll active Batch API batches every 15s
  setInterval(pollActiveBatches, BATCH_POLL_INTERVAL);

  // Prune old cache entries every hour (log.jsonl keeps everything forever)
  setInterval(pruneLaunchCache, CACHE_PRUNE_INTERVAL);

  // Detection: handled by xStreamListener → ingestLaunches() (no x_search polling)
}

// Import snapshot — merge incoming data without losing existing entries
function importSnapshot(snapshot) {
  let cacheImported = 0, trackerImported = 0;

  // Merge launch cache
  if (snapshot.launchCache) {
    for (const [key, entry] of Object.entries(snapshot.launchCache)) {
      if (!launchCache.has(key)) {
        launchCache.set(key, entry);
        cacheImported++;
      }
    }
    saveLaunchCache();
  }

  // Merge handle tracker
  if (snapshot.handleTracker) {
    for (const [handle, data] of Object.entries(snapshot.handleTracker)) {
      if (!handleTracker[handle]) {
        handleTracker[handle] = data;
        trackerImported++;
      }
    }
    saveHandleTracker();
  }

  // Archive all imported handles
  for (const handle of Object.keys(snapshot.handleTracker || {})) {
    archiveHandle(handle);
  }

  return { cacheImported, trackerImported, cacheTotal: launchCache.size, trackerTotal: Object.keys(handleTracker).length };
}

module.exports = {
  init,
  touchUser,
  hasActiveUsers,
  getLaunchCache: () => launchCache,
  getHandleTracker: () => handleTracker,
  getSentimentQueue: () => sentimentQueue,
  getSentimentBatchStats: () => sentimentBatchStats,
  getActiveBatches: () => activeBatches,
  getActiveUsers: () => activeUsers,
  getCachedLaunches,
  ingestLaunches,
  importSnapshot,
  ACTIVE_USER_TTL,
};
