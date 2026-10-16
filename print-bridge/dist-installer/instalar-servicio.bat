@echo off
chcp 65001 >nul
title Instalador del Agente de Impresion DJ7 Print Bridge
color 0A

echo ====================================================================
echo        DJ7 SYSTEM - INSTALADOR DE AGENTE DE IMPRESION TERMICA
echo ====================================================================
echo.

set "SOURCE_DIR=%~dp0"
set "PROJECT_DIR=%~dp0..\"
set "USE_NODE=0"

:: 1. Detectar si existe el ejecutable compilado .exe o si usamos Node.js
if exist "%SOURCE_DIR%print-bridge.exe" (
    echo [*] Modo detectado: Ejecutable binario independiente (print-bridge.exe)
    set "USE_NODE=0"
) else if exist "%PROJECT_DIR%server.js" (
    echo [*] Modo detectado: Servidor Node.js nativo (server.js)
    set "USE_NODE=1"
) else if exist "%SOURCE_DIR%server.js" (
    echo [*] Modo detectado: Servidor Node.js nativo (server.js)
    set "PROJECT_DIR=%SOURCE_DIR%"
    set "USE_NODE=1"
) else (
    echo [ERROR] No se encontro 'print-bridge.exe' ni 'server.js'.
    echo Asegurese de ejecutar este instalador dentro de la carpeta /print-bridge.
    echo.
    pause
    exit /b 1
)

:: 2. Detener instancias anteriores si estan en ejecucion
echo [*] Deteniendo posibles instancias previas...
taskkill /F /IM print-bridge.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 3. Crear directorio C:\PrintBridge
echo [*] Creando carpeta de instalacion en C:\PrintBridge...
if not exist "C:\PrintBridge" (
    mkdir "C:\PrintBridge"
)
if not exist "C:\PrintBridge\lib" (
    mkdir "C:\PrintBridge\lib"
)

:: 4. Copiar archivos según el modo
if "%USE_NODE%"=="0" (
    echo [*] Copiando print-bridge.exe a C:\PrintBridge...
    copy /Y "%SOURCE_DIR%print-bridge.exe" "C:\PrintBridge\print-bridge.exe" >nul
    (
        echo Set WshShell = CreateObject("WScript.Shell"^)
        echo WshShell.CurrentDirectory = "C:\PrintBridge"
        echo WshShell.Run "print-bridge.exe", 0, False
    ) > "C:\PrintBridge\iniciar-oculto.vbs"
) else (
    echo [*] Copiando codigo Node.js a C:\PrintBridge...
    copy /Y "%PROJECT_DIR%server.js" "C:\PrintBridge\server.js" >nul
    copy /Y "%PROJECT_DIR%lib\*" "C:\PrintBridge\lib\" >nul
    (
        echo Set WshShell = CreateObject("WScript.Shell"^)
        echo WshShell.CurrentDirectory = "C:\PrintBridge"
        echo WshShell.Run "node server.js", 0, False
    ) > "C:\PrintBridge\iniciar-oculto.vbs"
)

if %ERRORLEVEL% NEQ 0 (
    echo [ALERTA] Hubo un problema al copiar los archivos a C:\PrintBridge.
    echo Intente ejecutar este instalador haciendo clic derecho y "Ejecutar como Administrador".
    echo.
    pause
    exit /b 1
)

:: 5. Configurar inicio automatico con Windows para el usuario actual
echo [*] Configurando autoinicio silencioso con Windows...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

copy /Y "C:\PrintBridge\iniciar-oculto.vbs" "%STARTUP_FOLDER%\DJ7-PrintBridge.vbs" >nul

:: 6. Agregar regla al Firewall de Windows para el puerto 8080 (Requiere Admin, si falla no detiene el script)
echo [*] Configurando regla de Firewall para puerto 8080...
netsh advfirewall firewall delete rule name="DJ7 Print Bridge" >nul 2>&1
netsh advfirewall firewall add rule name="DJ7 Print Bridge" dir=in action=allow protocol=TCP localport=8080 profile=any >nul 2>&1

:: 7. Iniciar el servicio en segundo plano inmediatamente
echo [*] Iniciando agente en segundo plano de forma silenciosa...
wscript.exe "%STARTUP_FOLDER%\DJ7-PrintBridge.vbs"

:: Esperar 2 segundos para que el servidor levante
timeout /t 2 /nobreak >nul

:: 8. Verificar estado
powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://127.0.0.1:8080/status' -UseBasicParsing -TimeoutSec 3).StatusCode" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo   [OK] !INSTALACION EXITOSA!
    echo   El agente DJ7 Print Bridge esta corriendo en segundo plano.
    echo   Puerto: http://127.0.0.1:8080
    echo   Se iniciara de forma automatica cada vez que encienda la computadora.
    echo ====================================================================
) else (
    echo.
    echo ====================================================================
    echo   [AVISO] Los archivos fueron instalados correctamente en C:\PrintBridge.
    echo   Si el puerto 8080 no responde aun, reinicie su sesion o ejecute:
    echo   wscript.exe "C:\PrintBridge\iniciar-oculto.vbs"
    echo ====================================================================
)

echo.
pause
