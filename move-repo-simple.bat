@echo off
REM Simple batch file to move wankr repository from OneDrive to Documents
REM Run this from Command Prompt or PowerShell

set "SOURCE=C:\Users\legro\OneDrive\Documents\GitHub\wankr"
set "TARGET=C:\Users\legro\Documents\GitHub\wankr"

echo.
echo Moving wankr repository from OneDrive...
echo Source: %SOURCE%
echo Target: %TARGET%
echo.

REM Check if source exists
if not exist "%SOURCE%" (
    echo ERROR: Source path does not exist: %SOURCE%
    pause
    exit /b 1
)

REM Check if target exists
if exist "%TARGET%" (
    echo WARNING: Target path already exists: %TARGET%
    set /p OVERWRITE="Do you want to overwrite it? (y/N): "
    if /i not "%OVERWRITE%"=="y" (
        echo Aborted.
        pause
        exit /b 1
    )
    echo Removing existing target...
    rmdir /s /q "%TARGET%"
)

REM Create target directory if needed
if not exist "C:\Users\legro\Documents\GitHub" (
    mkdir "C:\Users\legro\Documents\GitHub"
)

REM Move the repository
echo Moving repository...
move "%SOURCE%" "%TARGET%"

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Repository moved to: %TARGET%
    echo.
    echo Next steps:
    echo 1. Close and reopen Cursor/your IDE
    echo 2. Open the workspace at: %TARGET%
    echo 3. Verify: cd /d "%TARGET%" ^&^& git status
) else (
    echo ERROR: Failed to move repository
)

echo.
pause
