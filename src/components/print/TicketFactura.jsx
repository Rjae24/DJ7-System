import { useState } from 'react';
import { getEmpresaConfig, PRINT_WIDTHS } from '../../utils/constants';
import { formatUSD, formatBs, formatFecha, formatTasa } from '../../utils/formatters';
import { HiOutlinePrinter, HiOutlineXMark } from 'react-icons/hi2';

export default function TicketFactura({ factura, onClose, initialWidth = '80mm' }) {
  const [selectedWidth, setSelectedWidth] = useState(initialWidth);
  const config = PRINT_WIDTHS[selectedWidth] || PRINT_WIDTHS['80mm'];
  const empresa = getEmpresaConfig();

  function handlePrint() {
    window.print();
  }

  // Normalize details
  const detalles = factura.detalles || factura.detalles_factura || [];
  const cliente = factura.cliente || factura.clientes;
  const vendedor = factura.vendedor || factura.usuarios;
  const tasa = factura.tasa || factura.tasas_cambio;
  const metodosPago = factura.metodos_pago_detalle || factura.metodos_pago || [];

  // Calculate IVA & breakdown if not explicitly present on the object
  const gravados = detalles.filter(d => d.aplica_iva !== false);
  const exentos = detalles.filter(d => d.aplica_iva === false);

  const subtotalGravadoUSD = factura.subtotal_gravado_usd ?? gravados.reduce((sum, item) => {
    const p = item.precio_unitario || item.precio_unitario_usd || 0;
    return sum + (item.subtotal || item.subtotal_usd || item.cantidad * p);
  }, 0);

  const subtotalExentoUSD = factura.subtotal_exento_usd ?? exentos.reduce((sum, item) => {
    const p = item.precio_unitario || item.precio_unitario_usd || 0;
    return sum + (item.subtotal || item.subtotal_usd || item.cantidad * p);
  }, 0);

  const ivaUSD = factura.iva_usd ?? gravados.reduce((sum, item) => {
    const p = item.precio_unitario || item.precio_unitario_usd || 0;
    const sub = item.subtotal || item.subtotal_usd || item.cantidad * p;
    const pct = item.porcentaje_iva ?? empresa.iva_porcentaje ?? 16;
    return sum + (sub * (pct / 100));
  }, 0);

  return (
    <div className="ticket-overlay">
      <div className="ticket-controls no-print">
        <div className="ticket-controls__options">
          <label style={{ marginRight: '6px' }}>Formato:</label>
          <button
            className={`btn btn--xs ${selectedWidth === '80mm' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setSelectedWidth('80mm')}
          >
            80mm
          </button>
          <button
            className={`btn btn--xs ${selectedWidth === '58mm' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setSelectedWidth('58mm')}
          >
            58mm
          </button>
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
          {empresa.logo && <img src={empresa.logo} alt="Logo" className="ticket__logo" />}
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
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'center' }}>Cant</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((item, i) => {
              const precio = item.precio_unitario || item.precio_unitario_usd || 0;
              const subtotal = item.subtotal || item.subtotal_usd || (item.cantidad * precio);
              const isExento = item.aplica_iva === false;
              return (
                <tr key={i}>
                  <td>
                    {item.producto_nombre || item.nombre}
                    <span style={{ fontSize: '8px', color: '#777', marginLeft: '3px' }}>
                      ({isExento ? 'E' : 'G'})
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>{formatUSD(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ticket__divider" />

        {/* Totals */}
        <div className="ticket__totals">
          <div className="ticket__row">
            <span>Subtotal:</span>
            <span>{formatUSD(factura.subtotal_usd || (subtotalGravadoUSD + subtotalExentoUSD))}</span>
          </div>
          {subtotalGravadoUSD > 0 && (
            <div className="ticket__row" style={{ fontSize: '9px', color: '#555' }}>
              <span>Base Imp. (G):</span>
              <span>{formatUSD(subtotalGravadoUSD)}</span>
            </div>
          )}
          {subtotalExentoUSD > 0 && (
            <div className="ticket__row" style={{ fontSize: '9px', color: '#555' }}>
              <span>Exento (E):</span>
              <span>{formatUSD(subtotalExentoUSD)}</span>
            </div>
          )}
          {ivaUSD > 0 && (
            <div className="ticket__row">
              <span>IVA ({empresa.iva_porcentaje || 16}%):</span>
              <span>{formatUSD(ivaUSD)}</span>
            </div>
          )}
          {factura.descuento_usd > 0 && (
            <div className="ticket__row">
              <span>Descuento:</span>
              <span>-{formatUSD(factura.descuento_usd)}</span>
            </div>
          )}
          <div className="ticket__row ticket__row--bold">
            <span>Total USD:</span>
            <span>{formatUSD(factura.total_usd)}</span>
          </div>
          <div className="ticket__row">
            <span>Tasa BCV:</span>
            <span>Bs {formatTasa(tasa?.tasa_usd_bs || tasa)}</span>
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
                <span>{mp.metodo}:</span>
                <span>{formatUSD(mp.monto_usd)}</span>
              </div>
              {mp.monto_bs && (
                <div className="ticket__ref" style={{ color: '#666' }}>
                  Eq. {formatBs(mp.monto_bs)}
                </div>
              )}
              {mp.referencia && (
                <div className="ticket__ref">Ref: {mp.referencia}</div>
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

