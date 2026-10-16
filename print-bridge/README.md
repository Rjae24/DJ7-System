# DJ7 Print Bridge — Agente Local de Impresión Térmica Silenciosa

Servidor puente HTTP local independiente diseñado para conectar la aplicación web en la nube de **DJ7 System** con impresoras térmicas locales sin cuadros de diálogo (`window.print()`).

---

## Características Principales
- **Dual Engine:**
  - **Facturas / Recibos (80mm):** Generador binario nativo **ESC/POS** con corte automático de papel.
  - **Etiquetas de Código de Barras:** Generador nativo **TSPL** para rollos adhesivos (Code 128, precios y dimensiones configurables).
- **Conectividad:**
  - **Spooler de Windows:** Envío RAW directo a cualquier impresora USB o compartida instalada en Windows usando la API Win32 (`RawPrinterHelper`).
  - **Socket TCP:** Envío directo vía red (Ethernet / Wi-Fi) al puerto 9100.
- **Soporte PNA de Google Chrome:** Responde con la cabecera `Access-Control-Allow-Private-Network: true` para permitir peticiones desde dominios HTTPS externos a `127.0.0.1:8080`.
- **Portabilidad Total:** Sin dependencias nativas en C++ (`node-gyp`), 100% compatible con compilación a ejecutable `.exe` con `pkg`.

---

## Endpoints de la API (127.0.0.1:8080)
- `GET /status`: Comprueba el estado del agente y versión.
- `GET /printers`: Lista las impresoras instaladas en Windows vía PowerShell.
- `POST /print`: Recibe el documento a imprimir (`factura` o `etiqueta`), selecciona el destino y realiza el despacho silencioso.

---

## Modo Desarrollo
Para ejecutar el agente directamente con Node.js en esta PC:
```bash
cd print-bridge
npm install
npm start
```

## Compilación del Ejecutable `.exe`
Para generar el archivo binario independiente sin necesidad de que la PC cliente tenga Node.js instalado:
```bash
cd print-bridge
npm install
npm run build
```
El archivo `print-bridge.exe` se generará automáticamente dentro de `dist-installer/`.

## Instalación en la PC del Cliente
1. Copiar la carpeta `dist-installer/` a la PC del cliente o terminal de caja.
2. Hacer doble clic derecho en `instalar-servicio.bat` y seleccionar **"Ejecutar como administrador"**.
3. El instalador creará `C:\PrintBridge`, configurará el autoinicio de Windows y arrancará el servicio en segundo plano de manera silenciosa.
