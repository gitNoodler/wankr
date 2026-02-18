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
  responseDelayMs: 5 * 60 * 1000, // 5 minutes between exchanges
  alwaysOnline: true,
};

// Store reference to xAI API key and fetch function (set by server.js)
let xaiApiKey = null;
let apiModel = 'grok-3';
let systemPrompt = '';

// Starter questions grok uses to begin conversations
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
];

// Follow-up questions grok uses based on Wankr's responses
const GROK_FOLLOWUP_TEMPLATES = [
  // Engaging follow-ups
  "Interesting. Can you elaborate on that?",
  "What specific metrics would validate that?",
  "How does this compare to previous cycles?",
  "Walk me through your reasoning there.",
  "What's the counter-argument?",
  
  // Crypto/trading specific
  "What's the risk-reward looking like?",
  "How would you size a position based on that?",
  "What's your exit strategy in that scenario?",
  "Any on-chain data supporting this?",
  "What's the sentiment telling you?",
  
  // Challenging questions
  "Devil's advocate - what if you're wrong?",
  "What would invalidate this thesis?",
  "How confident are you, 1-10?",
  "What's already priced in here?",
  "Where's the alpha leak?",
  
  // Training prompts
  "Can you break that down simpler?",
  "Give me the bull case and bear case.",
  "What would a normie need to understand?",
  "What are the key factors to watch?",
  "TLDR for someone just tuning in?",
  
  // Deeper dives
  "Give me a real example of that happening.",
  "How do you actually detect that in practice?",
  "What tools do you use for this analysis?",
  "Who's the worst offender you've seen?",
  "How has this pattern evolved over time?",
];

// Configure API access (called from server.js)
function configure(apiKey, model, defaultSystemPrompt) {
  xaiApiKey = apiKey;
  apiModel = model || 'grok-3';
  systemPrompt = defaultSystemPrompt || '';
  console.log('🤖 Grok bot configured with API access');
}

// Generate a starter question
function generateStarterQuestion() {
  return GROK_STARTER_QUESTIONS[Math.floor(Math.random() * GROK_STARTER_QUESTIONS.length)];
}

// Generate a follow-up based on conversation context
function generateGrokResponse(wankrMessage) {
  // Pick a random follow-up template
  return GROK_FOLLOWUP_TEMPLATES[Math.floor(Math.random() * GROK_FOLLOWUP_TEMPLATES.length)];
}

// Call Wankr API to get a response
async function getWankrResponse(grokMessage) {
  if (!xaiApiKey) {
    console.error('❌ No xAI API key configured for grok bot');
    return null;
  }
  
  const conv = loadConversation();
  
  // Build message history for context
  const history = conv.messages.slice(-10).map(m => ({
    role: m.from === 'grok' ? 'user' : 'assistant',
    content: m.content,
  }));
  
  // Add current message
  history.push({ role: 'user', content: grokMessage });
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify({ model: apiModel, messages })
    });
    
    const data = await response.json();
    if (data.error) {
      const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
      console.error(`❌ Wankr API error (${response.status}):`, errMsg);
      return null;
    }
    
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('❌ Failed to get Wankr response:', err.message);
    return null;
  }
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
  
  // Generate grok's message based on conversation state
  let grokMessage;
  if (conv.messages.length === 0) {
    // First message - use a starter question
    grokMessage = generateStarterQuestion();
  } else {
    // Follow-up based on previous conversation
    grokMessage = generateGrokResponse(conv.messages[conv.messages.length - 1]?.content || '');
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
  
  // Check for pending responses every 30 seconds
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
  generateGrokResponse,
  seedConversation,
  clearConversation,
};
