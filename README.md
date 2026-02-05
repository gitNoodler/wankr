# Wankr

Agent Box (Flask + xAI/Grok) and CLI roast bot. No raw xAI keys in the repo; use Infisical.

## Social analysis engine

Wankr uses a KOL database and scoring engine to detect fake/botted engagement. High positive sentiment + high bots = maximum deception (roast priority 8–10).

- **Spec**: See [WANKR_SPEC.md](WANKR_SPEC.md) for formulas, bot level system, and upgrade roadmap.
- **analyze_account(handle)**: Returns final authenticity score (0–10), bot icon, roast priority, verdict, and notes. Optional `replies` list enables Phase 1 reply quality + entropy.
- **Phase 1**: Reply quality ratio (% replies with ≥6 words, not emoji spam) and reply entropy; both feed into the final score.

## Running with Infisical

### One-time setup (do this once)

Inside `c:\Users\legro\Wankr` run:

```bat
infisical login
```

(If the command is not found, use the full path:  
`"%LOCALAPPDATA%\Microsoft\WinGet\Packages\infisical.infisical_Microsoft.Winget.Source_8wekyb3d8bbwe\infisical.exe" login`)

Then:

```bat
infisical init
```

Pick your Org and your Project. This creates `.infisical.json` (project binding; currently in `.gitignore`—remove it from `.gitignore` if you want to commit and share project binding).

After that, double-click `run_with_infisical.bat` or run:

```bat
infisical run --env=dev -- python app.py
```

### Skip init (optional)

Set an environment variable before running the batch file:

```bat
set INFISICAL_PROJECT_ID=proj_abc123xyz
run_with_infisical.bat
```

(Use your project ID from the Infisical dashboard URL.)

---

**Option 1 — Fastest (no code changes)**  
Store `XAI_API_KEY` and `XAI_BASE_URL=https://api.x.ai/v1` in Infisical (Development). Then:

```bash
infisical run --env=dev -- python app.py
```

Optional for CLI: `infisical run --env=dev -- python wankr_bot.py`

**Option 2 — Machine Identity only in .env**  
Put only Infisical Machine Identity credentials in `.env` (`INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, optional `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT`). The app fetches xAI secrets from Infisical at startup. See `.env.example`.

## Dashboard (React + Vite)

The dashboard UI is a **React + Vite** app in `frontend/`. Same neon-green theme; chat, archive, and training work the same. **You must build the frontend or run the Vite dev server** to use React; otherwise Flask falls back to the legacy `index.html` (vanilla JS) at the repo root.

**Development (recommended):** Run Flask and the Vite dev server. Vite proxies `/api` and `/static` to Flask.

```bash
# Terminal 1: Flask
infisical run --env=dev -- python app.py

# Terminal 2: React dev server
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** for the React dashboard. Flask runs on port 5000.

**Production:** Build the frontend and run Flask only. Flask serves the built app and API.

```bash
cd frontend && npm install && npm run build
cd .. && infisical run --env=dev -- python app.py
```

Open **http://127.0.0.1:5000** to use the built dashboard.

## Secure proxy (optional)

For zero keys in the browser, run the Node proxy (key from Infisical) then Flask:

```bash
cd wankr-backend && node server.js
python app.py
```

See `wankr-backend/README.md`.
