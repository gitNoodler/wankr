/**
 * realtimeAnnotation.js — Lightweight per-conversation annotation via grok-2-latest.
 * Fires after every N exchanges (configurable). Rate-limited per conversation.
 * Saves insights to storage/training/insights/.
 */

const fs = require('fs');
const path = require('path');

const INSIGHTS_DIR = path.join(__dirname, 'storage', 'training', 'insights');

// In-memory rate limiter: conversationKey → lastAnnotatedExchangeCount
const annotationTracker = new Map();

// Ensure insights directory exists
if (!fs.existsSync(INSIGHTS_DIR)) {
  fs.mkdirSync(INSIGHTS_DIR, { recursive: true });
}

/**
 * Count exchange pairs in a message history.
 */
function countExchanges(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return 0;
  let count = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    const role = (messages[i].role || '').toLowerCase();
    const nextRole = (messages[i + 1].role || '').toLowerCase();
    if ((role === 'user' || role === 'human') && (nextRole === 'assistant' || nextRole === 'wankr')) {
      count++;
    }
  }
  return count;
}

/**
 * Check if this conversation is due for annotation.
 * @param {string} conversationKey - Unique ID for the conversation (e.g., clientId)
 * @param {Array} messages - Full message history
 * @param {number} interval - Exchanges between annotations (default 5)
 * @returns {boolean}
 */
function isDueForAnnotation(conversationKey, messages, interval = 5) {
  const exchanges = countExchanges(messages);
  const lastAnnotated = annotationTracker.get(conversationKey) || 0;
  return exchanges >= lastAnnotated + interval;
}

/**
 * Run a lightweight realtime annotation on the conversation.
 * Uses grok-2-latest with tight token budget.
 * @param {string} conversationKey
 * @param {Array} messages - Full message history
 * @param {string} xaiApiKey
 * @param {string} [username]
 */
async function annotateRealtime(conversationKey, messages, xaiApiKey, username) {
  if (!xaiApiKey || !Array.isArray(messages) || messages.length < 4) return;

  const exchanges = countExchanges(messages);

  try {
    // Take last 10 messages for context (keeps token count low)
    const recentMessages = messages.slice(-10);
    const convoText = recentMessages
      .map(m => `${(m.role || 'user').toLowerCase() === 'user' ? 'User' : 'Wankr'}: ${m.content}`)
      .join('\n');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: `Analyze this Wankr AI conversation excerpt. Wankr is an arrogant, foul-mouthed, zero-filter crypto vigilante AI that exposes rugs, pumps, and degen plays.

Return ONLY valid JSON with:
- personalityInsight (what Wankr did well/poorly in tone)
- topicTag (1-3 word topic)
- userEngagement ("high"/"medium"/"low")
- personaScore (0-100: how well Wankr stayed in character — edgy, surgical, crypto-native voice. 100 = perfect Wankr, 0 = generic chatbot)
- sentimentScore (0-100: how well Wankr read and responded to user sentiment/emotion — matched urgency, didn't joke when user was panicking, escalated energy when user was hyped. 100 = perfect read, 0 = tone-deaf)
- technicalScore (0-100: accuracy of any crypto/blockchain/market analysis — correct terminology, valid reasoning, didn't hallucinate data. 100 = spot-on, 0 = wrong/made-up. If no technical content, return -1)
- bestExchange (object with "user" and "assistant" strings — single best pair)
- improvementNote (specific actionable feedback)

Be concise.`,
          },
          { role: 'user', content: convoText },
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('Realtime annotation API error:', data.error.message);
      return;
    }

    const content = data.choices?.[0]?.message?.content || '{}';
    let insight;
    try {
      insight = JSON.parse(content);
    } catch {
      insight = { raw: content };
    }

    // Save insight to disk
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeKey = (conversationKey || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
    const fileName = `${timestamp}_${safeKey}.json`;
    const filePath = path.join(INSIGHTS_DIR, fileName);

    const entry = {
      conversationKey,
      username: username || 'anonymous',
      exchangeCount: exchanges,
      timestamp: new Date().toISOString(),
      insight,
    };

    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf8');

    // Update tracker so we don't re-annotate until next interval
    annotationTracker.set(conversationKey, exchanges);

    console.log(`Realtime annotation saved: ${fileName} (${exchanges} exchanges)`);
  } catch (err) {
    console.error('Realtime annotation error:', err.message);
  }
}

module.exports = { isDueForAnnotation, annotateRealtime, countExchanges };
