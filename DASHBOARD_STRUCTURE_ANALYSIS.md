# Scarab-Clean Dashboard — Structure & Tools Analysis

Reference project: `C:\Users\legro\Scarab-Clean\dashboard-dev`.  
This doc summarizes **structure and tooling** so you can build a similar dashboard (e.g. for Wankr) without running Scarab.

---

## 1. Tech stack

| Layer | Technology |
|-------|------------|
| **Runtime** | React 18 |
| **Build** | Vite 5 |
| **Language** | JSX (no TypeScript) |
| **Styling** | Plain CSS files per component (e.g. `ClairvoyancePanel.css`) + global `index.css`, `App.css` |
| **Routing** | **Tab-based in App** (no React Router): `activeTab` state + switch/render by tab name |
| **State** | React `useState` / `useCallback` / `useRef`; **custom hooks** for domain logic |
| **API** | Central `utils/api.js` (fetch wrapper with auth, retry, throttling); **services** call it |

---

## 2. Project structure (high level)

```
dashboard-dev/
├── index.html              # Single entry; <div id="root"/> + script to main.jsx
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx            # createRoot, AppProviders + App, index.css
│   ├── index.css           # Global reset, body, scrollbars
│   ├── App.jsx              # Root: tabs, layout, composition; delegates to hooks/services
│   ├── App.css
│   ├── app/                 # Optional alternate app/layout (some duplication with src/)
│   │   ├── layout/          # Header, Sidebar, Layout, MainPanel
│   │   └── routes.jsx       # Tab → component mapping (alternative to inline in App)
│   ├── components/          # Feature UI
│   │   ├── ClairvoyancePanel/   # Chat-style panel (subcomponents + index.js re-export)
│   │   ├── LogFeed/
│   │   ├── ServerStatus/
│   │   └── ...
│   ├── hooks/               # Domain & UI state logic
│   │   ├── useTabManager.js
│   │   ├── useActivityLog.js
│   │   ├── useClairvoyanceStorage.js
│   │   └── ...
│   ├── services/            # API calls only
│   │   ├── activityLogService.js
│   │   ├── scanService.js
│   │   └── ...
│   ├── config/              # API config (base URL, auth endpoints)
│   │   └── apiConfig.js
│   ├── utils/               # api.js, logging, initialization, pure helpers
│   │   ├── api.js           # fetch wrapper: auth headers, retry, throttle
│   │   └── ...
│   ├── data/                # Static data (e.g. roadmap)
│   └── assets/              # Images (logos, icons)
```

Takeaways for a similar dash:

- **Single App.jsx** owns tab state and layout; no router required for tab UIs.
- **Components** = presentational + minimal local state; **hooks** = stateful logic; **services** = HTTP only.
- **Feature folders** (e.g. `ClairvoyancePanel/`) keep panel + subcomponents + CSS together.

---

## 3. Layout & tabs

- **Chrome**: One **header** (branding + tab buttons + optional tab-specific actions + ServerStatus).
- **Content**: One **content area**; content is chosen by **active tab** (e.g. `scanner` | `clairvoyance` | `backlog` | `logs`).
- **Tab switching**: `useTabManager(initialTab, onTabChange)` returns `{ activeTab, handlers }`. Buttons call `handlers.scanner()`, `handlers.clairvoyance()`, etc. Optional dedupe/cooldown and logging inside the hook.
- **No React Router**: Tabs are not URLs; everything is in-memory state. Add React Router later if you need deep links.

Pattern in App:

```jsx
const { activeTab, handlers: tabHandlers } = useTabManager('clairvoyance', callback)

// In header:
<button className={activeTab === 'clairvoyance' ? 'active' : ''} onClick={tabHandlers.clairvoyance}>Clairvoyance</button>

// In content:
{activeTab === 'scanner' && ( ... )}
{activeTab === 'clairvoyance' && <ClairvoyancePanel />}
{activeTab === 'backlog' && <BacklogPanel />}
```

---

## 4. API layer

