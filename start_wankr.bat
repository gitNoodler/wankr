@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"

echo.
echo [Wankr] Launching dev servers...
echo.

rem Ensure existing API on port 5000 is stopped
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
    echo   Stopped API (PID %%a)
)

rem Start Node.js API (uses .env or Infisical Machine Identity)
start "Wankr API" cmd /k "cd /d %ROOT% && run_backend.bat"

rem Start React dev server (Vite)
start "Wankr UI" cmd /k "cd /d %ROOT%frontend && if not exist node_modules npm install && npm run dev"

echo UI:  http://localhost:5173
echo API: http://127.0.0.1:5000
echo.
endlocal
