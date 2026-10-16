import toast from 'react-hot-toast';
import { getEmpresaConfig } from '../utils/constants';

export const PRINT_BRIDGE_URL = 'http://127.0.0.1:8080';
export const STORAGE_KEY_PRINTERS = 'pos_printer_config';

/**
 * Configuración predeterminada de impresoras por caja
 */
export const DEFAULT_PRINTER_CONFIG = {
  // Impresora de Recibos / Facturas (80mm)
  facturas: {
    enabled: true,
    connectionType: 'spooler', // 'spooler' | 'socket'
    targetPrinter: '',
    ip: '192.168.1.200',
    port: 9100,
    autoPrint: false, // Imprimir inmediatamente tras emitir en POS
    cutPaper: true,
  },
  // Impresora de Etiquetas (Código de Barras)
  etiquetas: {
    enabled: true,
    connectionType: 'spooler', // 'spooler' | 'socket'
    targetPrinter: '',
    ip: '192.168.1.201',
    port: 9100,
    widthMm: 50,
    heightMm: 30,
  },
};

/**
 * Obtiene la configuración de impresoras de la caja actual (localStorage)
 */
export function getPrinterConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINTERS);
    if (!raw) return DEFAULT_PRINTER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      facturas: { ...DEFAULT_PRINTER_CONFIG.facturas, ...(parsed.facturas || {}) },
      etiquetas: { ...DEFAULT_PRINTER_CONFIG.etiquetas, ...(parsed.etiquetas || {}) },
    };
  } catch (err) {
    console.error('[PrintService] Error al leer configuración:', err);
    return DEFAULT_PRINTER_CONFIG;
  }
}

/**
 * Guarda la configuración de impresoras para esta caja
 */
export function savePrinterConfig(newConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_PRINTERS, JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('dj7_printer_config_updated', { detail: newConfig }));
    return true;
  } catch (err) {
    console.error('[PrintService] Error al guardar configuración:', err);
    return false;
  }
}

/**
 * Verifica el estado del Agente Local DJ7 Print Bridge
 * @returns {Promise<{online: boolean, version?: string, error?: string}>}
 */
export async function checkPrintBridgeStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const response = await fetch(`${PRINT_BRIDGE_URL}/status`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { online: true, version: data.version || '1.0.0' };
    }
    return { online: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { online: false, error: err.name === 'AbortError' ? 'Timeout' : 'No conectado' };
  }
}

/**
 * Obtiene la lista de impresoras instaladas en Windows
 * @returns {Promise<Array<{name: string, port: string, driver: string}>>}
 */
export async function getAvailablePrinters() {
  try {
    const response = await fetch(`${PRINT_BRIDGE_URL}/printers`);
    if (!response.ok) {
      throw new Error(`Error en el servidor local: ${response.statusText}`);
    }
    const data = await response.json();
    return data.printers || [];
  } catch (err) {
    console.warn('[PrintService] No se pudieron obtener impresoras locales:', err.message);
    throw err;
  }
}

/**
 * Envía un documento a la API del agente local
 */
