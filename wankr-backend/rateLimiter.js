// Rate limiter: per-IP + per-clientId, no dependencies
const rateLimiter = {
  buckets: new Map(), // key → { tokens, lastRefill, warnings, blocked }
  CONFIG: {
    MAX_TOKENS: 8,          // burst capacity: 8 messages
    REFILL_RATE: 1,         // 1 token per REFILL_INTERVAL
    REFILL_INTERVAL: 8000,  // refill 1 token every 8 seconds (~7.5 msgs/min sustained)
    MIN_MSG_GAP: 2000,      // minimum 2s between messages
    MAX_MSG_LENGTH: 1500,   // max message length (chars)
    SPAM_REPEAT_LIMIT: 3,   // same message 3x in a row = spam
    WARN_THRESHOLD: 3,      // 3 warnings before temp block
    BLOCK_DURATION: 60000,  // 1 minute block after exceeding warnings
    CLEANUP_INTERVAL: 300000, // clean stale buckets every 5 min
  },

  _getBucket(key) {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: this.CONFIG.MAX_TOKENS,
        lastRefill: Date.now(),
        lastMsg: 0,
        lastMsgText: '',
        repeatCount: 0,
        warnings: 0,
        blockedUntil: 0,
      });
    }
    const bucket = this.buckets.get(key);
    // Refill tokens based on elapsed time
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const refills = Math.floor(elapsed / this.CONFIG.REFILL_INTERVAL);
    if (refills > 0) {
      bucket.tokens = Math.min(this.CONFIG.MAX_TOKENS, bucket.tokens + refills * this.CONFIG.REFILL_RATE);
      bucket.lastRefill = now;
    }
    return bucket;
  },

  check(ip, clientId, message) {
    const key = clientId || ip || 'unknown';
    const bucket = this._getBucket(key);
    const now = Date.now();

    // Blocked?
    if (bucket.blockedUntil > now) {
      const secs = Math.ceil((bucket.blockedUntil - now) / 1000);
      return { blocked: true, reason: `rate_blocked`, reply: `You're on timeout for ${secs}s. Maybe go outside, touch some grass, look at a chart. Come back when you've calmed your tits.` };
    }

    // Min gap between messages
    if (now - bucket.lastMsg < this.CONFIG.MIN_MSG_GAP) {
      bucket.warnings++;
      if (bucket.warnings >= this.CONFIG.WARN_THRESHOLD) {
        bucket.blockedUntil = now + this.CONFIG.BLOCK_DURATION;
        return { blocked: true, reason: 'spam_block', reply: `Congrats, you spammed yourself into a 60-second timeout. Wankr doesn't do speed dating. Sit tight.` };
      }
      return { blocked: true, reason: 'too_fast', reply: `Slow down, turbo. I'm not a slot machine — wait a couple seconds between pulls.` };
    }

    // Message length
    if (message.length > this.CONFIG.MAX_MSG_LENGTH) {
      return { blocked: true, reason: 'too_long', reply: `That message is ${message.length} characters. I'm a crypto analyst, not your diary. Keep it under ${this.CONFIG.MAX_MSG_LENGTH}.` };
    }

    // Repeat spam detection
    const normalized = message.toLowerCase().trim();
    if (normalized === bucket.lastMsgText) {
      bucket.repeatCount++;
      if (bucket.repeatCount >= this.CONFIG.SPAM_REPEAT_LIMIT) {
        bucket.warnings++;
        bucket.blockedUntil = now + this.CONFIG.BLOCK_DURATION;
        return { blocked: true, reason: 'repeat_spam', reply: `You sent the same message ${bucket.repeatCount + 1} times. I heard you the first time. Now you get a timeout. Think about what you've done.` };
      }
    } else {
      bucket.repeatCount = 0;
    }

    // Token bucket check
    if (bucket.tokens <= 0) {
      bucket.warnings++;
      if (bucket.warnings >= this.CONFIG.WARN_THRESHOLD) {
        bucket.blockedUntil = now + this.CONFIG.BLOCK_DURATION;
        return { blocked: true, reason: 'rate_exceeded_block', reply: `You blew through your message budget AND kept pushing. 60 seconds in the penalty box. Use it to contemplate your life choices.` };
      }
      return { blocked: true, reason: 'rate_exceeded', reply: `Rate limit hit. You get about 8 messages per minute, chief. Take a breath and try again in a few seconds.` };
    }

    // Consume a token
    bucket.tokens--;
    bucket.lastMsg = now;
    bucket.lastMsgText = normalized;
    // Decay warnings over time (1 warning forgiven per 30s of good behavior)
    if (bucket.warnings > 0 && now - bucket.lastMsg > 30000) bucket.warnings = Math.max(0, bucket.warnings - 1);

    return { blocked: false };
  },
};

// Cleanup stale rate limit buckets periodically
setInterval(() => {
  const cutoff = Date.now() - 600000; // 10 min stale
  for (const [key, bucket] of rateLimiter.buckets) {
    if (bucket.lastMsg < cutoff && bucket.blockedUntil < Date.now()) {
      rateLimiter.buckets.delete(key);
    }
  }
}, rateLimiter.CONFIG.CLEANUP_INTERVAL);

module.exports = rateLimiter;
