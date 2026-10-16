const http = require('http');
const { getInstalledPrinters } = require('./lib/systemPrinters');
const { generateEscPosFactura } = require('./lib/escposGenerator');
const { generateTsplEtiqueta } = require('./lib/tsplGenerator');
const { dispatchPrint } = require('./lib/printerDispatcher');

const PORT = 8080;
const HOST = '127.0.0.1';

/**
 * Servidor HTTP nativo de alto rendimiento para el Agente Local de Impresión
 * Cero dependencias externas requeridas (Node.js nativo 100%)
 */
const server = http.createServer((req, res) => {
  // 1. Configurar cabeceras CORS y Private Network Access (PNA) para Google Chrome
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Responder a Preflight OPTIONS de inmediato
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || HOST}`);
  const pathname = reqUrl.pathname;

  // Helper para respuestas JSON
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode);
    res.end(JSON.stringify(data));
  };

  // Helper para leer cuerpo JSON
  const parseBody = () => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) { // Límite 10MB
          reject(new Error('Payload demasiado grande'));
        }
      });
      req.on('end', () => {
        if (!body.trim()) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('JSON malformado en el cuerpo de la petición'));
        }
      });
      req.on('error', reject);
    });
  };

  // 2. Rutas del Agente Local
  if (req.method === 'GET' && pathname === '/status') {
    return sendJson(200, {
      online: true,
      name: 'DJ7 Print Bridge',
      version: '1.0.0',
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && pathname === '/printers') {
    getInstalledPrinters()
      .then(printers => {
        sendJson(200, {
          success: true,
          count: printers.length,
          printers,
        });
      })
      .catch(err => {
        sendJson(500, {
          success: false,
          error: err.message || 'Error al obtener impresoras del sistema',
        });
      });
    return;
  }

  if (req.method === 'POST' && pathname === '/print') {
    parseBody()
      .then(async (body) => {
        const {
          targetPrinter = '',
          connectionType = 'spooler',
          ip = '',
          port = 9100,
          docType = 'factura',
          payload = {},
          labelSize = { widthMm: 50, heightMm: 30 },
        } = body;

        let printBuffer;

        if (docType === 'factura') {
          printBuffer = generateEscPosFactura(payload);
        } else if (docType === 'etiqueta') {
          printBuffer = generateTsplEtiqueta(payload, labelSize);
        } else {
          return sendJson(400, {
            success: false,
            error: `Tipo de documento no válido: "${docType}". Debe ser "factura" o "etiqueta".`,
          });
        }

        if (!printBuffer || printBuffer.length === 0) {
          return sendJson(400, {
            success: false,
            error: 'No se generaron datos binarios para el documento.',
          });
        }

        const dispatchResult = await dispatchPrint(printBuffer, {
          connectionType,
          targetPrinter,
          ip,
          port,
        });

        sendJson(200, {
          success: true,
          message: `Impresión de ${docType} completada correctamente`,
          bytes: printBuffer.length,
          destination: dispatchResult,
        });
      })
      .catch(err => {
        console.error('[Server] Error en /print:', err.message);
        sendJson(500, {
          success: false,
          error: err.message || 'Error interno al procesar la impresión',
        });
      });
    return;
  }

  // Ruta no encontrada
  sendJson(404, { error: 'Endpoint no encontrado en DJ7 Print Bridge' });
});

server.listen(PORT, HOST, () => {
  console.log('========================================================');
  console.log('  DJ7 Print Bridge v1.0.0 ACTIVO (Nativo)');
  console.log(`  Escuchando en: http://${HOST}:${PORT}`);
  console.log('  Private Network Access (PNA): Habilitado');
  console.log('========================================================');
});

module.exports = server;
