/**
 * Format a number as USD currency
 */
export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format a number as Bolivares
 */
export function formatBs(amount) {
  return `Bs ${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)}`;
}

/**
 * Format a date to locale string
 */
export function formatFecha(fecha, includeTime = false) {
  if (!fecha) return '';
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
  };
  return new Date(fecha).toLocaleDateString('es-VE', options);
}

/**
 * Format a date for display in short format
 */
export function formatFechaCorta(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format exchange rate
 */
export function formatTasa(tasa) {
  return `Bs ${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(tasa || 0)}/$`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, length = 30) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Generate a SKU suggestion from product name
 */
export function generarSKU(nombre) {
  if (!nombre) return '';
  return nombre
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6)
    + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}
