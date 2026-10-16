@echo off
chcp 65001 >nul
title Desinstalador del Agente de Impresion DJ7 Print Bridge
color 0C

echo ====================================================================
echo        DJ7 SYSTEM - DESINSTALADOR DE AGENTE DE IMPRESION
echo ====================================================================
echo.

echo [*] Deteniendo proceso en ejecucion print-bridge.exe y liberando puerto 8080...
taskkill /F /IM print-bridge.exe >nul 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [*] Eliminando del inicio automatico de Windows...
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DJ7-PrintBridge.vbs" >nul 2>&1

echo [*] Eliminando regla del Firewall...
netsh advfirewall firewall delete rule name="DJ7 Print Bridge" >nul 2>&1

echo [*] Eliminando archivos de C:\PrintBridge...
if exist "C:\PrintBridge" (
    rmdir /S /Q "C:\PrintBridge" >nul 2>&1
)

echo.
echo ====================================================================
echo   [OK] El Agente DJ7 Print Bridge ha sido desinstalado por completo.
echo ====================================================================
echo.
pause
