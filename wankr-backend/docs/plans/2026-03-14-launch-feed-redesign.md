# Launch Feed Redesign: Free xAI Detection + Batched Sentiment

## Overview
Replace the current 5-min Grok x_search polling with a two-layer architecture:
- **Detection**: Free xAI API every 1s — pulls raw launch data (no sentiment)
- **Sentiment**: Paid x_search batch — fires when 10 queued OR 15 min elapsed

## Architecture

```
[1s free xAI poll] → raw launches (sentimentStatus: 'pending') → cache + sentimentQueue
                                                                        ↓
                                                            10 queued OR 15 min
                                                                        ↓
                                                            [1 paid x_search batch]
                                                                        ↓
                                                            sentiment merged → cache updated
                                                                        ↓
                                                            frontend sees 'done' on next poll
```

## Changes

### 1. `cryptoDataTools.js`
- **New** `detectBankrLaunches(xaiApiKey)` — free xAI call, no x_search tool, minimal prompt for raw data only
- **New** `batchSentiment(tokens, xaiApiKey)` — single x_search call for sentiment on N tokens at once
- **Remove** `submitBatchLaunchPoll()`, `collectBatchResults()`, `buildLaunchMessages()`, `BATCH_ID`
- **Keep** `fetchBankrLaunches()` as fallback/reference (may remove later)
- **Keep** `fetchHandleIntel()`, `fetchContractSecurity()`, `fetchTokenInfo()`

### 2. `server.js`
- **New** 1s detection interval: `setInterval(detectNewLaunches, 1000)` with active-user gate
- **New** `sentimentQueue[]` + `lastBatchTime` tracking
- **New** batch trigger check after each detection: `queue.length >= 10 || elapsed >= 15min`
- **New** `fireSentimentBatch()` — calls `batchSentiment()`, merges results, resets queue+timer
- **Remove** `pollGrokLaunches()`, `collectBatchLaunches()`, their intervals
- **Remove** panel-entry sentiment endpoint (batching handles it)
- **Keep** `mergeLaunches()`, `getCachedLaunches()`, `probeNewHandleSentiment()`, active-user gate, handle tracker

### 3. `LaunchFeedPanel.jsx`
- **New** loading spinner where sentiment dot goes when `sentimentStatus === 'pending'`
- **New** chain logo icon on each launch entry
- **Remove** panel-entry sentiment POST on mount
- **Update** footer text from "Powered by Grok x_search" to reflect new architecture

## Launch Object Shape (updated)
```json
{
  "actionType": "launch|fee_claim|airdrop|other",
  "tokenName": "string",
  "tokenSymbol": "string",
  "contractAddress": "0x...",
  "requestedBy": "@handle",
  "chain": "base|solana|ethereum",
  "timestamp": "ISO or relative",
  "postAuthor": "@handle",
  "announcement": "string",
  "sentimentStatus": "pending|done",
  "communityReaction": "positive|negative|mixed|neutral",
  "reactionNote": "string",
  "firstSeen": "ISO",
  "lastSeen": "ISO"
}
```

## Cost Impact
- Detection: ~$0/day (free xAI tier, no x_search)
- Sentiment: ~4 batches/hr × 8hrs = 32 batches/day × ~$0.01 = ~$0.32/day
- vs current: $2-5/day
