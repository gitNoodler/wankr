@echo off
cd /d "%~dp0"
REM Load INFISICAL_PROJECT_ID from .env if not already set (use Wankr project)
if not defined INFISICAL_PROJECT_ID (
  for /f "tokens=2 delims==" %%a in ('findstr /b "INFISICAL_PROJECT_ID" .env 2^>nul') do set INFISICAL_PROJECT_ID=%%a
)
set "PROJECT_FLAG="
if defined INFISICAL_PROJECT_ID set "PROJECT_FLAG=--projectId=%INFISICAL_PROJECT_ID%"
cd wankr-backend
infisical run %PROJECT_FLAG% --env=dev -- npm start
