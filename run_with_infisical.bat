@echo off
setlocal enabledelayedexpansion

echo.
echo [Wankr] Starting with Infisical...

:: Set INFISICAL_PROJECT_ID to your project ID (e.g. from dashboard URL) to skip init.
if defined INFISICAL_PROJECT_ID (
    echo [Wankr] Using project ID from env: %INFISICAL_PROJECT_ID%
    set "PROJECT_FLAG=--projectId=%INFISICAL_PROJECT_ID%"
) else (
    echo [Wankr] No INFISICAL_PROJECT_ID set - using .infisical.json (run infisical init if missing)
    set "PROJECT_FLAG="
)

:: Prefer WinGet path; fallback to infisical on PATH
set "INFISICAL_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\infisical.infisical_Microsoft.Winget.Source_8wekyb3d8bbwe\infisical.exe"
if not exist "%INFISICAL_EXE%" set "INFISICAL_EXE=infisical"

cd /d "%~dp0"
"%INFISICAL_EXE%" run %PROJECT_FLAG% --env=dev -- python app.py

echo.
echo [Wankr] Process ended.
pause
