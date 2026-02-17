@echo off
title Bring wankrbot.com online
cd /d "%~dp0"

echo [1/2] Building frontend...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo [2/2] Build done. Next steps:
echo   1. Start backend: wankr.bat
echo   2. In another window, start tunnel: run_tunnel.bat
echo   3. Open https://wankrbot.com
echo.
echo See BRING_ONLINE.md if the site does not load.
pause
