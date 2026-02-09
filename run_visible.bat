@echo off
setlocal
set "ROOT=%~dp0"

echo.
echo [Wankr] Stopping anything on 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

echo [Wankr] Starting API and UI in two windows (leave them open)...
echo.

start "Wankr API" cmd /k "cd /d "%ROOT%wankr-backend" && npm install && node server.js"
timeout /t 3 /nobreak >nul
start "Wankr UI"  cmd /k "cd /d "%ROOT%frontend" && npm install && npm run dev"

echo.
echo Open http://localhost:5173 in your browser when the UI window says "ready".
echo Close this window when done.
pause
