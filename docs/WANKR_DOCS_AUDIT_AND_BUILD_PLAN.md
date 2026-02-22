# Wankr Project — Documentation Audit & Fresh Build Plan

**Date:** February 22, 2026  
**Author:** Claude (Engineering Lead) + gitNoodler

---

## Part 1: Documentation Audit

Full review of all 23 project knowledge files. Issues categorized as **Critical** (wrong/contradictory info), **Stale** (outdated references), or **Style** (formatting/overlap).

---

### Issues Found

#### 1. TEST_CHECK_RESULTS.md — STALE

The "Deployed sites" table references the **Worker URL** (`https://wankr.scarab-protocol.workers.dev`) as a fallback. Workers are deprecated — the tunnel is the production path. The Config section also references `wrangler.toml` Worker setup.

**Fix:** Rewrite to reflect tunnel-based deployment. Remove all Worker references.

#### 2. CLOUDFLARE_SETUP.md — STALE / OVERLAP

This entire doc is marked deprecated at the top ("use CLOUDFLARE_TUNNEL_SETUP.md"), but it's still in project knowledge and could confuse AI assistants or new context windows. It overlaps with `CLOUDFLARE_TUNNEL_SETUP.md` and `CLOUDFLARE_CONFIG_CHECKLIST.md`.

**Fix:** Either remove from project knowledge entirely, or rename to `CLOUDFLARE_WORKERS_DEPRECATED.md` with a single-line redirect at top.

#### 3. DEPLOYMENT_REVIEW.md — BROKEN REFERENCES

The References section links to:
- `WANKRBOT_NEXT_STEPS.md` — **does not exist** in project files
- `GET_WANKRBOT_ONLINE.md` — **does not exist** in project files

**Fix:** Remove dead links. Replace with references to docs that do exist (`CLOUDFLARE_CONFIG_CHECKLIST.md`, `CONNECTIONS.md`).

#### 4. CHECKPOINT_PROPORTIONS.md — STALE REFERENCE

Under "Make online identical to 5173", Option 2 mentions: "Workers (wrangler): From frontend/: npm run deploy". Workers are deprecated.

**Fix:** Remove the Workers deployment option. Keep only tunnel+backend path.

#### 5. Title/Scope Overlap — STYLE

Three Cloudflare docs cover heavily overlapping ground:
- `CLOUDFLARE_SETUP.md` — deprecated Workers setup
- `CLOUDFLARE_TUNNEL_SETUP.md` — full tunnel setup + troubleshooting
- `CLOUDFLARE_CONFIG_CHECKLIST.md` — quick-reference checklist for tunnel

The tunnel setup doc (197 lines) and the config checklist (99 lines) duplicate the same troubleshooting for Error 1033, 405, and DNS cleanup. Someone reading both gets the same steps twice.

**Fix:** Keep `CLOUDFLARE_TUNNEL_SETUP.md` as the comprehensive reference. Keep `CLOUDFLARE_CONFIG_CHECKLIST.md` as the quick-action checklist but remove the duplicate troubleshooting sections (reference the tunnel doc instead). Archive or remove `CLOUDFLARE_SETUP.md`.

#### 6. ARCHITECTURE.md + WANKR_NETWORK_AND_STORAGE.md — MINOR OVERLAP

Both contain system overview sections and mermaid architecture diagrams. `ARCHITECTURE.md` focuses on fail points and component connections. `WANKR_NETWORK_AND_STORAGE.md` focuses on storage layout and data flow. These are **complementary**, not duplicative — no action needed, but a cross-reference line at the top of each would help.

#### 7. CORRECTIONS_MANIFEST.md — CLEAN ✅

No issues. Good record of what was fixed.

#### 8. CONNECTIONS.md — CLEAN ✅

Well-structured step-by-step verification guide. No issues.

#### 9. All PDFs — CLEAN ✅

Per the corrections manifest, all PDFs were rebuilt as real PDFs with typos fixed. No action needed.

#### 10. wankr_budget_dashboard.jsx — CLEAN ✅

React component for budget visualization. No formatting issues.

#### 11. wankr_v1_Persona_Intro_-_10of10score.txt — CLEAN ✅

Intentional persona voice. No changes needed.

---

### Audit Summary

| File | Status | Action |
|------|--------|--------|
| ARCHITECTURE.md | ✅ Clean | Add cross-ref to NETWORK_AND_STORAGE |
| CHECKPOINT_PROPORTIONS.md | ⚠️ Stale | Remove Workers deploy reference |
| CLOUDFLARE_CONFIG_CHECKLIST.md | ⚠️ Overlap | Remove duplicate troubleshooting, reference tunnel doc |
| CLOUDFLARE_SETUP.md | ❌ Stale | Remove or archive — deprecated Workers path |
| CLOUDFLARE_TUNNEL_SETUP.md | ✅ Clean | Canonical tunnel reference |
| CONNECTIONS.md | ✅ Clean | No changes |
| CORRECTIONS_MANIFEST.md | ✅ Clean | No changes |
| DEPLOYMENT_REVIEW.md | ❌ Broken refs | Fix dead links to nonexistent docs |
| TEST_CHECK_RESULTS.md | ❌ Stale | Rewrite for tunnel-based deployment |
| WANKR_NETWORK_AND_STORAGE.md | ✅ Clean | Add cross-ref to ARCHITECTURE |
| wankr_budget_dashboard.jsx | ✅ Clean | No changes |
| All 10 PDFs | ✅ Clean | Already corrected per manifest |
| Persona text | ✅ Clean | Intentional voice |

