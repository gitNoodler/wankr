@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"

echo.
echo [Wankr] Starting Node.js API...
echo.

cd /d "%ROOT%wankr-backend"
if not exist node_modules npm install
node server.js

echo.
echo [Wankr] Process ended.
pause
