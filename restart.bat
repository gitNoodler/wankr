@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"

echo.
echo [Wankr] Requesting chat backup before restart...
curl -s -o nul -w "" http://127.0.0.1:5000/api/restart/request 2>nul
timeout /t 8 /nobreak >nul
echo [Wankr] Stopping dev servers...
echo.

rem Kill processes on port 5000 (Node API; also kills Flask if manually started)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
    echo   Stopped API (PID %%a)
)

rem Kill processes listening on port 5173 (React dev server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
    echo   Stopped UI (PID %%a)
)

echo.
echo [Wankr] Restarting...
echo.
timeout /t 2 /nobreak >nul

call "%ROOT%launch.bat"

endlocal
