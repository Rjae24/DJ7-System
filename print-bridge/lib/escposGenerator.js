/**
 * Generador de buffers binarios ESC/POS para tickets de 80mm (48 columnas)
 * 100% JavaScript puro, compatible con compilación 'pkg' (sin dependencias C++)
 */

// Comandos binarios estándar ESC/POS
const CMD = {
  INIT: Buffer.from([0x1B, 0x40]),                      // ESC @ (Inicializar)
  ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),          // ESC a 0 (Izquierda)
  ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),        // ESC a 1 (Centro)
  ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),         // ESC a 2 (Derecha)
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),             // ESC E 1 (Negrita ON)
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),            // ESC E 0 (Negrita OFF)
  TEXT_NORMAL: Buffer.from([0x1D, 0x21, 0x00]),         // GS ! 0 (Tamaño Normal)
  TEXT_DOUBLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x01]),  // GS ! 1 (Doble Alto)
  TEXT_DOUBLE_WIDTH: Buffer.from([0x1D, 0x21, 0x10]),   // GS ! 16 (Doble Ancho)
  TEXT_DOUBLE: Buffer.from([0x1D, 0x21, 0x11]),         // GS ! 17 (Doble Alto y Ancho)
  FEED_LINE: Buffer.from([0x0A]),                       // LF (Salto de línea)
  CUT_PAPER: Buffer.from([0x1D, 0x56, 0x41, 0x03]),     // GS V 65 3 (Alimentar y corte parcial)
  CUT_PAPER_FULL: Buffer.from([0x1D, 0x56, 0x00]),      // GS V 0 (Corte total)
};

const LINE_WIDTH = 48; // Ancho típico en caracteres de recibo térmico de 80mm

/**
 * Sanitiza caracteres con acento o especiales a caracteres seguros ASCII
 */
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[^\x20-\x7E\n]/g, ' '); // Deja solo imprimibles
}

/**
 * Crea una línea de 2 columnas justificadas (ej: "Subtotal:        $120.00")
 */
function makeRow(leftText, rightText, width = LINE_WIDTH) {
  const left = sanitizeText(leftText);
  const right = sanitizeText(rightText);
  const spacesNeeded = Math.max(1, width - (left.length + right.length));
  return left + ' '.repeat(spacesNeeded) + right + '\n';
}

/**
 * Crea una línea centrada
 */
function makeCentered(text, width = LINE_WIDTH) {
  const clean = sanitizeText(text).trim();
  if (clean.length >= width) return clean + '\n';
  const pad = Math.floor((width - clean.length) / 2);
  return ' '.repeat(pad) + clean + '\n';
}

/**
 * Línea separadora
 */
function makeSeparator(char = '-') {
  return char.repeat(LINE_WIDTH) + '\n';
}

/**
 * Construye el Buffer binario ESC/POS para una factura
 * @param {object} payload - Datos de la factura y empresa
 * @returns {Buffer} Buffer binario listo para enviar a la impresora
 */
