@echo off
setlocal

set "SRC=C:\Users\legro\Documents\GitHub\wankr"
set "DEST=C:\Users\legro\Wankr"
set "MODE=%~1"
set "LOG_DIR=%SRC%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if /I "%SRC%"=="%DEST%" (
  echo [Wankr] Source and destination are the same. Aborting.
  exit /b 1
)
if not exist "%SRC%" (
  echo [Wankr] Source not found: %SRC%
  exit /b 1
)
if not exist "%DEST%" (
  echo [Wankr] Destination not found. Creating: %DEST%
  mkdir "%DEST%"
)

set "EXCLUDE_DIRS=.git .cursor node_modules dist logs __pycache__ .venv venv env"
set "EXCLUDE_FILES=.env .infisical.json chat_backup.json restart_requested.flag training_data.json *.pyc"

if /I "%MODE%"=="check" (
  set "ROBO_OPTS=/MIR /L /R:1 /W:1 /NFL /NDL /NP"
  set "LOG_FILE=%LOG_DIR%\sync_check.log"
  echo [Wankr] Checking differences (no changes)...
) else (
  set "ROBO_OPTS=/MIR /R:1 /W:1 /NFL /NDL /NP"
  set "LOG_FILE=%LOG_DIR%\sync.log"
  echo [Wankr] Syncing from %SRC% to %DEST%...
)

robocopy "%SRC%" "%DEST%" %ROBO_OPTS% /XD %EXCLUDE_DIRS% /XF %EXCLUDE_FILES% /TEE /LOG+:"%LOG_FILE%"
set "RC=%ERRORLEVEL%"
if %RC% LEQ 7 (
  echo [Wankr] Done. See %LOG_FILE%
  exit /b 0
) else (
  echo [Wankr] Robocopy error. Code: %RC%
  exit /b %RC%
)
