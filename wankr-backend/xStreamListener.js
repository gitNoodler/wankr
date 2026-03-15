// xStreamListener.js — X Filtered Stream v2 + search polling fallback
// Primary: persistent stream (free, real-time). Fallback: search/recent polling.
const https = require('https');
const { URL } = require('url');

let getBearerToken = null;
let onLaunchDetected = null;
let streamReq = null;
let reconnectTimer = null;
let connected = false;
let connecting = false;         // guard against overlapping connect() calls
let reconnectAttempts = 0;
let totalTweetsReceived = 0;
let startedAt = null;
let permanentlyDisabled = false; // stop retrying on 401/403
let heartbeatTimer = null;
const activityBuffer = [];          // ring buffer of all raw stream tweets
const ACTIVITY_BUFFER_MAX = 200;    // keep last 200 tweets

// ── Search polling fallback state ──────────────────────────────────────
let pollTimer = null;
let pollSinceId = null;           // track last tweet ID to avoid duplicates
let totalPollHits = 0;
let pollActive = false;
const seenTweetIds = new Set();   // dedup across stream + poll
const SEEN_IDS_MAX = 5000;

const RULES_URL = 'https://api.x.com/2/tweets/search/stream/rules';
const STREAM_URL = 'https://api.x.com/2/tweets/search/stream';
const SEARCH_URL = 'https://api.x.com/2/tweets/search/recent';
const STARTUP_DELAY = 15000;         // 15s delay on boot — let old container die
const RECONNECT_BASE = 60000;        // 60s minimum between retries
const RECONNECT_MAX = 600000;        // 10min max backoff
const RECONNECT_LOG_EVERY = 5;       // only log every 5th attempt to reduce spam
const HEARTBEAT_TIMEOUT = 30000;     // 30s — X sends heartbeats every 20s
const POLL_INTERVAL = 10000;         // 10s — 6/min = 90/15min (limit: 450/15min)
// X rate limit: 50 stream connections per 15min, 450 search requests per 15min

// Rules created in X Developer Console:
// ID: 2032965417317314563 | value: @bankrbot (mentions)
// ID: 2032965417317314564 | value: from:bankrbot (own tweets)

