# Wankr

Agent Box (Flask + xAI/Grok) and CLI roast bot. No raw xAI keys in the repo; use Infisical.

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

## Secure proxy (optional)

For zero keys in the browser, run the Node proxy (key from Infisical) then Flask:

```bash
cd wankr-backend && node server.js
python app.py
```

See `wankr-backend/README.md`.
