@echo off
title Wankr
cd /d "%~dp0"

echo [Wankr] Killing old processes...
taskkill /f /im node.exe >nul 2>&1

echo [Wankr] Starting API on 5000 (nodemon; use .env for XAI_API_KEY)...
start /min cmd /c "cd /d "%~dp0wankr-backend" && npm run dev:local"

echo [Wankr] Starting UI...
start /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo UI  --^> http://localhost:5173
echo API --^> http://127.0.0.1:5000
echo.
echo All services running. Close these windows to stop.