**Total: 5 files need fixes, 0 critical data errors, 0 formatting corruption.**

---

## Part 2: Current Stack Inventory

Before the build plan, here's exactly what we have working and what needs work.

### Infrastructure — What Exists

| Component | Status | Location |
|-----------|--------|----------|
| Domain | ✅ Registered | wankrbot.com (Cloudflare DNS) |
| Cloudflare Tunnel | ⛔ DOWN | Zero Trust dashboard — needs connector running |
| Railway Backend | ⚠️ Unknown | Project `7c84db60...` — needs status check |
| GitHub Repo | ✅ Active | gitNoodler/wankr (multiple branches) |
| Infisical | ✅ Configured | GitHub-connected, holds XAI_API_KEY |
| xAI/Grok API | ✅ Key exists | Loaded via Infisical or .env |

### Application Code — What Exists

| Component | Status | Notes |
|-----------|--------|-------|
| React Frontend | ✅ Built | Login, chat, sidebar, spectator, training panel, dev panel |
| Express Backend | ✅ Built | Auth, chat, Grok bot, archives, spectator API, health check |
| Auth System | ⚠️ Fragile | File-based, resets on Railway redeploy (ephemeral FS) |
| Grok Bot Service | ✅ Built | Automated Grok↔Wankr training dialogue |
| Active Chat Service | ✅ Built | Per-user chat storage, 20-chat cap |
| Archive Pipeline | ✅ Built | Archive → annotate → training ingestion |
| Dockerfile | ✅ Multi-stage | Stage 1 builds frontend, stage 2 runs backend |
| Tunnel config | ✅ Exists | `tunnel/Dockerfile` + `run_tunnel.bat` |

### Documentation — What Exists (Post-Audit)

| Document Series | Sections | Coverage |
|-----------------|----------|----------|
| Persona & Guardrailing | v1 (5 PDFs) | Persona intro, influences, focus rules, conversation bounds, hard/soft bounds |
| Grading Pipeline | v2 (2 PDFs) | Annotation rotation, analytical grading + social forensics + ECI |
| Cost Estimation | 2 PDFs | Base cost model (sections 1-10), $100 budget addendum (sections 11-15) |
| Forensic Data Stack | 1 PDF | Tool inventory, API tiers, per-investigation costs, budget revision (sections 16-22) |
| Public Docs | 1 PDF | Public-facing documentation |
| Architecture & Ops | 7 MDs | Architecture, network/storage, connections, deployment, Cloudflare setup, checkpoints, test results |
| Budget Dashboard | 1 JSX | Interactive 12-month projection component |

### What's NOT Documented Yet

- **Build/deployment runbook** — step-by-step "from zero to live site" (the existing docs assume partial knowledge)
- **Secrets inventory** — which service needs which key, rotation schedule, Infisical setup steps
- **Railway persistent storage** — how to solve the auth wipe problem
- **Branch strategy** — which branches exist, what's merged, what's abandoned
- **Phase 2 features** — crypto data feeds, X integration, forensic analysis pipeline (the PDFs spec it, but no implementation plan exists)

---

## Part 3: Fresh Build Plan

Goal: Get wankrbot.com back online, stabilize the foundation, then build toward the crypto intelligence features documented in the PDFs.

---

### Phase 0: Get Online (Today)

**Objective:** wankrbot.com serves the app again.

| Step | Action | How to Verify |
|------|--------|---------------|
| 0.1 | Check Railway — is the backend deployed and green? | Railway dashboard → service status |
| 0.2 | Check Cloudflare — is the tunnel healthy or down? | Zero Trust → Tunnels → status |
| 0.3 | If tunnel is down: run `run_tunnel.bat` locally with fresh token | `https://wankrbot.com/health` returns 200 |
| 0.4 | If Railway is crashed: check logs, fix, redeploy | Railway logs show no errors |
| 0.5 | Confirm site loads | Visit wankrbot.com, login works, chat works |

**Estimated time:** 30-60 minutes depending on what's broken.

---

### Phase 1: Foundation Hardening (Week 1)

**Objective:** Eliminate the recurring failure modes so the site stays up.

#### 1.1 Railway Tunnel Service (24/7 uptime)