async function sendPrintJob(endpointPayload) {
  const status = await checkPrintBridgeStatus();
  if (!status.online) {
    throw new Error('El Agente Local de Impresión no está activo en esta PC (http://127.0.0.1:8080). Ejecute C:\\PrintBridge o instale el servicio.');
  }

  const response = await fetch(`${PRINT_BRIDGE_URL}/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(endpointPayload),
  });

  const resData = await response.json();
  if (!response.ok || !resData.success) {
    throw new Error(resData.error || 'Error al enviar la impresión');
  }

  return resData;
}

/**
 * Imprime una factura en la impresora térmica de 80mm
 * @param {object} datosVenta - Datos completos de la venta/factura
 * @param {object} [configOverride] - Opciones personalizadas de configuración
 */
export async function imprimirFactura(datosVenta, configOverride = null) {
  const config = configOverride || getPrinterConfig().facturas;

  if (!config.targetPrinter && config.connectionType === 'spooler') {
    toast.error('No ha seleccionado una impresora térmica para facturas.');
    throw new Error('Impresora de facturas no configurada.');
  }

  const empresa = getEmpresaConfig();

  const payload = {
    empresa: {
      nombre: empresa.nombre || 'DJ7 SYSTEM',
      slogan: empresa.slogan || '',
      rif: empresa.rif || '',
      direccion: empresa.direccion || '',
      telefono: empresa.telefono || '',
    },
    factura: {
      numero_factura: datosVenta.numero_factura || datosVenta.numero || 'PRE-TICKET',
      fecha_emision: datosVenta.fecha_emision || new Date().toISOString(),
      subtotal_usd: datosVenta.subtotal_usd ?? datosVenta.total_usd,
      descuento_usd: datosVenta.descuento_usd || 0,
      total_usd: datosVenta.total_usd || 0,
      total_bs: datosVenta.total_bs || 0,
      metodos_pago: datosVenta.metodos_pago || datosVenta.metodos_pago_detalle || [],
    },
    cliente: datosVenta.cliente || { nombre: 'CLIENTE CONTADO', documento_identidad: 'S/D' },
    detalles: datosVenta.detalles || datosVenta.items || [],
    vendedor: datosVenta.vendedor || { nombre_completo: 'Vendedor' },
    tasa: datosVenta.tasa || null,
    cutPaper: config.cutPaper !== false,
  };

  const endpointPayload = {
    docType: 'factura',
    connectionType: config.connectionType || 'spooler',
    targetPrinter: config.targetPrinter,
    ip: config.ip,
    port: config.port || 9100,
    payload,
  };

  const loadingToast = toast.loading('Enviando ticket a impresora térmica silenciosa...');
  try {
    const result = await sendPrintJob(endpointPayload);
    toast.success('Ticket impreso correctamente', { id: loadingToast });
    return result;
  } catch (err) {
    toast.error(err.message, { id: loadingToast, duration: 6000 });
    throw err;
  }
}

/**
 * Imprime una etiqueta de código de barras TSPL
 * @param {object} datosProducto - Información del producto
 * @param {number} [copias=1] - Cantidad de etiquetas a imprimir
 * @param {object} [configOverride] - Opciones personalizadas de configuración
 */
export async function imprimirEtiqueta(datosProducto, copias = 1, configOverride = null) {
  const config = configOverride || getPrinterConfig().etiquetas;

  if (!config.targetPrinter && config.connectionType === 'spooler') {
    toast.error('No ha seleccionado una impresora para etiquetas.');
    throw new Error('Impresora de etiquetas no configurada.');
  }

  const empresa = getEmpresaConfig();

  const payload = {
    nombre: datosProducto.nombre || 'Producto',
    sku: datosProducto.sku || '',
    codigo_barra: datosProducto.codigo_barra || datosProducto.codigo || datosProducto.sku || '00000000',
    precio_usd: datosProducto.precio_usd || 0,
    precio_bs: datosProducto.precio_bs || 0,
    empresa: empresa.nombre || 'DJ7 SYSTEM',
    copias: Math.max(1, parseInt(copias, 10) || 1),
  };

  const labelSize = {
    widthMm: Number(config.widthMm) || 50,
    heightMm: Number(config.heightMm) || 30,
  };

  const endpointPayload = {
    docType: 'etiqueta',
    connectionType: config.connectionType || 'spooler',
    targetPrinter: config.targetPrinter,
    ip: config.ip,
    port: config.port || 9100,
    payload,
    labelSize,
  };

  const loadingToast = toast.loading(`Imprimiendo ${copias} etiqueta(s)...`);
  try {
    const result = await sendPrintJob(endpointPayload);
    toast.success('Etiqueta(s) enviada(s) a la impresora', { id: loadingToast });
    return result;
  } catch (err) {
    toast.error(err.message, { id: loadingToast, duration: 6000 });
    throw err;
  }
}

/**
 * Envía un ticket de prueba a la impresora de facturas
 */
export async function probarImpresoraFactura(config) {
  const dummyFactura = {
    numero_factura: 'TEST-000001',
    fecha_emision: new Date().toISOString(),
    total_usd: 15.50,
    total_bs: 13641.86,
    cliente: {
      nombre: 'Prueba de Sistema DJ7',
      documento_identidad: 'V-00000000',
    },
    vendedor: {
      nombre_completo: 'Administrador DJ7',
    },
    detalles: [
      { cantidad: 1, producto_nombre: 'Ticket de Prueba Térmico 80mm', subtotal_usd: 10.00 },
      { cantidad: 2, producto_nombre: 'Conexión Silenciosa ESC/POS', subtotal_usd: 5.50 },
    ],
    metodos_pago: [
      { metodo: 'Efectivo USD', monto_usd: 15.50 },
    ],
  };

  return imprimirFactura(dummyFactura, config);
}

/**
 * Envía una etiqueta de prueba a la impresora TSPL
 */
export async function probarImpresoraEtiqueta(config) {
  const dummyProducto = {
    nombre: 'PRODUCTO PRUEBA DJ7',
    sku: 'DJ7-TEST-80MM',
    codigo_barra: '759123456789',
    precio_usd: 19.99,
    precio_bs: 17593.60,
  };

  return imprimirEtiqueta(dummyProducto, 1, config);
}
