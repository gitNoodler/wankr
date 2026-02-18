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
  echo Get the token: Cloudflare Zero Trust ^> Networks ^> Tunnels ^> your tunnel ^> copy the "Run" command and use the part after --token. Use the RUN token, not "service install".
  echo Then run run_tunnel.bat again.
  echo.
  pause
  exit /b 1
)

REM Default HTTP/2 to avoid "control stream encountered a failure" (QUIC often fails on Windows/firewalls). Set TUNNEL_PROTOCOL=quic to use QUIC.
set "TUNNEL_EXTRA=--protocol http2"
if "%TUNNEL_PROTOCOL%"=="quic" set "TUNNEL_EXTRA="

echo [Tunnel] Running cloudflared. Backend: localhost:5000 (local) or set Public Hostname to Railway URL in Cloudflare.
echo.
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
  "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run --token %CLOUDFLARE_TUNNEL_TOKEN% %TUNNEL_EXTRA%
) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
  "C:\Program Files\cloudflared\cloudflared.exe" tunnel run --token %CLOUDFLARE_TUNNEL_TOKEN% %TUNNEL_EXTRA%
) else (
  cloudflared tunnel run --token %CLOUDFLARE_TUNNEL_TOKEN% %TUNNEL_EXTRA%
)
