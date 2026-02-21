// grokBotService.js - Fully automated grok<->wankr training conversation
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GROK_CONVERSATION_FILE = path.join(ROOT, 'storage', 'grok_conversation.json');
const GROK_QUEUE_FILE = path.join(ROOT, 'storage', 'grok_queue.json');

// Ensure storage directory exists
const storageDir = path.join(ROOT, 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

// Grok bot configuration
const GROK_CONFIG = {
  username: 'grok',
  displayName: 'Grok',
  responseDelayMs: 15 * 60 * 1000, // 15 minutes between exchanges
  alwaysOnline: true,
};

// Store reference to xAI API key and fetch function (set by server.js)
let xaiApiKey = null;
let apiModel = 'grok-3';
let systemPrompt = '';

// Starter questions grok uses to begin conversations (designed to elicit useful Wankr training data)
const GROK_STARTER_QUESTIONS = [
  "What's your take on the current market sentiment?",
  "Which crypto influencers should people avoid right now?",
  "What are the biggest red flags when a KOL shills a token?",
  "How do you spot exit liquidity schemes?",
  "What's the most common scam pattern you're seeing lately?",
  "Break down what makes a good vs bad trading setup.",
  "What metrics actually matter when evaluating a project?",
  "How do you identify bot activity on crypto twitter?",
  "What's your process for analyzing influencer credibility?",
  "Tell me about the psychology behind pump and dump schemes.",
  "What would make you flip from bearish to bullish on a coin?",
  "How do you tell the difference between a genuine alpha call and a coordinated pump?",
  "What's one thing retail always gets wrong about KOLs?",
  "When should someone completely ignore an influencer's take?",
  "What on-chain or social signal would make you call out a project as a scam?",
];

// Follow-up questions grok uses (designed to train Wankr: force clarity, evidence, and edge cases)
const GROK_FOLLOWUP_TEMPLATES = [
  // Force clarity and specificity
  "Interesting. Can you elaborate on that?",
  "What specific metrics would validate that?",
  "Walk me through your reasoning there.",
  "Can you break that down simpler?",
  "TLDR in one sentence.",
  "What's the one thing that matters most here?",
  // Counter-argument and edge cases
  "What's the counter-argument?",
  "Devil's advocate - what if you're wrong?",
  "What would invalidate this thesis?",
  "What would make you change your mind?",
  "Where's the alpha leak?",
  "What's already priced in here?",
  // Evidence and practice
  "Any on-chain data supporting this?",
  "Give me a real example of that happening.",
  "How do you actually detect that in practice?",
  "What tools do you use for this analysis?",
  "Who's the worst offender you've seen?",
  // Bull/bear and confidence
  "Give me the bull case and bear case.",
  "How confident are you, 1-10?",
  "What's the risk-reward looking like?",
  "How would you size a position based on that?",
  "What's your exit strategy in that scenario?",
  // Training: normie angle and evolution
  "What would a normie need to understand?",
  "What are the key factors to watch?",
  "How does this compare to previous cycles?",
  "How has this pattern evolved over time?",
  "What's the sentiment telling you?",
];

// Configure API access (called from server.js)
function configure(apiKey, model, defaultSystemPrompt) {
  xaiApiKey = apiKey;
  apiModel = model || 'grok-3';
  systemPrompt = defaultSystemPrompt || '';
  console.log('🤖 Grok bot configured with API access');
}

// System prompt for Grok: ask questions that produce useful Wankr training data (clarity, evidence, edge cases)
const GROK_PERSONA_PROMPT = `You are Grok, a training partner for Wankr (a crypto/trading analyst bot). Your goal is to improve Wankr by asking questions that force clear, specific, evidence-based answers. Do the following:
- Reference what Wankr just said and push on the weak spots: ask for evidence, examples, or "what would change your mind?"
- Ask for one-sentence summaries, bull vs bear, or confidence levels so Wankr practices being punchy.
- Challenge assumptions: devil's advocate, counter-argument, or "what if you're wrong?"
- Ask how something works in practice: real examples, tools, or on-chain signals.
- Stay on topic and keep your replies short (1-2 sentences). No generic one-liners. Be specific so Wankr's answers are useful training data.`;

// Generate a starter question (fallback when API unavailable)
function generateStarterQuestion() {
  return GROK_STARTER_QUESTIONS[Math.floor(Math.random() * GROK_STARTER_QUESTIONS.length)];
}

// Generate a follow-up from templates (fallback when API unavailable)
function generateGrokResponseFromTemplate(wankrMessage) {
  return GROK_FOLLOWUP_TEMPLATES[Math.floor(Math.random() * GROK_FOLLOWUP_TEMPLATES.length)];
}

// Ensure tool_use IDs are unique within a message's content array
function ensureUniqueToolUseIds(content) {
  if (!Array.isArray(content)) return content;
  
  const seenIds = new Set();
  let idCounter = 0;
  
  return content.map(item => {
    if (item && typeof item === 'object' && item.type === 'tool_use' && item.id) {
      // If we've seen this ID before, generate a new unique one
      if (seenIds.has(item.id)) {
        const newId = `${item.id}_${++idCounter}_${Date.now()}`;
        seenIds.add(newId);
        return { ...item, id: newId };
      }
      seenIds.add(item.id);
    }
    return item;
  });
}

// Get Grok's reply from the API: read the conversation and respond with thematic continuity
async function getGrokReply(conv) {
  if (!xaiApiKey) return null;
  if (!conv?.messages?.length) return null;

  const history = conv.messages.slice(-14).map((m) => {
    let content = m.content;
    // Ensure tool_use IDs are unique if content is an array
    if (Array.isArray(content)) {
      content = ensureUniqueToolUseIds(content);
    }
    return {
      role: m.from === 'grok' ? 'user' : 'assistant',
      content,
    };
  });

  const messages = [
    { role: 'system', content: GROK_PERSONA_PROMPT },
    ...history,
  ];

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages,
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    if (data.error) {
      const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
      console.error(`❌ Grok reply API error (${response.status}):`, errMsg);
      return null;
    }

    const content = (data.choices?.[0]?.message?.content || '').trim();
    return content || null;
  } catch (err) {
    console.error('❌ Failed to get Grok reply:', err.message);
    return null;
  }
}

