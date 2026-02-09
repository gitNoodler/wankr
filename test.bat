@echo off
setlocal
echo.
echo [Wankr] Quick test — API and UI must be running (wankr.bat).
echo.

set "FAIL=0"
curl -s -o nul http://127.0.0.1:5000/api/health 2>nul
if %errorlevel% neq 0 (echo   API  FAIL & set FAIL=1) else (echo   API  OK)
curl -s -o nul http://127.0.0.1:5173/ 2>nul
if %errorlevel% neq 0 curl -s -o nul http://localhost:5173/ 2>nul
if %errorlevel% neq 0 (echo   UI   FAIL & set FAIL=1) else (echo   UI   OK)

echo.
if %FAIL% equ 0 (echo [Wankr] All good. Open http://localhost:5173) else (echo [Wankr] Start servers: run_visible.bat)
echo.
endlocal
