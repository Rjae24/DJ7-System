const { exec } = require('child_process');

/**
 * Obtiene la lista de impresoras instaladas en Windows usando PowerShell
 * @returns {Promise<Array<{Name: string, PortName: string, DriverName: string, PrinterStatus: number}>>}
 */
function getInstalledPrinters() {
  return new Promise((resolve, reject) => {
    // Comando PowerShell con formato JSON
    const cmd = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus | ConvertTo-Json -Compress"';

    exec(cmd, { windowsHide: true, timeout: 8000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[SystemPrinters] Error al ejecutar PowerShell:', error.message);
        return resolve([]); // Fallback seguro a array vacío
      }

      const output = stdout.trim();
      if (!output) {
        return resolve([]);
      }

      try {
        const parsed = JSON.parse(output);
        // Si PowerShell devuelve un solo objeto, ConvertTo-Json no genera array; lo convertimos
        const printersList = Array.isArray(parsed) ? parsed : [parsed];

        // Normalizar estructura
        const normalized = printersList
          .filter(p => p && p.Name)
          .map(p => ({
            name: p.Name,
            port: p.PortName || '',
            driver: p.DriverName || '',
            status: p.PrinterStatus ?? 0,
            isNetwork: (p.PortName || '').includes('.') || (p.PortName || '').startsWith('\\\\'),
          }));

        resolve(normalized);
      } catch (parseErr) {
        console.error('[SystemPrinters] Error al parsear salida JSON de impresoras:', parseErr.message, output);
        resolve([]);
      }
    });
  });
}

module.exports = {
  getInstalledPrinters
};
