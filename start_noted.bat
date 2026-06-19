@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PORT=8765
set URL=http://localhost:%PORT%/Noted.html

echo ================================
echo  Noted - Sunucu Baslatici
echo ================================
echo.

:: 1) Node.js (server.js ile hem statik hem HF proxy)
where node >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Node.js bulundu.
    echo Sunucu: %URL%
    echo Kapatmak icin bu pencereyi kapatin.
    echo.
    start /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 2; Start-Process '%URL%'"
    node "%~dp0server.js"
    goto :eof
)

:: 2) py.exe - Windows Python Launcher
where py >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Python Launcher bulundu.
    echo Sunucu: %URL%
    echo Kapatmak icin bu pencereyi kapatin.
    echo.
    start /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 2; Start-Process '%URL%'"
    py -m http.server %PORT%
    goto :eof
)

:: 3) PowerShell fallback - Python/Node gerekmez, Windows 10+ garantili
echo [INFO] Node.js/Python bulunamadi.
echo [INFO] PowerShell HTTP sunucusu baslatiliyor...
echo Sunucu: %URL%
echo Kapatmak icin bu pencereyi kapatin.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_noted_server.ps1" -Port %PORT%
