@echo off
echo.
echo === Wankr Infisical One-Time Setup ===
echo.

set "INFISICAL_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\infisical.infisical_Microsoft.Winget.Source_8wekyb3d8bbwe\infisical.exe"
if not exist "%INFISICAL_EXE%" (
    echo Infisical CLI not found. Run: winget install infisical.infisical
    pause
    exit /b 1
)

"%INFISICAL_EXE%" login

echo.
echo Now linking this folder to your project...
cd /d "%~dp0"
"%INFISICAL_EXE%" init

echo.
echo Done! Set INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID in .env, then run wankr.bat
pause
