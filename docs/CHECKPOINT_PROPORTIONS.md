# Checkpoint: Proportions (Vite → Production)

This doc records the **proportions checkpoint**: layout and scaling rules so the app keeps the same proportions from local Vite dev (e.g. 5173) through `vite build` and when served online (Tunnel + backend or static).

## Viewport and root layout

- **`frontend/index.html`**
  - Viewport meta: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no` so zoom doesn’t break layout.
- **`frontend/src/index.css`**
  - Root chain uses **`100%`** width/height (not `100vw`/`100vh`) on `html`, `body`, `#root` to avoid scrollbar overflow.
  - Min-height: **`100vh`** and **`100dvh`** so mobile (e.g. address bar) doesn’t collapse height.
  - **`overflow: hidden`** on `html` and `body` so no scrollbar and no layout shift.

These keep the same “full viewport” behavior in dev and production.

## Login scene aspect ratio

- **`RobotScene.jsx`**
  - Scene container is sized with **`min(100vw, 100vh * aspectRatio)`** and **`min(100vh, 100vw / aspectRatio)`** so the login scene keeps a fixed aspect ratio and fits in the viewport.
  - All slider-driven layout (scene scale/offset, robot/body/shoulder/hand scales and offsets, panel position/size) uses **percentages and scale factors** so they behave the same in dev and production.

## What to avoid

- Don’t add `100vw`/`100vh` on the root or main app container (use `100%` there).
- Don’t change viewport meta to allow user scaling if we want fixed proportions.
- Keep slider state and API (`/api/settings/dev-defaults`, `/api/settings/dashboard`) in sync so 5000 and 5173 (and production) share the same proportions once loaded.

## Make online identical to 5173

1. **Build once (same code as 5173):**
   - From repo root: `npm run sync-online`  
   - Or from `frontend/`: `npm run clear-cache` then `npm run build`  
   - This produces a fresh `frontend/dist/` with no Vite cache.

2. **Deploy that build:**
   - **Tunnel + backend:** Copy `frontend/dist/` to the server that runs the backend (e.g. rsync, or redeploy so the server has the new dist). Restart the Node process if it caches static files. Backend serves the SPA from the same origin, so no `VITE_API_BASE` needed.
   - **Workers (wrangler):** From `frontend/`: `npm run deploy` (builds and deploys `dist/` to Cloudflare). Set `VITE_API_BASE` to your backend URL if API is on another origin.

3. **Avoid old cache online:** Hard refresh (Ctrl+Shift+R) or devtools → Disable cache when checking. Vite build uses hashed filenames (`index-XXXX.js`), so a new deploy serves new URLs and browsers load the new assets.

- **5173** = local Vite dev (`npm run dev`); **online** = the deployed `dist/` from step 2. Same source, same layout and effects after a fresh build + deploy.
- Current codebase: no center strip, no leg reflection effects (OrbReflection), no central glow (FloorPropagation, GlowPoint*). If online still shows those, redeploy the new dist and hard refresh.

## Git checkpoint

The tag **`checkpoint/proportions`** marks this stack: layout and proportion rules above are in effect, and the app is intended to maintain proportions from Vite dev through build and online deploy.