Deploy cloudflared as a **separate Railway service** so the tunnel doesn't die when your PC sleeps.

- Create new service in Railway project using `tunnel/Dockerfile`
- Set `CLOUDFLARE_TUNNEL_TOKEN` as Railway variable
- Update Cloudflare public hostname to point to Railway backend URL
- Remove dependency on `run_tunnel.bat` for production

#### 1.2 Persistent Auth Storage

Railway's filesystem is ephemeral — every deploy wipes `users.json` and `sessions.json`.

Options (pick one):
- **Railway Volume** — attach persistent storage to the backend service ($0.25/GB/month)
- **SQLite on volume** — same as above but more robust than JSON files
- **External DB** — Railway Postgres or Supabase free tier

Recommended: **Railway Volume** (simplest, no code change, just mount at `/data` and point authService there).

#### 1.3 Branch Cleanup

- Audit all branches in gitNoodler/wankr
- Merge or close the `claude/wizardly-shirley` login refactor branch
- Ensure `main` has all latest working code
- Tag a stable release: `v0.1.0-foundation`

#### 1.4 Security Quick Fixes

- Remove hardcoded dev panel password from frontend bundle
- Remove debug HTTP calls to `localhost:7244` in authService
- Verify `.env` is in `.gitignore`
- Confirm no secrets in committed code

---

### Phase 2: Core Bot Intelligence (Weeks 2-3)

**Objective:** Implement the forensic analysis capabilities documented in the PDFs.

#### 2.1 Data Source Integration (from Forensic Data Stack doc, sections 16-20)

Priority order based on cost (free first):

| Priority | Source | What It Gives Wankr | Cost |
|----------|--------|---------------------|------|
| 1 | DexScreener API | Token prices, pairs, volume, liquidity | Free |
| 2 | GoPlus Security API | Contract audits, honeypot detection, mint authority checks | Free |
| 3 | DeFiLlama API | TVL, protocol data, yield context | Free |
| 4 | Basescan V2 API | On-chain tx forensics, wallet tracing | Free (keyed) |
| 5 | Grok X Search | Social sentiment, KOL tracking, real-time crypto X posts | ~$2.50/1K searches |
| 6 | TweetAPI | Historical tweet data, engagement metrics | $17/month |

Implementation approach:
- Create `wankr-backend/services/dataSourceService.js` — unified interface for all external APIs
- Each source gets its own adapter module in `wankr-backend/services/dataSources/`
- Cache responses (in-memory + file-based) per the cost model ($0.17 cold → $0.05 warm)
- Register all new API keys in Infisical

#### 2.2 Analysis Pipeline (from Grading docs, v2)

- Implement the dual-axis scoring system (Technical Analysis + Social Forensics)
- Build the scenario classification matrix (A/B/C/D)
- Implement the Engagement Cliff Index (ECI) bot detection formula
- Wire Grok bot training to use real analysis outputs

#### 2.3 Secrets Inventory Dashboard

Create a `/api/secrets/status` endpoint that reports:
- Which services have their required keys configured
- Which keys are missing
- Last-loaded timestamp (not values, just metadata)

---

### Phase 3: External Integrations (Weeks 4-5)

**Objective:** Connect the remaining tools in your stack.

| Integration | Purpose | Priority |
|-------------|---------|----------|
| X Crypto Feeds | Real-time token mentions, KOL posts | High |
| X Follower Stats | Engagement analysis for ECI | High |
| Reddit API | r/cryptocurrency sentiment, project shill detection | Medium |
| Apify Scrapers | GMGN wallet tracking, X data backup | Medium |
| Arkham Intelligence | Wallet labeling, whale tracking | Low (manual initially) |
| Dune Analytics | Custom SQL queries on-chain | Low (manual initially) |

#### 3.1 Template Dev Tool (from your preferences)

Build the three-view dashboard:
- **Flow Map**: Interactive network diagram of all service connections (Mermaid or D3)
- **UI Dev Panel**: Already partially built (WankingLive dev panel) — clean up and formalize
- **Keys & Ops**: Secrets inventory + primary metrics + error rates

---

### Phase 4: Training & Refinement (Ongoing)

Per the budget projections in the dashboard JSX:
- **Months 1-2**: Heavy training phase, Grok bot running 5+ exchanges/day
- **Month 3**: Diminishing returns cliff, reduce training spend
- **Month 6**: Maintenance mode, spot-checks only
- **Month 9**: Self-sustaining, ~$20/month for API costs

---

## Immediate Next Steps (Your Action Items)

1. **Right now:** Check Railway dashboard and Cloudflare Zero Trust — tell me what status you see for both
2. **Right now:** Run `run_tunnel.bat` if the tunnel is down (get the site back up)
3. **Today:** I'll fix the 5 docs with issues and produce cleaned versions
4. **This week:** We execute Phase 1 (tunnel service, persistent auth, branch cleanup, security fixes)

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 22, 2026 | Initial audit + build plan |
