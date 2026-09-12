import { useState } from 'react';
import { getEmpresaConfig, PRINT_WIDTHS } from '../../utils/constants';
import { formatUSD, formatBs, formatFecha, formatTasa } from '../../utils/formatters';
import { HiOutlinePrinter, HiOutlineXMark } from 'react-icons/hi2';

export default function TicketFactura({ factura, onClose }) {
  const config = PRINT_WIDTHS['58mm'];
  const empresa = getEmpresaConfig();
  const logoUrl = '/logo-dj7-solo.png';

  function handlePrint() {
    const ticketElem = document.getElementById('ticket-container');
    if (!ticketElem) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Factura - ${factura.numero_factura || ''}</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body {
              margin: 0;
              padding: 3mm 2mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              background: #fff;
              width: ${config.width};
            }
            * {
              box-sizing: border-box;
            }
            .ticket__header {
              text-align: center;
              margin-bottom: 6px;
            }
            .ticket__logo {
              display: block;
              margin: 0 auto 5px auto;
              max-width: 54px;
              width: auto;
              height: auto;
              object-fit: contain;
            }
            .ticket__empresa {
              font-weight: bold;
              font-size: 12px;
            }
            .ticket__divider {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }
            .ticket__info {
              margin-bottom: 4px;
            }
            .ticket__row {
              display: flex;
              justify-content: space-between;
              gap: 4px;
            }
            .ticket__row--bold {
              font-weight: bold;
              font-size: 12px;
            }
            .ticket__items {
              width: 100%;
              border-collapse: collapse;
            }
            .ticket__items th {
              font-size: 9px;
              border-bottom: 1px solid #000;
              padding: 2px 0;
              text-transform: uppercase;
            }
            .ticket__items td {
              padding: 2px 0;
              font-size: 9.5px;
              vertical-align: top;
            }
            .ticket__item-sub {
              font-size: 8.5px;
              color: #444;
              margin-top: 1px;
            }
            .ticket__totals {
              margin: 4px 0;
            }
            .ticket__section-title {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 2px;
            }
            .ticket__ref {
              font-size: 9px;
              color: #444;
              padding-left: 6px;
            }
            .ticket__footer {
              text-align: center;
              margin-top: 8px;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          ${ticketElem.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 250);
  }

  // Normalize details
  const detalles = factura.detalles || factura.detalles_factura || [];
  const cliente = factura.cliente || factura.clientes;
  const vendedor = factura.vendedor || factura.usuarios;
  const tasa = factura.tasa || factura.tasas_cambio;
  const metodosPago = factura.metodos_pago_detalle || factura.metodos_pago || [];

  // Cantidad total de unidades/productos vendidos
  const totalCantidad = detalles.reduce((sum, item) => sum + (parseFloat(item.cantidad) || 0), 0);

  return (
    <div className="ticket-overlay">
      <div className="ticket-controls no-print">
        <div className="ticket-controls__options">
          <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Formato: 58mm (Térmico)</span>
        </div>
        <div className="ticket-controls__actions">
          <button className="btn btn--primary" onClick={handlePrint}>
            <HiOutlinePrinter /> Imprimir Ticket
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            <HiOutlineXMark /> Cerrar
          </button>
        </div>
      </div>

      <div id="ticket-container" className="ticket" style={{ width: config.width }}>
        {/* Header */}
        <div className="ticket__header">
          <img src={logoUrl} alt="Logo" className="ticket__logo" />
          <div className="ticket__empresa">{empresa.nombre}</div>
          <div style={{ fontSize: '9px', color: '#555' }}>RIF: {empresa.rif}</div>
          <div style={{ fontSize: '9px', color: '#555' }}>{empresa.direccion}</div>
          {empresa.telefono && (
            <div style={{ fontSize: '9px', color: '#555' }}>Tlf: {empresa.telefono}</div>
          )}
        </div>

        <div className="ticket__divider" />

        {/* Invoice Info */}
        <div className="ticket__info">
          <div className="ticket__row">
            <span>Factura:</span>
            <span><strong>{factura.numero_factura}</strong></span>
          </div>
          <div className="ticket__row">
            <span>Fecha:</span>
            <span>{formatFecha(factura.fecha_emision || new Date(), true)}</span>
          </div>
          <div className="ticket__row">
            <span>Vendedor:</span>
            <span>{vendedor?.nombre_completo || 'Vendedor DJ7'}</span>
          </div>
        </div>

        <div className="ticket__divider" />

        {/* Client Info */}
        <div className="ticket__info">
          <div className="ticket__row">
            <span>Cliente:</span>
            <span>{cliente?.nombre || 'Consumidor Final'}</span>
          </div>
          <div className="ticket__row">
            <span>CI/RIF:</span>
            <span>{cliente?.documento_identidad || 'N/A'}</span>
          </div>
          {cliente?.telefono && (
            <div className="ticket__row">
              <span>Tlf:</span>
              <span>{cliente.telefono}</span>
            </div>
          )}
        </div>

        <div className="ticket__divider" />

        {/* Items */}
        <table className="ticket__items">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '50%' }}>Descripción</th>
              <th style={{ textAlign: 'center', width: '15%' }}>Cant</th>
              <th style={{ textAlign: 'right', width: '17%' }}>P.Unit</th>
              <th style={{ textAlign: 'right', width: '18%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((item, i) => {
              const precio = item.precio_unitario || item.precio_unitario_usd || 0;
              const subtotal = item.subtotal || item.subtotal_usd || (item.cantidad * precio);
              return (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>
                    {item.producto_nombre || item.nombre}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>{formatUSD(precio)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatUSD(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ticket__divider" />

        {/* Totals */}
        <div className="ticket__totals">
          <div className="ticket__row">
            <span>Cant. Artículos:</span>
            <span><strong>{totalCantidad} und.</strong></span>
          </div>
          {factura.descuento_usd > 0 ? (
            <>
              <div className="ticket__row">
                <span>Subtotal:</span>
                <span>{formatUSD(factura.subtotal_usd || factura.total_usd)}</span>
              </div>
              <div className="ticket__row">
                <span>Descuento:</span>
                <span>-{formatUSD(factura.descuento_usd)}</span>
              </div>
            </>
          ) : null}
          <div className="ticket__row ticket__row--bold">
            <span>Total USD:</span>
            <span>{formatUSD(factura.total_usd)}</span>
          </div>
          <div className="ticket__row">
            <span>Tasa BCV:</span>
            <span>{formatTasa(tasa?.tasa_usd_bs || tasa)}</span>
          </div>
          <div className="ticket__row ticket__row--bold">
            <span>Total Bs:</span>
            <span>{formatBs(factura.total_bs)}</span>
          </div>
        </div>

        <div className="ticket__divider" />

        {/* Payment Methods */}
        <div className="ticket__payments">
          <div className="ticket__section-title">PAGOS:</div>
          {metodosPago.map((mp, i) => (
            <div key={i} className="ticket__payment-item">
              <div className="ticket__row">
                <span>{mp.metodo_id === 'cashea' ? 'Cashea (Inicial)' : mp.metodo}:</span>
                <span>{formatUSD(mp.monto_usd)}</span>
              </div>
              {mp.monto_bs && (
                <div className="ticket__ref" style={{ color: '#666' }}>
                  Eq. {formatBs(mp.monto_bs)}
                </div>
              )}
              {mp.metodo_id === 'cashea' && (
                <>
                  <div className="ticket__ref" style={{ fontWeight: '600' }}>
                    Método Inicial: {mp.cashea_metodo_inicial_label || mp.cashea_metodo_inicial || 'Punto de Venta'}
                  </div>
                  {mp.cashea_referencia_inicial && (
                    <div className="ticket__ref">Ref. Inicial: {mp.cashea_referencia_inicial}</div>
                  )}
                  {mp.credito_cashea_usd > 0 && (
                    <div className="ticket__ref" style={{ fontWeight: 'bold' }}>
                      Crédito Cashea: {formatUSD(mp.credito_cashea_usd)} ({formatBs(mp.credito_cashea_bs)})
                    </div>
                  )}
                </>
              )}
              {mp.zelle_titular && (
                <div className="ticket__ref">Emisor: {mp.zelle_titular}</div>
              )}
              {mp.zelle_email && (
                <div className="ticket__ref">Correo: {mp.zelle_email}</div>
              )}
              {mp.referencia && (
                <div className="ticket__ref">
                  {mp.metodo_id === 'cashea' ? 'Orden Cashea: ' : 'Ref: '}{mp.referencia}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="ticket__divider" />

        {/* Footer */}
        <div className="ticket__footer">
          <p style={{ fontWeight: '600', marginBottom: '2px' }}>{empresa.slogan}</p>
          <p style={{ fontSize: '8px', color: '#666' }}>Documento de entrega / comprobante de venta interno</p>
        </div>
      </div>
    </div>
  );
}

