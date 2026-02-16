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

## Git checkpoint

The tag **`checkpoint/proportions`** marks this stack: layout and proportion rules above are in effect, and the app is intended to maintain proportions from Vite dev through build and online deploy.
