# Step-by-step: Connecting Wankr Components

This guide walks through each connection so you can verify or fix them without changing application logic. Follow in order.

---

## 1. Environment (Backend)

**What connects:** Backend reads `.env` and optional Infisical for `XAI_API_KEY`.

**Where:** Repo root `.env`; backend loads it via `require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })` in [wankr-backend/server.js](wankr-backend/server.js).

**Verify:**
- From repo root, ensure `.env` exists (copy from `.env.example`).
- Either set `XAI_API_KEY=...` in `.env`, or set `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT` so the backend can fetch the key via the Infisical SDK.

**Start backend:**
- **With .env only:** `cd wankr-backend && node server.js` or `npm start`.
- **With Infisical CLI:** `infisical run -- node server.js` or `npm run dev` (nodemon + Infisical).
- **Dev with reload, no Infisical:** `npm run dev:local` (uses .env only).

---

## 2. Frontend → Backend (Development)

**What connects:** React app (Vite on 5173) sends all API requests to the Node backend (5000) via a proxy.

**Where:**
- [frontend/src/config/apiConfig.js](frontend/src/config/apiConfig.js) — `API_BASE` is `''` unless `VITE_API_BASE` is set (same-origin).
- [frontend/src/utils/api.js](frontend/src/utils/api.js) — builds URLs as `API_BASE + endpoint` (e.g. `/api/chat`).
- [frontend/vite.config.js](frontend/vite.config.js) — `proxy: { '/api': { target: 'http://127.0.0.1:5000' } }`.

**Verify:**
1. Start backend first: `cd wankr-backend && node server.js` (or `npm run dev`).
2. Start frontend: `cd frontend && npm run dev`.
3. Open http://localhost:5173 — UI loads. Login or chat should hit `/api/*`; Vite proxies those to 5000.

**If API calls fail:** Ensure nothing else is using port 5000 and that the proxy target in `vite.config.js` is `http://127.0.0.1:5000`.

---

## 3. Backend → Static Frontend (Production)

**What connects:** In production, the same Node process serves the built React app and the API.

**Where:** [wankr-backend/server.js](wankr-backend/server.js):
- `FRONTEND_DIST = path.join(ROOT, 'frontend', 'dist')`
- `app.get('/')` and `app.get('*')` serve `index.html` from `FRONTEND_DIST`
- `app.use('/assets', express.static(...))` and `express.static(FRONTEND_DIST)`

**Verify:**
1. Build frontend: from repo root, `npm run build` (runs `cd frontend && npm run build`).
2. Ensure `frontend/dist` exists and contains `index.html` and `assets/`.
3. Start backend: `cd wankr-backend && node server.js`.
4. Open http://127.0.0.1:5000 — you should see the React app. API calls from the page go to the same origin (`/api/*`).

**Note:** No `VITE_API_BASE` is set in production build, so `API_BASE` stays `''` and all requests are same-origin.

---

## 4. Backend → xAI (Grok)

**What connects:** Backend sends chat and related requests to xAI API using `XAI_API_KEY`.

**Where:** Used in [wankr-backend/server.js](wankr-backend/server.js) and [wankr-backend/grokBotService.js](wankr-backend/grokBotService.js); key is set in `main()` from env or Infisical.

**Verify:** After backend start, console should show either "✅ xAI key from env" or success from Infisical. If you see "⚠️ No xAI key", chat and Grok bot will not work until `XAI_API_KEY` or Infisical is configured.

---

## 5. Backend → File Storage

**What connects:** Auth, chat backup, Grok conversation, and archives use JSON files and directories under repo root and `wankr-backend/storage`.

**Where:** [wankr-backend/server.js](wankr-backend/server.js) defines paths (e.g. `TRAINING_FILE`, `CHAT_BACKUP_FILE`, `FRONTEND_DIST`); [wankr-backend/authService.js](wankr-backend/authService.js) and others read/write them.

**Verify:** No setup required; backend creates files/dirs as needed. Ensure the process has write permission to the repo root and `wankr-backend/storage` (and `logs/` if used).

---

## 6. Health Check (Railway / Deploy)

**What connects:** Railway (or any orchestrator) calls `/health` to check if the app is up.

**Where:**
- [railway.json](railway.json) — `"healthcheckPath": "/health"`
- [wankr-backend/server.js](wankr-backend/server.js) — `app.get('/health', (req, res) => res.status(200).send('ok'))`

**Verify:** With backend running, open http://127.0.0.1:5000/health — response should be `200` with body `ok`.

---

## 7. Docker Build (Production Image)

**What connects:** Dockerfile builds the frontend, then runs the backend with `frontend/dist` and static assets copied in.

**Where:** [Dockerfile](Dockerfile) — stage 1 builds frontend; stage 2 copies `frontend/dist`, `static/`, `images_logo_banner_mascot/`; `CMD ["node", "server.js"]` in `wankr-backend`.

**Verify:** From repo root, ensure `static/` and `images_logo_banner_mascot/` exist (see [Dockerfile](../Dockerfile); e.g. `static/.gitkeep` or real files). Run:
```bash
docker build -t wankr .
docker run -p 5000:5000 -e PORT=5000 -e XAI_API_KEY=yourkey wankr
```
Then open http://localhost:5000 and http://localhost:5000/health.

---

## 8. Cloudflare Tunnel (Production URL)

**What connects:** Tunnel exposes your backend (local or Railway) as `wankrbot.com`. Configuration is in the Cloudflare dashboard, not in repo code.

**Where:** [run_tunnel.bat](run_tunnel.bat) runs `cloudflared tunnel run --token ...`. Token comes from `.env` (`CLOUDFLARE_TUNNEL_TOKEN`) or environment. Public hostname (e.g. wankrbot.com → http://localhost:5000 or Railway URL) is set in Zero Trust → Tunnels.

**Verify:**
1. Set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` (Run token from Cloudflare, not Install token).
2. In Cloudflare, set the tunnel’s public hostname to your backend (e.g. `https://your-app.railway.app` or `http://localhost:5000` for local).
3. Run `run_tunnel.bat` (or `cloudflared tunnel run --token ...`). Visit https://wankrbot.com — you should get the app and `/health` should work.

**Common issues:** See [docs/ARCHITECTURE.md](ARCHITECTURE.md) (Fail Point Details) and [docs/DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md).

---

## Quick checklist

| Step | Connection              | OK when |
|------|-------------------------|--------|
| 1    | Backend ↔ .env/Infisical | Backend starts and logs xAI key source |
| 2    | Frontend ↔ Backend (dev) | UI on 5173 and API calls succeed |
| 3    | Backend ↔ frontend/dist | Opening :5000 shows React app after build |
| 4    | Backend ↔ xAI           | Chat and Grok bot work when key is set |
| 5    | Backend ↔ storage       | No permission errors; files created as needed |
| 6    | Health check            | GET /health returns 200 |
| 7    | Docker                  | Build and run serve app and /health |
| 8    | Tunnel                  | wankrbot.com serves app (if configured) |

All of this preserves existing application code; only configuration and startup order are in scope.
