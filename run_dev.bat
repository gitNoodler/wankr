@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "LOG_DIR=%ROOT%logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.
echo [Wankr] Launching dev servers...
echo.

rem Start Node.js API (hidden; show window only on error)
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%ROOT%run_hidden.ps1" ^
  -Title "Wankr API" ^
  -WorkDir "%ROOT%wankr-backend" ^
  -Command "if not exist node_modules npm install ^&^& node server.js" ^
  -Log "%LOG_DIR%\api.log"

rem Start React dev server (hidden; show window only on error)
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%ROOT%run_hidden.ps1" ^
  -Title "Wankr UI" ^
  -WorkDir "%ROOT%frontend" ^
  -Command "if not exist node_modules npm install ^&^& npm run dev" ^
  -Log "%LOG_DIR%\ui.log"

echo UI:  http://localhost:5173
echo API: http://127.0.0.1:5000
echo.
endlocal
