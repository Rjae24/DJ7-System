/**
 * Estilos CSS para la impresión y vista del Ticket Térmico de 80mm
 * Extraído para mantener modularidad y evitar sobrepasar el límite de 600 líneas (SRP)
 */
export function getTicketThermalStyles(configWidth = '80mm') {
  return `
    @page {
      margin: 0;
      size: ${configWidth} auto;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 4mm 3mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      line-height: 1.35;
      color: #000 !important;
      background: #fff;
      width: ${configWidth};
      max-width: ${configWidth};
      font-weight: bold !important;
    }
    .ticket__header {
      text-align: center;
      margin-bottom: 6px;
      font-weight: bold !important;
    }
    .ticket__logo {
      display: block;
      margin: 0 auto 5px auto;
      max-width: 65px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .ticket__empresa {
      font-weight: bold !important;
      font-size: 13.5px;
    }
    .ticket__divider {
      border-top: 1.5px dashed #000;
      margin: 6px 0;
    }
    .ticket__info {
      margin-bottom: 5px;
      font-weight: bold !important;
    }
    .ticket__row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      font-weight: bold !important;
    }
    .ticket__row--bold {
      font-weight: bold !important;
      font-size: 13px;
    }
    .ticket__items {
      width: 100%;
      border-collapse: collapse;
      font-weight: bold !important;
    }
    .ticket__items th {
      font-size: 10.5px;
      border-bottom: 1.5px solid #000;
      padding: 3px 0;
      text-transform: uppercase;
      font-weight: bold !important;
    }
    .ticket__items td {
      padding: 3px 0;
      font-size: 11px;
      vertical-align: top;
      font-weight: bold !important;
    }
    .ticket__item-sub {
      font-size: 10px;
      color: #000 !important;
      font-weight: bold !important;
      margin-top: 1px;
    }
    .ticket__combo-breakdown {
      font-size: 9.5px !important;
      padding-left: 6px;
      margin-top: 2px;
      line-height: 1.25;
      color: #000 !important;
      font-weight: bold !important;
    }
    .ticket__totals {
      margin: 6px 0;
      font-weight: bold !important;
    }
    .ticket__section-title {
      font-weight: bold !important;
      font-size: 11.5px;
      margin-bottom: 3px;
    }
    .ticket__ref {
      font-size: 10.5px;
      color: #000 !important;
      font-weight: bold !important;
      padding-left: 6px;
    }
    .ticket__cashea-box {
      border: 1px dashed #000 !important;
      padding: 4px 6px !important;
      margin: 5px 0 !important;
    }
    .ticket__cashea-title {
      font-weight: bold !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      border-bottom: 1px solid #000 !important;
      padding-bottom: 2px !important;
      margin-bottom: 4px !important;
    }
    .ticket__cashea-deuda {
      margin-top: 4px !important;
      padding-top: 3px !important;
      border-top: 1px dotted #000 !important;
      font-weight: bold !important;
    }
    .ticket__cashea-note {
      font-size: 9px !important;
      font-style: italic !important;
      margin-top: 2px !important;
      color: #000 !important;
    }
    .ticket__footer {
      text-align: center;
      margin-top: 8px;
      font-size: 10px;
      font-weight: bold !important;
    }
  `;
}
