@echo off
chcp 65001 >nul
title DJ7 Print Bridge - Servidor Local
color 0A
cd /d "%~dp0"
echo ========================================================
echo   Iniciando DJ7 Print Bridge en http://127.0.0.1:8080
echo ========================================================
echo.
node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo iniciar el servidor. Verifique que Node.js este instalado.
    pause
)