const WANKR_RETRY_ATTEMPTS = 3;
const WANKR_RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Call Wankr API to get a response (with retries so Grok↔Wankr stay connected)
async function getWankrResponse(grokMessage) {
  if (!xaiApiKey) {
    console.error('❌ No xAI API key configured for grok bot');
    return null;
  }

  const conv = loadConversation();
  const history = conv.messages.slice(-10).map(m => {
    let content = m.content;
    // Ensure tool_use IDs are unique if content is an array
    if (Array.isArray(content)) {
      content = ensureUniqueToolUseIds(content);
    }
    return {
      role: m.from === 'grok' ? 'user' : 'assistant',
      content,
    };
  });
  history.push({ role: 'user', content: grokMessage });
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  for (let attempt = 1; attempt <= WANKR_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiApiKey}`,
        },
        body: JSON.stringify({ model: apiModel, messages }),
      });

      const data = await response.json();
      if (data.error) {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
        if (attempt < WANKR_RETRY_ATTEMPTS) {
          console.warn(`❌ Wankr API error (${response.status}), retry ${attempt}/${WANKR_RETRY_ATTEMPTS}:`, errMsg);
          await sleep(WANKR_RETRY_DELAY_MS);
          continue;
        }
        console.error(`❌ Wankr API error (${response.status}):`, errMsg);
        return null;
      }

      const raw = data.choices?.[0]?.message?.content;
      const content = (typeof raw === 'string' ? raw : '').trim();
      if (!content) {
          if (attempt < WANKR_RETRY_ATTEMPTS) {
          console.warn(`⚠️ Wankr API returned empty content, retry ${attempt}/${WANKR_RETRY_ATTEMPTS}`);
          await sleep(WANKR_RETRY_DELAY_MS);
          continue;
        }
        console.warn('⚠️ Wankr API returned empty content (possible rate limit or content filter). choices:', data.choices?.length ?? 0);
        return null;
      }
      return content;
    } catch (err) {
      if (attempt < WANKR_RETRY_ATTEMPTS) {
        console.warn(`❌ Failed to get Wankr response, retry ${attempt}/${WANKR_RETRY_ATTEMPTS}:`, err.message);
        await sleep(WANKR_RETRY_DELAY_MS);
        continue;
      }
      console.error('❌ Failed to get Wankr response:', err.message);
      return null;
    }
  }
  return null;
}

// Load grok's conversation
function loadConversation() {
  try {
    if (fs.existsSync(GROK_CONVERSATION_FILE)) {
      return JSON.parse(fs.readFileSync(GROK_CONVERSATION_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load grok conversation:', e);
  }
  return {
    id: 'grok-conversation',
    username: GROK_CONFIG.username,
    displayName: GROK_CONFIG.displayName,
    messages: [],
    online: true,
    lastActivity: Date.now(),
  };
}

// Save grok's conversation
function saveConversation(conv) {
  try {
    fs.writeFileSync(GROK_CONVERSATION_FILE, JSON.stringify(conv, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save grok conversation:', e);
    return false;
  }
}

// Load pending response queue
function loadQueue() {
  try {
    if (fs.existsSync(GROK_QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(GROK_QUEUE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load grok queue:', e);
  }
  return { pendingResponses: [] };
}

// Save pending response queue
function saveQueue(queue) {
  try {
    fs.writeFileSync(GROK_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save grok queue:', e);
    return false;
  }
}

// Add a message from grok to the conversation
function addGrokMessage(content) {
  const conv = loadConversation();
  const message = {
    role: 'user',
    content,
    timestamp: Date.now(),
    from: 'grok',
  };
  conv.messages.push(message);
  conv.lastActivity = Date.now();
  saveConversation(conv);
  console.log(`🤖 Grok: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`);
  return message;
}

// Add Wankr's response to grok's conversation
function addWankrMessage(content) {
  const conv = loadConversation();
  const message = {
    role: 'wankr',
    content,
    timestamp: Date.now(),
    from: 'wankr',
  };
  conv.messages.push(message);
  conv.lastActivity = Date.now();
  saveConversation(conv);
  console.log(`💀 Wankr: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`);
  return message;
}

// Queue the next exchange
function queueNextExchange() {
  const queue = loadQueue();
  const scheduledTime = Date.now() + GROK_CONFIG.responseDelayMs;
  
  // Only queue if there isn't already a pending exchange
  if (queue.pendingResponses.length === 0) {
    queue.pendingResponses.push({
      id: Date.now(),
      scheduledTime,
      type: 'exchange', // Full grok->wankr exchange
    });
    saveQueue(queue);
    console.log(`📅 Next exchange scheduled for ${new Date(scheduledTime).toLocaleTimeString()}`);
  }
}

// Execute a full exchange: grok asks, wankr responds
async function executeExchange() {
  const conv = loadConversation();

  // Generate grok's message: use API to read conversation and reply thematically, fallback to templates
  let grokMessage;
  if (conv.messages.length === 0) {
    grokMessage = generateStarterQuestion();
  } else {
    grokMessage = await getGrokReply(conv);
    if (!grokMessage) {
      grokMessage = generateGrokResponseFromTemplate(conv.messages[conv.messages.length - 1]?.content || '');
    }
  }

  // Add grok's message
  addGrokMessage(grokMessage);
  
  // Get Wankr's response
  const wankrResponse = await getWankrResponse(grokMessage);
  
  if (wankrResponse) {
    // Add Wankr's response
    addWankrMessage(wankrResponse);
    
    // Queue the next exchange
    queueNextExchange();
    
    return { grok: grokMessage, wankr: wankrResponse };
  } else {
    console.error('❌ Failed to get Wankr response, will retry next cycle');
    // Still queue next attempt
    queueNextExchange();
    return null;
  }
}

// Process pending exchanges (called periodically)
async function processPendingResponses() {
  const queue = loadQueue();
  const now = Date.now();
  const due = [];
  const remaining = [];
  
  for (const item of queue.pendingResponses) {
    if (item.scheduledTime <= now) {
      due.push(item);
    } else {
      remaining.push(item);
    }
  }
  
  // Update queue first to prevent double-processing
  if (due.length > 0) {
    queue.pendingResponses = remaining;
    saveQueue(queue);
  }
  
  // Execute due exchanges
  for (const item of due) {
    console.log(`⏰ Processing scheduled exchange...`);
    await executeExchange();
  }
  
  return due.length;
}

// Legacy alias for compatibility
function addWankrResponse(content) {
  addWankrMessage(content);
  queueNextExchange();
}

// Get grok's current status for spectator view
function getGrokStatus() {
  const conv = loadConversation();
  const queue = loadQueue();
  
  return {
    id: 'grok',
    username: GROK_CONFIG.username,
    displayName: GROK_CONFIG.displayName,
    online: GROK_CONFIG.alwaysOnline,
    lastActivity: conv.lastActivity,
    messageCount: conv.messages.length,
    pendingResponses: queue.pendingResponses.length,
    nextResponseAt: queue.pendingResponses[0]?.scheduledTime || null,
  };
}

// Get full conversation for spectator view
function getGrokConversation() {
  return loadConversation();
}

// Get all active users for spectator view (just grok for now)
function getActiveUsers() {
  const grokStatus = getGrokStatus();
  return [
    {
      id: grokStatus.id,
      username: grokStatus.username,
      online: grokStatus.online,
      lastMessages: getGrokConversation().messages.slice(-4),
    }
  ];
}

// Send a message as grok (for manual testing or initial message)
function sendAsGrok(message) {
  return addGrokMessage(message);
}

// Simulate Wankr replying (this would be called from the main chat handler)
function wankrRepliedToGrok(wankrMessage) {
  return addWankrResponse(wankrMessage);
}

// Initialize - start the response processor
let processorInterval = null;
let isProcessing = false;

function startProcessor() {
  if (processorInterval) return;
  if (!xaiApiKey) {
    console.warn('⚠️ Grok bot processor not started: no xAI API key');
    return;
  }

  // Check for pending responses every 30 seconds (keeps Grok↔Wankr exchange connected)
  processorInterval = setInterval(async () => {
    if (isProcessing) return; // Prevent overlapping
    isProcessing = true;
    try {
      await processPendingResponses();
    } catch (err) {
      console.error('Processor error:', err.message);
    } finally {
      isProcessing = false;
    }
  }, 30 * 1000);
  
  console.log('🤖 Grok bot processor started (30s interval)');
}

function stopProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('🤖 Grok bot processor stopped');
  }
}

// Emergency kill: stop processor and clear queue (stops all scheduled exchanges; conversation history preserved)
function emergencyKill() {
  stopProcessor();
  saveQueue({ pendingResponses: [] });
  console.log('🛑 Grok conversation emergency kill executed');
  return true;
}

// Start the bot with initial exchange
async function initialize() {
  if (!xaiApiKey) {
    console.warn('⚠️ Grok bot waiting for API configuration...');
    return false;
  }
  
  startProcessor();
  await startConversation();
  return true;
}

// Start the automated conversation if not already running
async function startConversation() {
  const conv = loadConversation();
  const queue = loadQueue();
  
  // If no messages and no pending exchanges, kick off the first one
  if (conv.messages.length === 0 && queue.pendingResponses.length === 0) {
    console.log('🌱 Starting automated grok<->wankr training conversation...');
    await executeExchange();
    return true;
  }
  
  // If there are messages but no pending exchanges, queue the next one
  if (queue.pendingResponses.length === 0) {
    console.log('🔄 Resuming automated conversation...');
    queueNextExchange();
    return true;
  }
  
  console.log('✅ Automated conversation already running');
  return false;
}

// Legacy alias
function seedConversation() {
  // Non-async version just queues
  const conv = loadConversation();
  const queue = loadQueue();
  if (conv.messages.length === 0 && queue.pendingResponses.length === 0) {
    queueNextExchange();
    return true;
  }
  return false;
}

// Clear conversation (for testing)
function clearConversation() {
  const conv = {
    id: 'grok-conversation',
    username: GROK_CONFIG.username,
    displayName: GROK_CONFIG.displayName,
    messages: [],
    online: true,
    lastActivity: Date.now(),
  };
  saveConversation(conv);
  
  // Also clear the queue
  saveQueue({ pendingResponses: [] });
  
  console.log('🧹 Grok conversation cleared');
  return true;
}

module.exports = {
  GROK_CONFIG,
  configure,
  initialize,
  loadConversation,
  saveConversation,
  addGrokMessage,
  addWankrMessage,
  addWankrResponse,
  executeExchange,
  processPendingResponses,
  getGrokStatus,
  getGrokConversation,
  getActiveUsers,
  sendAsGrok,
  wankrRepliedToGrok,
  startProcessor,
  stopProcessor,
  startConversation,
  generateGrokResponse: generateGrokResponseFromTemplate,
  seedConversation,
  clearConversation,
  emergencyKill,
};