async function init(deps) {
  getBearerToken = deps.getBearerToken;
  onLaunchDetected = deps.onLaunchDetected;

  const token = getBearerToken();
  if (!token) {
    console.warn('⚠️ X Stream: no bearer token at init — will retry on reconnect');
    startedAt = Date.now();
    scheduleReconnect();
    return;
  }

  startedAt = Date.now();

  try {
    await verifyRules();
  } catch (err) {
    console.error('X Stream init error:', err.message);
  }

  // Start search polling immediately — catches tweets while stream connects
  startPolling();

  // Delay first stream connection to let previous container's stream die
  console.log(`X Stream: Waiting ${STARTUP_DELAY / 1000}s before connecting (letting old connections expire)...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, STARTUP_DELAY);
}

// Verify streaming rule exists (created manually in X Developer Console)
async function verifyRules() {
  const token = getBearerToken();
  if (!token) return;
  const res = await fetch(RULES_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) {
    console.error('X Stream: 403 — filtered stream not available on this API tier');
    return;
  }
  if (res.status === 401) {
    console.error('X Stream: 401 — invalid bearer token');
    return;
  }

  const data = await res.json();
  const rules = data.data || [];
  if (rules.length > 0) {
    for (const r of rules) {
      console.log(`  📏 Rule ${r.id}: "${r.value}" ${r.tag ? `[${r.tag}]` : ''}`);
    }
    console.log(`✅ X Stream: ${rules.length} rule(s) active`);
  } else {
    console.warn('⚠️ X Stream: No rules found — add rules in X Developer Console');
  }
}

function resetHeartbeat() {
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  heartbeatTimer = setTimeout(() => {
    console.warn('X Stream: No heartbeat for 30s — connection dead, reconnecting');
    cleanupConnection();
    scheduleReconnect();
  }, HEARTBEAT_TIMEOUT);
}

function cleanupConnection() {
  if (heartbeatTimer) { clearTimeout(heartbeatTimer); heartbeatTimer = null; }
  if (streamReq) {
    try { streamReq.destroy(); } catch {}
    streamReq = null;
  }
  const wasConnected = connected;
  connected = false;
  connecting = false;
  // Resume polling fallback when stream drops
  if (wasConnected) startPolling();
}

function getReconnectDelay() {
  // Exponential backoff: 60s, 120s, 240s, ... capped at 10min
  return Math.min(RECONNECT_BASE * Math.pow(2, Math.min(reconnectAttempts, 6)), RECONNECT_MAX);
}

function connect() {
  if (connected || connecting || permanentlyDisabled) return;

  const token = getBearerToken();
  if (!token) {
    console.warn('⚠️ X Stream: no bearer token — retrying later');
    scheduleReconnect();
    return;
  }

  connecting = true;

  if (streamReq) {
    try { streamReq.destroy(); } catch {}
    streamReq = null;
  }

  const url = new URL(STREAM_URL);
  url.searchParams.set('tweet.fields', 'text,author_id,created_at,in_reply_to_user_id,referenced_tweets,entities');
  url.searchParams.set('expansions', 'author_id,referenced_tweets.id,in_reply_to_user_id');
  url.searchParams.set('user.fields', 'username');

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: { Authorization: `Bearer ${token}` },
  };

  streamReq = https.get(options, (res) => {
    if (res.statusCode === 429) {
      const retryAfter = res.headers['retry-after'];
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        const isTooMany = body.includes('TooManyConnections');
        // Only log TooManyConnections every Nth attempt to reduce spam
        if (!isTooMany || reconnectAttempts % RECONNECT_LOG_EVERY === 0) {
          console.warn(`X Stream: 429 — ${isTooMany ? 'TooManyConnections' : body.slice(0, 200)} (attempt ${reconnectAttempts + 1})`);
        }
        connecting = false;
        if (retryAfter) {
          scheduleReconnect(parseInt(retryAfter) * 1000);
        } else {
          scheduleReconnect();
        }
      });
      return;
    }
    if (res.statusCode === 401) {
      console.error('X Stream: 401 Unauthorized — check bearer token. Disabling.');
      res.resume();
      connecting = false;
      permanentlyDisabled = true;
      return;
    }
    if (res.statusCode === 403) {
      console.error('X Stream: 403 Forbidden — tier does not support filtered stream. Disabling.');
      res.resume();
      connecting = false;
      permanentlyDisabled = true;
      return;
    }
    if (res.statusCode !== 200) {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        console.error(`X Stream: HTTP ${res.statusCode} — ${body.slice(0, 300)}`);
        connecting = false;
        scheduleReconnect();
      });
      return;
    }

    // Successfully connected — stop polling fallback
    connected = true;
    connecting = false;
    reconnectAttempts = 0;
    stopPolling();
    console.log('🔴 X Stream: Connected — listening for @bankrbot tweets (polling stopped)');
    resetHeartbeat(); // start heartbeat monitoring

    let buffer = '';
    res.on('data', (chunk) => {
      resetHeartbeat(); // any data (tweet or heartbeat) resets the timer
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue; // heartbeat
        try {
          const tweet = JSON.parse(line);
          processTweet(tweet);
        } catch {
          // Partial data or non-JSON heartbeat
        }
      }
    });

    res.on('end', () => {
      cleanupConnection();
      console.warn('X Stream: Connection ended');
      scheduleReconnect();
    });

    res.on('error', (err) => {
      cleanupConnection();
      console.error('X Stream error:', err.message);
      scheduleReconnect();
    });
  });

  streamReq.on('error', (err) => {
    cleanupConnection();
    console.error('X Stream request error:', err.message);
    scheduleReconnect();
  });

  // Disable socket timeout for long-lived stream
  streamReq.setTimeout(0);
}

function scheduleReconnect(forceDelay) {
  if (reconnectTimer || permanentlyDisabled) return;
  const delay = forceDelay || getReconnectDelay();
  reconnectAttempts++;
  // Only log reconnect schedule every Nth attempt
  if (reconnectAttempts <= 3 || reconnectAttempts % RECONNECT_LOG_EVERY === 0) {
    console.log(`X Stream: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`);
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function processTweet(data, source = 'stream') {
  const tweet = data.data;
  if (!tweet) return;

  // Dedup: skip if we've already processed this tweet (from stream or poll)
  if (tweet.id && seenTweetIds.has(tweet.id)) return;
  if (tweet.id) {
    seenTweetIds.add(tweet.id);
    // Trim seen set to prevent unbounded growth
    if (seenTweetIds.size > SEEN_IDS_MAX) {
      const excess = seenTweetIds.size - SEEN_IDS_MAX;
      const iter = seenTweetIds.values();
      for (let i = 0; i < excess; i++) { seenTweetIds.delete(iter.next().value); }
    }
  }

  totalTweetsReceived++;
  const text = tweet.text || '';

  // Build user id→username lookup
  const users = {};
  for (const u of (data.includes?.users || [])) {
    users[u.id] = u.username;
  }

  const postAuthor = users[tweet.author_id] ? `@${users[tweet.author_id]}` : '';
  const icon = source === 'poll' ? '🔍' : '📡';
  console.log(`${icon} X ${source} [${totalTweetsReceived}] from ${postAuthor}: ${text.slice(0, 140)}`);

  // Store raw tweet in activity buffer
  activityBuffer.unshift({
    id: tweet.id,
    text,
    author: postAuthor,
    timestamp: tweet.created_at || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  });
  if (activityBuffer.length > ACTIVITY_BUFFER_MAX) activityBuffer.length = ACTIVITY_BUFFER_MAX;

  const launch = parseBankrTweet(text, postAuthor, tweet, users);
  if (launch && onLaunchDetected) {
    onLaunchDetected([launch]);
  }
}

function parseBankrTweet(text, postAuthor, tweet, users) {
  const lower = text.toLowerCase();

  // Action type
  let actionType = 'other';
  if (lower.includes('launch') || lower.includes('deploy') || lower.includes('creat')) {
    actionType = 'launch';
  } else if (lower.includes('fee') && lower.includes('claim')) {
    actionType = 'fee_claim';
  } else if (lower.includes('airdrop')) {
    actionType = 'airdrop';
  }

  // Contract address (0x + 40 hex chars)
  const addrMatch = text.match(/0x[a-fA-F0-9]{40}/);
  const contractAddress = addrMatch ? addrMatch[0] : '';

  // Token symbol ($TICKER)
  const tickerMatch = text.match(/\$([A-Z0-9]{1,12})/);
  const tokenSymbol = tickerMatch ? tickerMatch[1] : '';

  // Requesting @handle — first mention that isn't bankr/deployer/clanker
  let requestedBy = '';
  const mentions = text.match(/@(\w+)/g) || [];
  for (const m of mentions) {
    const h = m.toLowerCase();
    if (!h.includes('bankr') && !h.includes('deployer') && !h.includes('clanker')) {
      requestedBy = m;
      break;
    }
  }

  // Fallback: check in_reply_to for the requesting user
  if (!requestedBy && tweet.in_reply_to_user_id && users[tweet.in_reply_to_user_id]) {
    requestedBy = `@${users[tweet.in_reply_to_user_id]}`;
  }

  const tokenName = tokenSymbol || 'Unknown';

  return {
    actionType,
    tokenName,
    tokenSymbol,
    contractAddress,
    announcement: text.slice(0, 280),
    requestedBy,
    chain: 'base',
    timestamp: tweet.created_at || new Date().toISOString(),
    postAuthor,
    sentimentStatus: 'pending',
    communityReaction: 'neutral',
    reactionNote: '',
  };
}

// ── Search polling fallback ────────────────────────────────────────────
// Polls /2/tweets/search/recent for @bankrbot when stream is disconnected
function startPolling() {
  if (pollActive || permanentlyDisabled) return;
  pollActive = true;
  console.log(`🔍 X Poll: Starting search fallback (every ${POLL_INTERVAL / 1000}s)`);
  // First poll immediately
  searchPoll();
  pollTimer = setInterval(searchPoll, POLL_INTERVAL);
}

function stopPolling() {
  if (!pollActive) return;
  pollActive = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  console.log('🔍 X Poll: Stopped (stream connected)');
}

async function searchPoll() {
  const token = getBearerToken();
  if (!token) return;

  try {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('query', '@bankrbot OR from:bankrbot');
    url.searchParams.set('tweet.fields', 'text,author_id,created_at,in_reply_to_user_id,referenced_tweets,entities');
    url.searchParams.set('expansions', 'author_id,referenced_tweets.id,in_reply_to_user_id');
    url.searchParams.set('user.fields', 'username');
    url.searchParams.set('max_results', '10');
    if (pollSinceId) url.searchParams.set('since_id', pollSinceId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      console.warn(`🔍 X Poll: 429 rate limited${retryAfter ? ` — retry in ${retryAfter}s` : ''}`);
      return;
    }
    if (res.status === 401 || res.status === 403) {
      console.error(`🔍 X Poll: ${res.status} — disabling search fallback`);
      stopPolling();
      return;
    }
    if (res.status !== 200) {
      return; // silent fail, will retry next interval
    }

    const data = await res.json();
    const tweets = data.data || [];
    const meta = data.meta || {};
    const includes = data.includes || {};

    // Update since_id for next poll
    if (meta.newest_id) pollSinceId = meta.newest_id;

    if (tweets.length === 0) return;

    let newCount = 0;
    for (const tweet of tweets) {
      // Process each tweet through the same pipeline as stream
      const tweetData = { data: tweet, includes };
      if (!seenTweetIds.has(tweet.id)) {
        processTweet(tweetData, 'poll');
        newCount++;
      }
    }
    if (newCount > 0) {
      totalPollHits += newCount;
      console.log(`🔍 X Poll: ${newCount} new tweet(s) found (${totalPollHits} total from polls)`);
    }
  } catch (err) {
    // Silent retry on network errors
    if (err.code !== 'ECONNRESET') {
      console.error('🔍 X Poll error:', err.message);
    }
  }
}

function getStatus() {
  return {
    connected,
    connecting,
    permanentlyDisabled,
    reconnectAttempts,
    totalTweetsReceived,
    pollActive,
    totalPollHits,
    uptimeMs: startedAt ? Date.now() - startedAt : 0,
  };
}

function disconnect() {
  cleanupConnection();
  stopPolling();
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function getActivity() { return activityBuffer; }

module.exports = { init, getStatus, getActivity, disconnect };
