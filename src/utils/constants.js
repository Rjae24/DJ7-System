// Métodos de pago disponibles en el sistema
export const METODOS_PAGO = [
  { id: 'efectivo_usd', label: 'Efectivo USD', enBs: false },
  { id: 'efectivo_bs', label: 'Efectivo Bs', enBs: true },
  { id: 'zelle', label: 'Zelle', enBs: false, isZelle: true },
  { id: 'pago_movil', label: 'Pago Móvil', enBs: true, requiereReferencia: true },
  { id: 'punto_venta', label: 'Punto de Venta', enBs: true, requiereReferencia: true },
  { id: 'transferencia', label: 'Transferencia', enBs: true, requiereReferencia: true },
  { id: 'cashea', label: 'Cashea', enBs: true, isCashea: true, requiereReferencia: true },
];

// Roles del sistema
export const ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
};

// Estados de factura
export const ESTADOS_FACTURA = {
  EMITIDA: 'emitida',
  ANULADA: 'anulada',
};

// Estados de orden de compra
export const ESTADOS_ORDEN = {
  PENDIENTE: 'pendiente',
  RECIBIDA: 'recibida',
  CANCELADA: 'cancelada',
};

// Configuración de impresión
export const PRINT_WIDTHS = {
  '58mm': { width: '58mm', chars: 32, pixelWidth: '164px' },
  '80mm': { width: '80mm', chars: 48, pixelWidth: '226px' },
};

// Configuración por defecto de la empresa
export const DEFAULT_EMPRESA = {
  nombre: 'COMERCIALIZADORA DJ7 C.A.',
  rif: 'J-50123456-7',
  direccion: 'Caracas, Venezuela',
  telefono: '0414-1234567',
  logo: '/logo-vectorizado.jfif',
  slogan: '¡Gracias por su compra!',
};

export function getEmpresaConfig() {
  try {
    const saved = localStorage.getItem('dj7_empresa_config');
    if (saved) {
      return { ...DEFAULT_EMPRESA, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error leyendo config de empresa:', e);
  }
  return DEFAULT_EMPRESA;
}

export function saveEmpresaConfig(config) {
  try {
    localStorage.setItem('dj7_empresa_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error guardando config de empresa:', e);
  }
}

export const EMPRESA = DEFAULT_EMPRESA;

