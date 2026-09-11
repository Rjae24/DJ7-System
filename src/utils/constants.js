// Métodos de pago disponibles en el sistema
export const METODOS_PAGO = [
  { id: 'efectivo_usd', label: 'Efectivo USD', requiereReferencia: false, enBs: false },
  { id: 'efectivo_bs', label: 'Efectivo Bs', requiereReferencia: false, enBs: true },
  { id: 'zelle', label: 'Zelle', requiereReferencia: true, enBs: false },
  { id: 'pago_movil', label: 'Pago Móvil', requiereReferencia: true, enBs: true },
  { id: 'punto_venta', label: 'Punto de Venta', requiereReferencia: true, enBs: true },
  { id: 'transferencia', label: 'Transferencia', requiereReferencia: true, enBs: true },
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

// Información de la empresa
export const EMPRESA = {
  nombre: 'COMERCIALIZADORA DJ7 C.A.',
  logo: '/logo-dj7.jpg',
  slogan: '¡Gracias por su compra!',
};
