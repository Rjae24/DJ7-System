const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

/**
 * Envía datos binarios a una impresora a través de Socket TCP (Red / Ethernet / WiFi)
 * @param {Buffer} buffer - Datos binarios (ESC/POS o TSPL)
 * @param {string} ip - Dirección IP de la impresora
 * @param {number} port - Puerto TCP (por defecto 9100)
 * @param {number} timeoutMs - Tiempo límite en milisegundos (default 4000)
 */
function sendToSocket(buffer, ip, port = 9100, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (!ip) {
      return reject(new Error('Dirección IP no especificada para la conexión socket'));
    }

    const socket = new net.Socket();
    let handled = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.write(buffer, (writeErr) => {
        if (writeErr) {
          if (!handled) {
            handled = true;
            cleanup();
            reject(new Error(`Error al enviar datos por socket a ${ip}:${port} -> ${writeErr.message}`));
          }
        } else {
          // Esperar un breve instante para que la impresora vacíe el buffer TCP antes de cerrar
          setTimeout(() => {
            if (!handled) {
              handled = true;
              cleanup();
              resolve({ success: true, method: 'socket', target: `${ip}:${port}` });
            }
          }, 300);
        }
      });
    });

    socket.on('timeout', () => {
      if (!handled) {
        handled = true;
        cleanup();
        reject(new Error(`Timeout de conexión (${timeoutMs / 1000}s) hacia la impresora IP ${ip}:${port}`));
      }
    });

    socket.on('error', (err) => {
      if (!handled) {
        handled = true;
        cleanup();
        reject(new Error(`No se pudo conectar con la impresora en ${ip}:${port}: ${err.message}`));
      }
    });

    socket.connect(port, ip);
  });
}

/**
 * Envía datos RAW directamente al Spooler de Windows usando RawPrinterHelper (C# nativo vía PowerShell)
 * Sin módulos binarios .node nativos, 100% compatible con 'pkg'
 * @param {Buffer} buffer - Datos binarios (ESC/POS o TSPL)
 * @param {string} printerName - Nombre exacto de la impresora en Windows
 */
function sendToSpooler(buffer, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) {
      return reject(new Error('Nombre de impresora no especificado para el spooler de Windows'));
    }

    // Guardar buffer en archivo temporal
    const tempFileName = `dj7_print_${Date.now()}_${Math.random().toString(36).substring(7)}.raw`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      fs.writeFileSync(tempFilePath, buffer);
    } catch (fsErr) {
      return reject(new Error(`Error al crear archivo temporal para impresión: ${fsErr.message}`));
    }

    // Script PowerShell con C# RawPrinterHelper que envía RAW a winspool.drv
    // Usa comillas escapadas y rutas seguras
    const escapedPrinter = printerName.replace(/"/g, '`"');
    const escapedFilePath = tempFilePath.replace(/'/g, "''");

    const psCode = `
$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendFileToPrinter(string szPrinterName, string szFileName) {
        if (!File.Exists(szFileName)) return false;
        byte[] bytes = File.ReadAllBytes(szFileName);
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "DJ7-Silent-Ticket";
        di.pDataType = "RAW";

        bool bSuccess = false;
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    int dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return bSuccess;
    }
}
"@
try {
  Add-Type -TypeDefinition $code -Language CSharp
  $res = [RawPrinterHelper]::SendFileToPrinter("${escapedPrinter}", '${escapedFilePath}')
  if ($res) {
    Write-Output "SUCCESS"
  } else {
    Write-Error "Fallo en OpenPrinter o WritePrinter para ${escapedPrinter}"
  }
} catch {
  Write-Error $_.Exception.Message
}
`;

    // Ejecutar vía PowerShell en segundo plano
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCode.replace(/\r?\n/g, ' ')}"`;

    exec(cmd, { windowsHide: true, timeout: 10000 }, (error, stdout, stderr) => {
      // Limpieza del archivo temporal
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        // Ignorar error al limpiar temp
      }

      if (error || (stderr && stderr.trim().length > 0 && !stdout.includes('SUCCESS'))) {
        const errDetail = (stderr || error?.message || 'Error desconocido').trim();
        return reject(new Error(`Fallo en el Spooler de Windows para la impresora "${printerName}": ${errDetail}`));
      }

      if (stdout.includes('SUCCESS')) {
        resolve({ success: true, method: 'spooler', printer: printerName });
      } else {
        reject(new Error(`Respuesta inesperada del Spooler de Windows: ${stdout.trim()}`));
      }
    });
  });
}

/**
 * Despachador universal de trabajos de impresión
 * @param {Buffer} buffer - Contenido binario generado
 * @param {object} options - Opciones de destino
 * @returns {Promise<object>}
 */
async function dispatchPrint(buffer, options = {}) {
  const {
    connectionType = 'spooler',
    targetPrinter,
    ip,
    port = 9100,
  } = options;

  if (connectionType === 'socket') {
    return sendToSocket(buffer, ip, Number(port) || 9100);
  }

  if (connectionType === 'spooler') {
    return sendToSpooler(buffer, targetPrinter);
  }

  throw new Error(`Tipo de conexión no soportado: "${connectionType}". Use "spooler" o "socket".`);
}

module.exports = {
  dispatchPrint,
  sendToSocket,
  sendToSpooler
};
