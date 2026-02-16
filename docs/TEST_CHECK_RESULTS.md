# Test and check results

**Date:** Run after latest deploy.

---

## Build

| Check | Result |
|-------|--------|
| `cd frontend && npm run build` | **Pass** – Vite build completes; `dist/` has index.html and assets. |

---

## Deployed sites

| URL | Result |
|-----|--------|
| **https://wankrbot.com** | **OK** – Serves the app (Wankr Agent Box, DEGEN LOGIN, Spectate). |
| **https://www.wankrbot.com** | Same Worker; should work if DNS is set. |
| **https://wankr.scarab-protocol.workers.dev** | Worker URL from deploy; use if custom domain has issues. |

---

## Config

| Item | Status |
|------|--------|
| `frontend/wrangler.toml` | `name = "wankr"`, assets + SPA fallback, custom domains wankrbot.com / www. |
| `frontend/src/config/apiConfig.js` | Uses `VITE_API_BASE`; empty = same-origin (dev proxy). |
| API calls | All go through `api` helper (App.jsx, useArchive.js, etc.). |

---

## Lint

| Check | Result |
|-------|--------|
| `cd frontend && npm run lint` | **Some errors remain** – See below. |

**Fixed:** App.jsx (unused vars, empty catches, removed impure agent log), EffectsBoundsLayer (`version`), FloorPropagation (`glowPointVersion`, `Date.now` → `performance.now()` in effect).

**Remaining:** ChatPanel.jsx (useEffect deps), EffectsBoundsTool.jsx (empty blocks, export-components), GlowPointDisplay.jsx (empty block, setState-in-effect), GlowPointPropagation.jsx (empty block, setState-in-effect), plus any other files. Run `npm run lint` in `frontend` for full list.

---

## Checklist

- [x] Frontend builds
- [x] wankrbot.com serves the app
- [x] wrangler.toml has Worker + custom domains + SPA
- [x] API uses single base (apiConfig / api helper)
- [ ] Lint clean (optional; fix or relax rules)
