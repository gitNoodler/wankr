# Functional Status (Dashboard)

## Verified Working
- Frontend lint/build: `npm run lint` and `npm run build` in `frontend/`.
- Backend health: `GET http://127.0.0.1:5000/api/health` returns 200 when backend is running.
- Static assets served at `http://127.0.0.1:5000/static/`.

## Single Command (Launch/Restart)
- `wankr.bat`
  - Requests chat backup (if backend is up).
  - Cleanly stops ports `5000` (API) and `5173` (UI), then force-kills if still in use.
  - Starts backend first, waits for `/api/health`, then starts the frontend.
  - Runs both in the background and logs output (no popups; see logs).

## Wrapper Scripts (All call `wankr.bat`)
- `start_wankr.bat`
- `run_dev.bat`

## Folder Sync (GitHub → Local mirror)
- `sync_wankr_folders.bat` (run from the GitHub repo)
  - Default: mirrors `C:\Users\legro\Documents\GitHub\wankr` → `C:\Users\legro\Wankr`
  - Safe excludes: `.git`, `.cursor`, `node_modules`, `dist`, `logs`, `.env`, Infisical files, caches
  - Check only: `sync_wankr_folders.bat check`
  - Logs: `logs\sync.log` and `logs\sync_check.log`

## Other Scripts
- `run_backend.bat`: starts backend only (foreground window).
- `run_with_infisical.bat`: runs backend via Infisical (foreground window).
- `infisical_init.bat`: one-time Infisical setup.

## Secrets (Infisical)
- Store `XAI_API_KEY` or `grokWankr` in Infisical (dev env).
- Local `.env` should include `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`.
- `.env` is ignored by git; do not commit keys.

## Logs
- `logs/api.log`
- `logs/ui.log`
- `run_hidden.ps1` always exits 0 (Cursor-safe); check logs for errors.

## Ports
- API: `http://127.0.0.1:5000`
- UI: `http://localhost:5173` (Vite binds to localhost/::1)
