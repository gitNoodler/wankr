/**
 * mockDataTools.js — Test data generators for the response pipeline.
 * All outputs tagged with source: 'mock' so the pipeline labels them [mock/unverified].
 * Replace with real API integrations later.
 */

const kolAnalysisService = require('./kolAnalysisService');

// ---------- Mock tweet profile ----------
function mockTweetProfile(handle) {
  const h = handle.replace(/^@/, '').toLowerCase();
  const seed = hashCode(h);
  return {
    source: 'mock',
    handle: h,
    bio: `Mock bio for @${h}. Crypto enthusiast. NFA.`,
    verified: seed % 3 === 0,
    createdAt: mockDate(seed),
  };
}

// ---------- Mock tweet timeline ----------
function mockTweetTimeline(handle) {
  const h = handle.replace(/^@/, '').toLowerCase();
  const seed = hashCode(h);
  const templates = [
    'Just aped into $TOKEN — not financial advice but this looks solid',
    'GM frens. Another day another protocol.',
    'Thread on why @relatedHandle is underrated 🧵',
    'Market looking spicy today. Whale wallets moving.',
    'New partnership announcement coming soon 👀',
  ];
  const recentTweets = templates.map((t, i) => ({
    text: t.replace('$TOKEN', `$${h.toUpperCase().slice(0, 4)}`).replace('@relatedHandle', `@mock_${i}`),
    likes: pseudoRandom(seed + i + 10, 5, 5000),
    retweets: pseudoRandom(seed + i + 20, 1, 1500),
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  return { source: 'mock', handle: h, recentTweets };
}

// ---------- Mock posts sentiment ----------
function mockPostsSentiment(handle) {
  const h = handle.replace(/^@/, '').toLowerCase();
  const seed = hashCode(h);
  const sentiments = ['positive', 'negative', 'mixed', 'neutral'];
  const templates = [
    'Just launched something big. Stay tuned.',
    'GM. Building in silence.',
    'This market is wild rn. NFA.',
    'Thread on why this matters 🧵',
    'New collab dropping soon 👀',
    'Ape responsibly frens.',
    'Charts looking interesting today.',
    'Who else is watching this?',
    'Dev update: shipping fast.',
    'Haters gonna hate. We build.',
  ];
  const posts = templates.map((t, i) => {
    const s = pseudoRandom(seed + i + 30, 0, 4);
    return {
      text: t,
      likes: pseudoRandom(seed + i + 40, 2, 3000),
      retweets: pseudoRandom(seed + i + 50, 0, 800),
      replies: pseudoRandom(seed + i + 60, 0, 200),
      replySentiment: sentiments[s % 4],
      sentimentNotes: 'Mock sentiment — no real data.',
    };
  });
  const counts = { positive: 0, negative: 0, mixed: 0, neutral: 0 };
  posts.forEach(p => counts[p.replySentiment]++);
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return {
    source: 'mock',
    handle: h,
    posts,
    overallSentiment: dominant[0],
    sentimentBreakdown: counts,
  };
}

// ---------- Mock Grok X search ----------
function mockGrokXSearch(query) {
  return {
    source: 'mock',
    query,
    results: [
      { title: `Mock result for "${query}"`, snippet: 'No real search data available. This is a placeholder result.', url: '#mock' },
      { title: `Related discussion: ${query}`, snippet: 'Community sentiment appears mixed based on mock data.', url: '#mock' },
    ],
  };
}

// ---------- Mock ECI calculator ----------
function mockECICalc(handle) {
  const h = handle.replace(/^@/, '').toLowerCase();

  // Check KOL database first
  const kolData = kolAnalysisService.analyzeAccount(h);
  if (kolData) {
    return {
      source: 'kol_database',
      handle: h,
      score: kolData.score,
      sentiment: kolData.sentiment,
      botLevel: kolData.botLevel,
      roastPriority: kolData.roastPriority,
      verdict: kolData.verdict,
      category: kolData.category,
    };
  }

  // Fall back to mock
  const seed = hashCode(h);
  return {
    source: 'mock',
    handle: h,
    score: pseudoRandom(seed + 50, 20, 95),
    sentiment: pseudoRandom(seed + 51, 1, 10),
    botLevel: pseudoRandom(seed + 52, 0, 5),
    roastPriority: pseudoRandom(seed + 53, 1, 10),
    verdict: 'unknown',
    category: 'unscored',
  };
}

// ---------- Helpers ----------
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pseudoRandom(seed, min, max) {
  const x = Math.sin(seed) * 10000;
  const norm = x - Math.floor(x);
  return Math.floor(min + norm * (max - min));
}

function mockDate(seed) {
  const daysBack = 100 + (seed % 1500);
  return new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];
}

module.exports = {
  mockTweetProfile,
  mockTweetTimeline,
  mockPostsSentiment,
  mockGrokXSearch,
  mockECICalc,
};
