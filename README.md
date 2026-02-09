# Wankr

Agent Box (React + Node.js + xAI/Grok) and CLI roast bot. No raw xAI keys in the repo; use Infisical or .env.

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

After that, set `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID` in `.env`, then run `wankr.bat`.

### Skip init (optional)

Set `INFISICAL_PROJECT_ID` in `.env` (from the Infisical dashboard URL).

---

**Option 1 — Fastest**  
Put `XAI_API_KEY=xai-...` in `.env`, then run `wankr.bat`.

**Option 2 — Infisical Machine Identity**  
Put `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID` in `.env`. The Node backend fetches `XAI_API_KEY` or `grokWankr` from Infisical at startup.

**CLI roast bot (Python):** `infisical run --env=dev -- python wankr_bot.py`

## Dashboard (React + Node.js)

The dashboard is a **React + Vite** frontend with a **Node.js** backend in `wankr-backend/`. Same neon-green theme; chat, archive, and training.

**Development:** Run `wankr.bat` to start the Node API (port 5000) and React dev server (port 5173). Vite proxies `/api` and `/static` to the Node backend.

```bash
# Or manually:
# Terminal 1: Node API
cd wankr-backend && npm install && npm start

# Terminal 2: React
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** for the React dashboard.

**Production:** Build the frontend; the Node backend serves the built app.

```bash
cd frontend && npm install && npm run build
cd ../wankr-backend && npm start
```

Open **http://127.0.0.1:5000**.

**Restart:** Run `wankr.bat` to stop, save chat, and relaunch. Chat is backed up before shutdown and restored when you refresh.
