@echo off
setlocal
title Wankr — Setup tunnel for wankrbot.com
cd /d "%~dp0"

echo.
echo ===== Wankrbot.com setup (Railway + Cloudflare Tunnel) =====
echo.
echo If you haven't done the Cloudflare steps yet, do these first:
echo   1. Workers ^& Pages: remove wankrbot.com from any Worker.
echo   2. Zero Trust ^> Networks ^> Tunnels: create/open tunnel.
echo   3. Public Hostname: wankrbot.com -^> HTTP -^> https://wankr-road-production.up.railway.app
echo   4. Run tab: copy token (after --token), put in .env as CLOUDFLARE_TUNNEL_TOKEN=...
echo.
echo Full checklist: SETUP_WANKRBOT_ONLINE.md
echo.
echo ----- Starting tunnel -----
echo.

call "%~dp0run_tunnel.bat" %*