- **Single entry**: `utils/api.js` exports `apiRequest`, `api.get`, `api.post`, etc.
- **Base URL**: Central (e.g. `config/apiConfig.js` or constant in `api.js`). Scarab uses `http://localhost:8080`.
- **Auth**: Headers (e.g. `Authorization: Bearer <key>`, `X-API-Key`) added in one place (`getDefaultHeaders()`). Key from env (e.g. `import.meta.env.VITE_*`) or localStorage.
- **Behavior**: Throttling, retry on 429, optional timeout/AbortController, and a small error → event/log layer so the UI can show toasts or activity log.
- **Services**: Each feature that talks to the backend has a **service** (e.g. `activityLogService.js`) that uses `api.get` / `api.post` and returns promises. Components/hooks call services, not `fetch` directly.

For a similar dash: one `api.js` (or axios) + one small config; all backend calls go through that and optional service modules.

---

## 5. Hooks (domain logic)

- **useTabManager**: Tab state + handlers with optional dedupe and logging.
- **useActivityLog**: Fetches/polls activity log; returns `{ logs, clearLogs }`; used at top level in App so the poller never unmounts.
- **useClairvoyanceStorage**: Load/save/archive messages in localStorage; used by ClairvoyancePanel.
- **useClairvoyanceStats**: Stats (e.g. classification counts) with optional reset.
- **useScanManager**: Scanner state (address, status, results) and `startScan`; calls scan service.
- **useServerStatusPolling**, **useProfileLoader**, etc.: Encapsulate polling or one-off load.

Pattern: **App** composes these hooks and passes down only what each panel needs (e.g. `logs`, `addLog`, `scanManager`). No business logic inside presentational components.

---

## 6. Activity / logging

- **Central `addLog(message, level, timestamp?, options)`** in App, with throttling and dedupe (e.g. refs + 100ms throttle, 3s dedupe window) so StrictMode/double-render doesn’t spam.
- **Service**: `writeActivityLog(message, level, options)` in `activityLogService.js` → POST to `/api/activity-log`.
- **Reading**: `useActivityLog` polls GET `/api/activity-log` and provides `logs` to a **LogFeed** (or similar) component.
- Optional: global button click listener that calls `addLog` for audit (with `data-skip-log` to exclude specific buttons).

For a similar dash: one logging service + one hook for “current log stream” + one callback passed down for “write log”.

---

## 7. Component patterns

- **Panels**: Large feature areas (ClairvoyancePanel, BacklogPanel, LogsViewer). Can be a folder with:
  - `PanelName.jsx` (main container),
  - subcomponents (Header, Input, Messages, Settings),
  - `PanelName.css`,
  - `index.js` re-exporting the main component.
- **Shared chrome**: Header (brand + tabs + status), optional Sidebar/MainPanel from `app/layout/` if you use that structure.
- **Modals/overlays**: e.g. QuickEntryPanel; open/close by state in App, rendered as sibling to main content.

---

## 8. Vite config (relevant bits)

- **Port**: e.g. 5174 so it doesn’t clash with another app.
- **Proxy**: If the dashboard and API are on different origins, configure `server.proxy` in Vite to forward e.g. `/api` to the backend (e.g. `http://localhost:8080`). Scarab’s dashboard calls API by full base URL; proxy is optional but recommended for same-origin and CORS simplicity.
- **Build**: Standard Vite build; optional `manualChunks` for react vendor.
- **Env**: Use `import.meta.env.VITE_*` for API base URL or API key if needed.

---

## 9. Checklist for “similar dashboard”

1. **React + Vite** app; single `App.jsx` with tab state (or use `routes.jsx`-style switch).
2. **Tab manager hook** for `activeTab` + tab handlers (optional logging/dedupe).
3. **Layout**: one header (brand + tabs + status), one content area that renders by `activeTab`.
4. **API**: one `api.js` (or equivalent) with base URL, auth headers, retry/throttle; services call it.
5. **Hooks** for each major feature (chat storage, activity log, scanner, etc.); App composes hooks and passes data/callbacks down.
6. **Services** for each backend surface (activity log, scan, classify, etc.).
7. **Styling**: global CSS + per-component CSS; CSS variables for theme (e.g. panel radius, header height).
8. **Optional**: Activity log with `addLog` + `writeActivityLog` + polling hook + LogFeed-style UI.

Wankr already follows many of these (single App, hooks, API module, services, component folders). The main differences from Scarab are: no tab bar (single “chat” view), and a different backend (Flask + xAI). You can add a tab bar and extra panels later using the same tab-manager + layout pattern above.