function generateEscPosFactura(payload) {
  const chunks = [];
  const add = (bufferOrString) => {
    if (Buffer.isBuffer(bufferOrString)) {
      chunks.push(bufferOrString);
    } else {
      chunks.push(Buffer.from(bufferOrString, 'ascii'));
    }
  };

  const {
    empresa = {},
    factura = {},
    cliente = {},
    detalles = [],
    vendedor = {},
    tasa = null,
    cutPaper = true,
  } = payload;

  // 1. Inicializar impresora
  add(CMD.INIT);

  // 2. Encabezado de la Empresa
  add(CMD.ALIGN_CENTER);
  add(CMD.BOLD_ON);
  add(CMD.TEXT_DOUBLE);
  add(`${sanitizeText(empresa.nombre || 'DJ7 SYSTEM')}\n`);
  add(CMD.TEXT_NORMAL);
  add(CMD.BOLD_OFF);

  if (empresa.slogan) {
    add(`${sanitizeText(empresa.slogan)}\n`);
  }
  if (empresa.rif) {
    add(`RIF: ${sanitizeText(empresa.rif)}\n`);
  }
  if (empresa.direccion) {
    add(`${sanitizeText(empresa.direccion)}\n`);
  }
  if (empresa.telefono) {
    add(`Tel: ${sanitizeText(empresa.telefono)}\n`);
  }

  add(makeSeparator('='));

  // 3. Información del Ticket
  add(CMD.ALIGN_CENTER);
  add(CMD.BOLD_ON);
  add(CMD.TEXT_DOUBLE_HEIGHT);
  add(`FACTURA: ${factura.numero_factura || 'S/N'}\n`);
  add(CMD.TEXT_NORMAL);
  add(CMD.BOLD_OFF);

  add(CMD.ALIGN_LEFT);
  const fechaStr = factura.fecha_emision 
    ? new Date(factura.fecha_emision).toLocaleString('es-VE')
    : new Date().toLocaleString('es-VE');
  add(makeRow(`Fecha: ${fechaStr}`, `Caja/Vend: ${vendedor.nombre_completo || 'General'}`));

  if (cliente.nombre) {
    add(`Cliente: ${sanitizeText(cliente.nombre)}\n`);
    const doc = cliente.documento_identidad || cliente.rif || 'S/D';
    add(makeRow(`Doc/RIF: ${doc}`, cliente.telefono ? `Tel: ${cliente.telefono}` : ''));
  } else {
    add('Cliente: CLIENTE DE CONTADO / FINAL\n');
  }

  add(makeSeparator('-'));

  // 4. Tabla de Productos (Cant | Descripción | Total)
  // Formato cabecera: "Cant  Descripcion                       Total"
  add(CMD.BOLD_ON);
  add('CANT  DESCRIPCION                          TOTAL\n');
  add(CMD.BOLD_OFF);
  add(makeSeparator('-'));

  detalles.forEach(item => {
    const cant = String(item.cantidad || 1).padStart(4, ' ');
    const nombre = sanitizeText(item.producto_nombre || item.nombre || 'Producto');
    const precio = parseFloat(item.subtotal_usd || (item.cantidad * item.precio_unitario_usd) || 0).toFixed(2);
    const totalStr = `$${precio}`.padStart(9, ' ');

    // Espacio para descripción: 48 - (cant.len = 4) - (espacio = 2) - (totalStr = 9) = 33 chars
    const maxDesc = 33;
    let descLine1 = nombre.slice(0, maxDesc);
    const descLine2 = nombre.slice(maxDesc, maxDesc * 2);

    add(`${cant}  ${descLine1.padEnd(maxDesc, ' ')}${totalStr}\n`);
    if (descLine2) {
      add(`      ${descLine2}\n`);
    }

    // Si es combo o tiene desglose de productos incluidos, imprimirlos sin precio
    if ((item.es_combo || (item.items_combo && item.items_combo.length > 0)) && Array.isArray(item.items_combo)) {
      add('      Contiene:\n');
      item.items_combo.forEach(ci => {
        const itemCantTotal = (ci.cantidad || 1) * (item.cantidad || 1);
        const subProdNombre = sanitizeText(ci.nombre || 'Articulo').slice(0, 36);
        add(`       - ${itemCantTotal}x ${subProdNombre}\n`);
      });
    }
  });

  add(makeSeparator('-'));

  // 5. Totales
  const totalUSD = parseFloat(factura.total_usd || 0).toFixed(2);
  const totalBs = parseFloat(factura.total_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tasaVal = tasa?.tasa_usd_bs || (factura.total_bs && factura.total_usd ? (factura.total_bs / factura.total_usd) : null);

  add(CMD.ALIGN_LEFT);
  add(makeRow('SUBTOTAL USD:', `$${totalUSD}`));

  if (factura.descuento_usd && parseFloat(factura.descuento_usd) > 0) {
    add(makeRow('DESCUENTO USD:', `-$${parseFloat(factura.descuento_usd).toFixed(2)}`));
  }

  add(CMD.BOLD_ON);
  add(CMD.TEXT_DOUBLE);
  add(makeRow('TOTAL USD:', `$${totalUSD}`));
  add(CMD.TEXT_NORMAL);
  add(CMD.BOLD_OFF);

  if (tasaVal) {
    add(makeRow('Tasa BCV:', `${parseFloat(tasaVal).toFixed(4)} Bs/USD`));
  }
  add(CMD.BOLD_ON);
  add(makeRow('TOTAL BS:', `${totalBs} Bs`));
  add(CMD.BOLD_OFF);

  add(makeSeparator('-'));

  // 6. Métodos de Pago
  const metodos = Array.isArray(factura.metodos_pago) ? factura.metodos_pago : [];
  if (metodos.length > 0) {
    add(CMD.BOLD_ON);
    add('METODOS DE PAGO:\n');
    add(CMD.BOLD_OFF);

    metodos.forEach(m => {
      const nombreMetodo = sanitizeText(m.metodo || m.metodo_id || 'Pago');
      const usdStr = m.monto_usd ? `$${parseFloat(m.monto_usd).toFixed(2)}` : '';
      const bsStr = m.monto_bs ? `(${parseFloat(m.monto_bs).toFixed(2)} Bs)` : '';
      const refStr = m.referencia ? ` [Ref: ${sanitizeText(m.referencia)}]` : '';
      add(makeRow(`* ${nombreMetodo}${refStr}:`, `${usdStr} ${bsStr}`.trim()));
    });
    add(makeSeparator('-'));
  }

  // 7. Pie de página
  add(CMD.ALIGN_CENTER);
  add('¡GRACIAS POR SU COMPRA!\n');
  add('Revise su mercancia al momento de retirar.\n');
  add('DJ7 System - Sistema de Facturacion\n');

  // 8. Alimentar papel y cortar
  add(CMD.FEED_LINE);
  add(CMD.FEED_LINE);
  add(CMD.FEED_LINE);
  add(CMD.FEED_LINE);

  if (cutPaper !== false) {
    add(CMD.CUT_PAPER);
  }

  return Buffer.concat(chunks);
}

module.exports = {
  generateEscPosFactura,
  CMD
};
