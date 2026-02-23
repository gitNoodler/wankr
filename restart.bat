@echo off
title Wankr Restart
cd /d "%~dp0"

echo [Wankr] Restarting services...
echo.

REM Kill existing Node.js processes
echo [Wankr] Killing old processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Start API
echo [Wankr] Starting API on 5000...
start /min cmd /c "cd /d "%~dp0wankr-backend" && npm run dev:local"

REM Start UI
echo [Wankr] Starting UI...
start /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo UI  --^> http://localhost:5173
echo API --^> http://127.0.0.1:5000
echo.
echo All services restarted. Close these windows to stop.
echo.
pause
