@echo off
echo 🎤 Mental Chessters Voice Chess Launcher
echo =========================================

echo 🔍 Checking if server is running...
timeout /t 2 /nobreak >nul

echo 🌐 Opening Chrome with HTTPS for voice recognition...
echo.
echo ⚠️  You may see a security warning - click "Advanced" then "Proceed to localhost"
echo 🎤 This is normal for self-signed certificates and safe for localhost
echo.

REM Try to open Chrome with the HTTPS URL
start "" "chrome.exe" --new-window --allow-running-insecure-content --disable-web-security --user-data-dir="%TEMP%\chrome-voice-chess" "https://localhost:3443"

if errorlevel 1 (
    echo 🔍 Chrome not found in PATH, trying default installation...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --allow-running-insecure-content --disable-web-security --user-data-dir="%TEMP%\chrome-voice-chess" "https://localhost:3443"
)

if errorlevel 1 (
    echo 🔍 Chrome not found, trying other browsers...
    start "" "https://localhost:3443"
)

echo.
echo 📝 Instructions:
echo 1. If you see a security warning, click "Advanced" then "Proceed to localhost"
echo 2. Login with: admin / password123
echo 3. Click "Voice Chess" to start playing with voice commands
echo.
echo 🚀 Enjoy voice chess!
pause