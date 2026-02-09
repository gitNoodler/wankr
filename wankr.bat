@echo off
title Wankr
cd /d "%~dp0"

set "ROOT=%~dp0"
if not exist "%ROOT%logs" mkdir "%ROOT%logs"

rem Use mascot logo everywhere
if exist "%ROOT%images_logo_banner_mascot\logo.png" (
  copy /Y "%ROOT%images_logo_banner_mascot\logo.png" "%ROOT%frontend\public\static\logo.png" >nul 2>&1
  copy /Y "%ROOT%images_logo_banner_mascot\logo.png" "%ROOT%static\logo.png" >nul 2>&1
)

call :log "=== Wankr startup %date% %time% ==="

echo [Wankr] Killing old processes...
call :log "[Wankr] Killing old processes (taskkill + kill-port)..."
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (call :log "taskkill: node processes terminated") else (call :log "taskkill: no node processes found")
call npx kill-port 5173 5000 >nul 2>&1
call :log "[Wankr] kill-port 5173 5000 done"
timeout /t 2 /nobreak >nul

call :check_ports_clean
if errorlevel 1 (
  echo [Wankr] WARN: Ports may still be in use. Proceeding anyway.
  call :log "[Wankr] WARN: Ports may still be in use"
)

echo [Wankr] Starting API with Infisical secrets...
call :log "[Wankr] Starting API..."
start /min cmd /c "cd /d %~dp0 && call start_backend.bat"

echo [Wankr] Starting UI...
call :log "[Wankr] Starting UI..."
start /min cmd /c "cd /d %~dp0frontend && npm run dev"

echo [Wankr] Waiting for services to come up...
call :log "[Wankr] Waiting 8s for startup..."
timeout /t 8 /nobreak >nul

call :verify_api
call :verify_ui

echo.
echo UI  --^> http://localhost:5173  (use this for the dashboard)
echo API --^> http://127.0.0.1:5000
echo.
start http://localhost:5173
echo Log: logs\wankr.log
echo All services running in the background. Close these windows to stop.
call :log "[Wankr] Startup complete."
exit /b 0

:log
echo [%date% %time%] %~1 >> "%ROOT%logs\wankr.log"
exit /b 0

:check_ports_clean
netstat -ano 2>nul | findstr "LISTENING" | findstr /C:":5173" /C:":5000" >nul 2>&1
if %errorlevel% equ 0 exit /b 1
exit /b 0

:verify_api
curl -s -o nul -w "%%{http_code}" http://127.0.0.1:5000/api/health 2>nul | findstr "200" >nul 2>&1
if %errorlevel% equ 0 (
  echo [Wankr] API OK - http://127.0.0.1:5000
  call :log "[Wankr] API verify: OK"
) else (
  echo [Wankr] API FAIL - not responding on 5000
  call :log "[Wankr] API verify: FAIL"
)
exit /b 0

:verify_ui
curl -s -o nul -w "%%{http_code}" http://localhost:5173/ 2>nul | findstr "200" >nul 2>&1
if %errorlevel% equ 0 (
  echo [Wankr] UI OK - http://localhost:5173
  call :log "[Wankr] UI verify: OK"
) else (
  echo [Wankr] UI FAIL - not responding on 5173
  call :log "[Wankr] UI verify: FAIL"
)
exit /b 0
