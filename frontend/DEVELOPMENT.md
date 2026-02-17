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

- `npm run dev` – Start dev server (Vite HMR + React Compiler).
- `npm run lint` – Run ESLint (React, Hooks, Compiler, Refresh rules).
- `npm run build` – Production build (React Compiler runs here too).

## Fixing lint

- **react-hooks/set-state-in-effect** – Move synchronous setState out of effects (e.g. do it in an async callback or restructure so you don’t need an effect).
- **react-hooks/purity** – No `Math.random()`, `Date.now()`, or other impure calls during render; use `useMemo`/`useState`/effects so randomness or time are stable per render or updated in a predictable way.
- **react-hooks/exhaustive-deps** – Add missing dependencies to hook arrays or wrap values in `useMemo`/`useCallback` so dependencies stay stable when intended.
- **react-refresh/only-export-components** – Export non-components (constants, helpers) from a separate file so the main file only exports components.

Fixing these keeps the app aligned with the [Rules of React](https://react.dev/reference/rules) and lets the React Compiler optimize safely.
