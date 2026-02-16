@echo off
setlocal enabledelayedexpansion
title Wankr Tunnel
cd /d "%~dp0"
REM Load CLOUDFLARE_TUNNEL_TOKEN from .env if not set (script dir = repo root)
if "%CLOUDFLARE_TUNNEL_TOKEN%"=="" if exist "%~dp0.env" (
  for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b "CLOUDFLARE_TUNNEL_TOKEN=" "%~dp0.env" 2^>nul`) do set "CLOUDFLARE_TUNNEL_TOKEN=%%b"
  if defined CLOUDFLARE_TUNNEL_TOKEN set "CLOUDFLARE_TUNNEL_TOKEN=!CLOUDFLARE_TUNNEL_TOKEN:"=!"
  if defined CLOUDFLARE_TUNNEL_TOKEN set "CLOUDFLARE_TUNNEL_TOKEN=!CLOUDFLARE_TUNNEL_TOKEN: =!"
)
if "%CLOUDFLARE_TUNNEL_TOKEN%"=="" (
  echo [Tunnel] No CLOUDFLARE_TUNNEL_TOKEN set.
  echo.
  echo Edit this file and paste your token after the = on the CLOUDFLARE_TUNNEL_TOKEN line:
  echo   %~dp0.env
  echo.
  echo Get the token: Cloudflare Zero Trust ^> Networks ^> Tunnels ^> your tunnel ^> copy "Run" command, use the part after --token
  echo Then run run_tunnel.bat again.
  echo.
  pause
  exit /b 1
)

echo [Tunnel] Running cloudflared (backend should be on localhost:5000)...
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
  "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run --token %CLOUDFLARE_TUNNEL_TOKEN%
) else (
  cloudflared tunnel run --token %CLOUDFLARE_TUNNEL_TOKEN%
)
