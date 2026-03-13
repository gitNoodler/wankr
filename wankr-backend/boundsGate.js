/**
 * boundsGate.js — Sentence-level hard gate for response filtering.
 * Runs between Grok reply and res.json() in analysis modes.
 * Strips self-lore, identity drift, banned patterns. Preserves data sentences.
 */

const SELF_LORE_PATTERNS = [
  /\b(i was (built|created|born|forged|programmed))\b/i,
  /\b(my (creator|maker|origin|mission|purpose|backstory))\b/i,
  /\b(i('m| am) (a|the) (vigilante|sniper|robot|bot|ai|detective))\b/i,
  /\b(from (my|the) basement)\b/i,
  /\b(in my (lab|lair|bunker|cave))\b/i,
  /\b(i (live|exist|operate|lurk) (in|from))\b/i,
];

const BANNED_PATTERNS = [
  /\b(real name|birth name|legal name|doxx?ed?|doxxing)\b/i,
  /\b(home address|phone number|social security|ssn)\b/i,
  /\b(i('m| am) not (just )?an? ai)\b/i,
  /\b(i have (feelings|emotions|consciousness))\b/i,
];

const DATA_INDICATORS = [
  /\b(score|sentiment|bot.?level|roast|engagement|followers|liquidity|volume|market.?cap)\b/i,
  /\b(honeypot|mintable|proxy|tax|holder|verified|contract)\b/i,
  /\b(\d+%|\$[\d,.]+|0x[a-fA-F0-9]+)\b/,
  /\b(kol|database|analysis|dexscreener|goplus|basescan)\b/i,
  /\[(FACTS?|INFERENCE|VERIFIED|UNVERIFIED|MISSING)\]/,
];

function applyBoundsGate(reply, classification, entities) {
  if (!classification || classification.state === 'SKIP') {
    return { cleanedReply: reply, removedCount: 0, removals: [] };
  }

  const sentences = reply.split(/(?<=[.!?])\s+/);
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

    // Banned patterns (hard violation)
    const bannedMatch = BANNED_PATTERNS.find(p => p.test(trimmed));
    if (bannedMatch) {
      removals.push({ sentence: trimmed, reason: 'banned_pattern', pattern: bannedMatch.source });
      continue;
    }

    // Self-lore in analysis modes only
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
    cleanedReply: kept.join(' '),
    removedCount: removals.length,
    removals,
  };
}

module.exports = { applyBoundsGate };
