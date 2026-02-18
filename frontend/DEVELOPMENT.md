# React development tools

This project uses the React 19 tooling to keep the app fast and correct.

## What’s enabled

- **React Compiler** (build)  
  Automatic memoization of components and hooks. No need to add `useMemo` / `useCallback` / `React.memo` by hand in most cases; the compiler does it when safe.  
  Configured in `vite.config.js` via `babel-plugin-react-compiler` with `target: '19'`.

- **Strict Mode** (runtime)  
  Wraps the app in `<StrictMode>` so React double-invokes render and effects in development to catch side effects and legacy API use.  
  See `src/main.jsx`.

- **ESLint**
  - **eslint-plugin-react** – Recommended + `jsx-runtime`; React 19.2 in `settings.react.version`.
  - **eslint-plugin-react-hooks** – Rules of Hooks and effect/setState guidance (e.g. no synchronous setState in effects).
  - **eslint-plugin-react-compiler** – Surfaces code the compiler can’t safely optimize (e.g. impure render, `Math.random()` during render).
  - **eslint-plugin-react-refresh** – Fast Refresh: files should export components so HMR works cleanly.

## Commands

- `npm run dev` – Start dev server (Vite HMR + React Compiler). Port 5173; `/api` is proxied to backend (127.0.0.1:5000).

**Backend required:** The API must be running on port 5000 or `/api` requests will fail with `ERR_CONNECTION_REFUSED`. From repo root run `wankr.bat` (starts backend + frontend), or start the backend separately: `cd wankr-backend && npm run dev` (or `npm start`).
- `npm run dev:open` – Same as `dev` but opens the app in the browser.
- `npm run dev:mobile` – Dev server on all interfaces (`--host 0.0.0.0`) and opens browser (for testing on phone/tablet on same network).
- `npm run dev:force` – Start with `--force` (ignore cache) if HMR or stale builds act up; or run `npm run clear-cache` then `npm run dev`.
- `npm run lint` – Run ESLint (React, Hooks, Compiler, Refresh rules).
- `npm run build` – Production build (React Compiler runs here too).
- `npm run test` – Lint then build (run after every update before commit or deploy).

**Test after every update:** From repo root run `npm test` (runs frontend lint + build). From `frontend/` run `npm run test`. Fix any lint errors and ensure the build succeeds.

## Vite dev server: known issues & workarounds

The config already applies some mitigations (pre-bundled deps, `host: 'localhost'` on Windows). If you hit the following, try these:

- **Slow reloads / dev tools freezing** (large app, many requests)  
  Run `npm run clear-cache` then `npm run dev`. If it persists, add more entries to `optimizeDeps.include` in `vite.config.js` for heavy dependencies.

- **Indefinite hang on load** (no error)  
  Restart the dev server and browser; known in some Vite setups with many components/imports.

- **Windows: `ERR_ADDRESS_INVALID` or resource load failure**  
  Default dev uses `host: 'localhost'`. If you use `dev:mobile` (`--host 0.0.0.0`) and see this, use `npm run dev` and test on the same machine, or try accessing via `http://127.0.0.1:5173` instead of `http://0.0.0.0:5173`.

- **Build fails but dev works** (e.g. React hooks “not exported”)  
  Keep React (and related) versions consistent; check `vite.config.js` for aliases that might differ between dev and build.

- **Stale or weird HMR**  
  `npm run dev:force` or `npm run clear-cache` then `npm run dev`.

## Production

Before deploying, run `npm run build`; then serve the `dist/` output (e.g. `npm run preview` to test). In production, React runs in production mode (minified, no dev warnings). Use [React DevTools](https://react.dev/learn/react-developer-tools) to confirm the React icon shows the production (dark) variant. For optimization patterns and profiling, see [react.dev – Optimizing performance](https://react.dev/learn#optimizing-performance).

## Fixing lint

- **react-hooks/set-state-in-effect** – Move synchronous setState out of effects (e.g. do it in an async callback or restructure so you don’t need an effect).
- **react-hooks/purity** – No `Math.random()`, `Date.now()`, or other impure calls during render; use `useMemo`/`useState`/effects so randomness or time are stable per render or updated in a predictable way.
- **react-hooks/exhaustive-deps** – Add missing dependencies to hook arrays or wrap values in `useMemo`/`useCallback` so dependencies stay stable when intended.
- **react-refresh/only-export-components** – Export non-components (constants, helpers) from a separate file so the main file only exports components.

Fixing these keeps the app aligned with the [Rules of React](https://react.dev/reference/rules) and lets the React Compiler optimize safely.
