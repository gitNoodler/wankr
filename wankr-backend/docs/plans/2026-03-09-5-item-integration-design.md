# 5-Item Integration Design — Real APIs, /api/sus, Webhook, Bounds Gate, Training Gen

**Date:** 2026-03-09
**Status:** Approved

## Context

Pipeline (Classifier → Generator → Validator) is live but running on mock data. Five items to integrate:
1. Replace mock tools with real crypto/social APIs
2. `/api/sus` dedicated KOL probe endpoint
3. Bankr deployer webhook
4. Sentence-level bounds gate
5. Training data generation from KOL database

## 1. cryptoDataTools.js — Real API Integration

Replaces mock functions with live API calls. Hybrid strategy using existing xAI key + free crypto APIs.

| Function | API | Cost | Key |
|---|---|---|---|
| `fetchSocialProfile(handle, xaiApiKey)` | Grok live search (`search_mode: "auto"`) | ~$0.005 | XAI_API_KEY |
| `fetchContractSecurity(address, chain)` | GoPlus (`api.gopluslabs.io`) | FREE | None |
| `fetchTokenInfo(address)` | DexScreener (`api.dexscreener.com`) | FREE | None |
| `fetchContractSource(address)` | Basescan (`api.basescan.org`) | FREE | None |
| `fetchFollowerAnalysis(handle, xaiApiKey)` | Grok live search | ~$0.005 | XAI_API_KEY |

Each returns `{ source: 'live', data }` or falls back to mock `{ source: 'mock', ... }`.

**responsePipeline.js changes:** `gatherData()` calls cryptoDataTools instead of mockDataTools when xaiApiKey available. Pipeline becomes async (`runPipeline` → `async runPipeline`).

## 2. POST /api/sus — KOL Probe Endpoint

```
POST /api/sus
Body: { handle: "@someHandle", token?: "auth_token" }
Response: { handle, classification, voice, kolData, socialProfile, followerAnalysis, pastAnalysis, report }
```

Runs full pipeline: extract → gather (real APIs) → classify → generate via Grok → fire validator async. Returns structured report.

## 3. POST /webhook/bankr — Launch Monitor

```
POST /webhook/bankr
Body: { contractAddress: "0x...", deployer?: "0x...", chain?: "base" }
```

Filters by Bankr deployer `0xf0b5141dd9096254b2ca624dff26024f46087229`. On match: `Promise.all([GoPlus, DexScreener, Basescan])` → ECI calc → store to `storage/pipeline/launch_reports/`. No X posting (future).

## 4. boundsGate.js — Sentence-Level Hard Gate

Runs between Grok reply and `res.json()`. In analysis modes (FULL_*, PARTIAL):
- Strip self-lore/identity sentences
- Strip banned patterns (doxing, self-mythologizing)
- Preserve data-bearing sentences

Returns `{ cleanedReply, removedCount, removals }`. Hard gate — violations removed, not just flagged.

## 5. trainingDataGen.js — Batch Training Generator

For each KOL account: create prompt → run pipeline → generate response → score via validator → store as training pair.

- `generateTrainingBatch(count, xaiApiKey)` — batch generator
- `GET /api/training/generate?count=10` — trigger endpoint
- Output: `storage/training/pipeline_generated/{timestamp}.json`
- Cost: ~$0.06/pair, $3.00 per 50-pair batch

## Cost Per Chat Call

| Component | Cost |
|---|---|
| Classifier | $0.00 |
| Grok live search | ~$0.005 |
| GoPlus + DexScreener + Basescan | $0.00 |
| Grok generator | ~$0.04 |
| Grok validator | ~$0.02 |
| **Total** | **~$0.065** |

## Files to Create

1. `cryptoDataTools.js` — real API wrappers with mock fallback
2. `boundsGate.js` — sentence-level hard gate
3. `trainingDataGen.js` — batch training pair generator

## Files to Modify

4. `responsePipeline.js` — async gatherData, use cryptoDataTools
5. `server.js` — add /api/sus, /webhook/bankr, /api/training/generate, wire boundsGate
