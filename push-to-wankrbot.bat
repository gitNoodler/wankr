@echo off
title Push to wankrbot.com
cd /d "%~dp0"

echo.
echo ===== Push local dev (5173) to wankrbot.com =====
echo.
echo Step 1: Building frontend (same as 5173)...
echo.

call npm run sync-online
if %errorlevel% neq 0 (
  echo Build failed. Fix errors above, then run this again.
  pause
  exit /b 1
)

echo.
echo Step 2: Commit and push to trigger deploy
echo.
echo   Your production site (wankrbot.com) uses the same code.
echo   - If you use Railway: push to the branch Railway deploys from (e.g. main).
echo   - Railway will rebuild using the root Dockerfile (builds frontend + backend).
echo   - Cloudflare Tunnel then serves the new app at https://wankrbot.com
echo.
echo   Run:
echo     git add -A
echo     git commit -m "Deploy: sync 5173 to wankrbot.com"
echo     git push
echo.
echo   (Or use your usual commit message and push.)
echo.
pause
