// xStreamListener.js — X Filtered Stream v2 for real-time bankr launch detection
// Replaces expensive x_search polling ($5/1k calls) with free persistent stream
const https = require('https');
const { URL } = require('url');

let bearerToken = null;
let onLaunchDetected = null;
let streamReq = null;
let reconnectTimer = null;
let connected = false;
let connecting = false;         // guard against overlapping connect() calls
let reconnectAttempts = 0;
let totalTweetsReceived = 0;
let startedAt = null;
let permanentlyDisabled = false; // stop retrying on 401/403

const RULES_URL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const STREAM_URL = 'https://api.twitter.com/2/tweets/search/stream';
const RECONNECT_INTERVAL = 60000; // 60s between retries (safe under 50/15min limit)

// Rule already created in X Developer Console:
// ID: 2032833501901533184 | value: @bankr_official | tag: bankr

async function init(deps) {
  bearerToken = deps.getBearerToken();
  onLaunchDetected = deps.onLaunchDetected;

  if (!bearerToken) {
    console.warn('⚠️ X Stream: no bearer token — stream disabled');
    permanentlyDisabled = true;
    return;
  }

  startedAt = Date.now();

  try {
    await verifyRules();
    connect();
  } catch (err) {
    console.error('X Stream init error:', err.message);
    scheduleReconnect();
  }
}

// Verify streaming rule exists (created manually in X Developer Console)
async function verifyRules() {
  const res = await fetch(RULES_URL, {
    headers: { Authorization: `Bearer ${bearerToken}` },
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
    console.log(`✅ X Stream: ${rules.length} rule(s) active — ${rules.map(r => r.value).join(', ')}`);
  } else {
    console.warn('⚠️ X Stream: No rules found — add rules in X Developer Console');
  }
}

function cleanupConnection() {
  // Destroy any existing connection before opening a new one
  if (streamReq) {
    try { streamReq.destroy(); } catch {}
    streamReq = null;
  }
  connected = false;
  connecting = false;
}

function connect() {
  // Guard: never open two connections
  if (connected || connecting || permanentlyDisabled) return;
  connecting = true;

  // Always clean up before connecting
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
    headers: { Authorization: `Bearer ${bearerToken}` },
  };

  streamReq = https.get(options, (res) => {
    if (res.statusCode === 429) {
      const retryAfter = res.headers['retry-after'];
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        console.warn(`X Stream: 429 — ${body.slice(0, 300)}`);
        connecting = false;
        scheduleReconnect(retryAfter ? parseInt(retryAfter) * 1000 : undefined);
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

    // Successfully connected
    connected = true;
    connecting = false;
    reconnectAttempts = 0;
    console.log('🔴 X Stream: Connected — listening for @bankr_official tweets');

    let buffer = '';
    res.on('data', (chunk) => {
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
  const delay = forceDelay || RECONNECT_INTERVAL;
  reconnectAttempts++;
  console.log(`X Stream: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function processTweet(data) {
  const tweet = data.data;
  if (!tweet) return;

  totalTweetsReceived++;
  const text = tweet.text || '';

  // Build user id→username lookup
  const users = {};
  for (const u of (data.includes?.users || [])) {
    users[u.id] = u.username;
  }

  const postAuthor = users[tweet.author_id] ? `@${users[tweet.author_id]}` : '';
  console.log(`📡 X Stream [${totalTweetsReceived}] from ${postAuthor}: ${text.slice(0, 140)}`);

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

function getStatus() {
  return {
    connected,
    connecting,
    permanentlyDisabled,
    reconnectAttempts,
    totalTweetsReceived,
    uptimeMs: startedAt ? Date.now() - startedAt : 0,
  };
}

function disconnect() {
  cleanupConnection();
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

module.exports = { init, getStatus, disconnect };
