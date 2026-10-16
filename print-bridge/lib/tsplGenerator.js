/**
 * Generador de comandos TSPL (Taiwan Semiconductor Printer Language) para etiquetas de código de barras
 * Compatible con impresoras térmicas Xprinter, TSC, Zebra, etc.
 * 100% JavaScript puro, compatible con 'pkg'.
 */

/**
 * Sanitiza texto para comandos TSPL (sin comillas dobles ni caracteres que rompan la sintaxis)
 */
function sanitizeTsplText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/"/g, '') // Elimina comillas
    .trim();
}

/**
 * Genera el Buffer de comandos TSPL para imprimir etiquetas adhesivas
 * @param {object} payload - Información del producto
 * @param {object} labelSize - Dimensiones en milímetros { widthMm: 50, heightMm: 30 }
 * @returns {Buffer}
 */
function generateTsplEtiqueta(payload = {}, labelSize = {}) {
  const widthMm = Number(labelSize?.widthMm) || 50;
  const heightMm = Number(labelSize?.heightMm) || 30;

  const {
    nombre = 'PRODUCTO DE PRUEBA',
    sku = 'SKU-00000',
    codigo_barra = '',
    precio_usd = 0,
    precio_bs = 0,
    empresa = 'DJ7 SYSTEM',
    copias = 1,
  } = payload;

  const barcodeValue = sanitizeTsplText(codigo_barra || sku || '00000000');
  const nombreLimpio = sanitizeTsplText(nombre);
  const empresaLimpia = sanitizeTsplText(empresa);
  const precioUsdStr = parseFloat(precio_usd || 0).toFixed(2);
  const precioBsStr = parseFloat(precio_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Puntos por mm (DPI típico 203 DPI = 8 dots/mm)
  // Para 50x30mm: width = 400 dots, height = 240 dots
  const dpiDots = 8;
  const totalDotsWidth = Math.round(widthMm * dpiDots);
  const totalDotsHeight = Math.round(heightMm * dpiDots);

  // Coordenadas calculadas según el alto de la etiqueta
  const yEmpresa = Math.round(totalDotsHeight * 0.08); // 8% desde arriba
  const yNombre = Math.round(totalDotsHeight * 0.22);  // 22%
  const yBarcode = Math.round(totalDotsHeight * 0.40); // 40%
  const barcodeHeight = Math.round(totalDotsHeight * 0.24); // 24% del alto total
  const yPrecio = Math.round(totalDotsHeight * 0.78);  // 78%

  // Truncar nombre si es muy largo
  const maxCharsNombre = Math.floor(widthMm * 0.6); // ~30 caracteres en 50mm
  const nombreLinea1 = nombreLimpio.slice(0, maxCharsNombre);

  // Lista de comandos TSPL
  const commands = [
    `SIZE ${widthMm} mm, ${heightMm} mm`,
    'GAP 2 mm, 0 mm',
    'DIRECTION 1',
    'CLS',
    // 1. Encabezado / Empresa (fuente 1, rotación 0, multX 1, multY 1)
    `TEXT 20,${yEmpresa},"1",0,1,1,"${empresaLimpia}"`,
    // 2. Nombre del producto
    `TEXT 20,${yNombre},"2",0,1,1,"${nombreLinea1}"`,
    // 3. Código de barras Code 128 (x, y, tipo, altura, legibilidad_humana, rotacion, estrecho, ancho, datos)
    // human_readable = 1 (imprime el texto del código abajo)
    `BARCODE 20,${yBarcode},"128",${barcodeHeight},1,0,2,2,"${barcodeValue}"`,
    // 4. Precios (USD grande y Bs si cabe)
    `TEXT 20,${yPrecio},"3",0,1,1,"USD $${precioUsdStr}"`,
  ];

  if (precio_bs && parseFloat(precio_bs) > 0 && widthMm >= 50) {
    const xBs = Math.round(totalDotsWidth * 0.52);
    commands.push(`TEXT ${xBs},${yPrecio},"2",0,1,1,"${precioBsStr} Bs"`);
  }

  // 5. Imprimir N copias
  const numCopias = Math.max(1, parseInt(copias, 10) || 1);
  commands.push(`PRINT ${numCopias},1`);
  commands.push(''); // Salto final

  return Buffer.from(commands.join('\r\n'), 'latin1');
}

module.exports = {
  generateTsplEtiqueta
};
