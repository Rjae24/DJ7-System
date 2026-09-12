import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getEmpresaConfig, saveEmpresaConfig, DEFAULT_EMPRESA, PRINT_WIDTHS } from '../../utils/constants';
import { formatUSD, formatBs, formatFecha, formatTasa } from '../../utils/formatters';
import { HiOutlinePrinter, HiOutlineXMark } from 'react-icons/hi2';

export default function TicketFactura({ factura, onClose }) {
  const config = PRINT_WIDTHS['80mm'];
  const [empresa, setEmpresa] = useState(() => getEmpresaConfig());
  const logoUrl = '/logo-dj7-solo.png';

  useEffect(() => {
    // Sincronizar con Supabase si está disponible
    supabase
      .from('configuracion_empresa')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
      .then(({ data, error }) => {
        if (data && !error) {
          const cfg = {
            nombre: data.nombre ?? DEFAULT_EMPRESA.nombre,
            rif: data.rif ?? DEFAULT_EMPRESA.rif,
            direccion: data.direccion ?? DEFAULT_EMPRESA.direccion,
            telefono: data.telefono ?? DEFAULT_EMPRESA.telefono,
            logo: data.logo || DEFAULT_EMPRESA.logo,
            slogan: data.slogan ?? DEFAULT_EMPRESA.slogan,
          };
          setEmpresa(cfg);
          saveEmpresaConfig(cfg);
        }
      })
      .catch(console.error);

    // Escuchar cambios en vivo desde la misma sesión
    const handleUpdate = (e) => {
      if (e.detail) setEmpresa(e.detail);
    };
    window.addEventListener('dj7_empresa_config_updated', handleUpdate);
    return () => window.removeEventListener('dj7_empresa_config_updated', handleUpdate);
  }, []);

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
              size: 80mm auto;
            }
            * {
              box-sizing: border-box;
              font-weight: bold !important;
              color: #000 !important;
            }
            body {
              margin: 0;
              padding: 4mm 3mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11.5px;
              line-height: 1.35;
              color: #000 !important;
              background: #fff;
              width: ${config.width};
              max-width: ${config.width};
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
            .ticket__footer {
              text-align: center;
              margin-top: 8px;
              font-size: 10px;
              font-weight: bold !important;
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

  // Determinar valor numérico de la tasa de cambio
  const getTasaValor = () => {
    if (tasa?.tasa_usd_bs) return Number(tasa.tasa_usd_bs);
    if (Array.isArray(tasa) && tasa[0]?.tasa_usd_bs) return Number(tasa[0].tasa_usd_bs);
    if (typeof tasa === 'number' && tasa > 0) return tasa;
    if (factura.tasa_usd_bs) return Number(factura.tasa_usd_bs);
    if (factura.total_usd > 0 && factura.total_bs > 0) {
      return Number(factura.total_bs) / Number(factura.total_usd);
    }
    return 0;
  };
  const tasaNum = getTasaValor();

  return (
    <div className="ticket-overlay">
      <div className="ticket-controls no-print">
        <div className="ticket-controls__options">
          <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>Formato: 80mm (Térmico)</span>
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

      <div id="ticket-container" className="ticket" style={{ width: config.width, fontWeight: 'bold' }}>
        {/* Header */}
        <div className="ticket__header">
          <img src={logoUrl} alt="Logo" className="ticket__logo" />
          <div className="ticket__empresa">{empresa.nombre}</div>
          <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#000' }}>RIF: {empresa.rif}</div>
          <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#000' }}>{empresa.direccion}</div>
          {empresa.telefono && (
            <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#000' }}>Tlf: {empresa.telefono}</div>
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
              <th style={{ textAlign: 'left', width: '42%' }}>Descripción</th>
              <th style={{ textAlign: 'center', width: '12%' }}>Cant</th>
              <th style={{ textAlign: 'right', width: '18%' }}>P.Unit</th>
              <th style={{ textAlign: 'right', width: '28%' }}>Total Bs</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((item, i) => {
              const precio = Number(item.precio_unitario || item.precio_unitario_usd || 0);
              const subtotalUSD = Number(item.subtotal || item.subtotal_usd || (item.cantidad * precio));
              const subtotalBs = item.subtotal_bs !== undefined && item.subtotal_bs !== null
                ? Number(item.subtotal_bs)
                : (tasaNum > 0 ? (subtotalUSD * tasaNum) : 0);
              return (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>
                    {item.producto_nombre || item.nombre}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>{formatUSD(precio)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {subtotalBs > 0 ? formatBs(subtotalBs) : formatUSD(subtotalUSD)}
                  </td>
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
            <span>{formatTasa(tasa?.tasa_usd_bs || tasaNum || tasa)}</span>
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
                <div className="ticket__ref" style={{ color: '#000', fontWeight: 'bold' }}>
                  Eq. {formatBs(mp.monto_bs)}
                </div>
              )}
              {mp.metodo_id === 'cashea' && (
                <>
                  <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>
                    Método Inicial: {mp.cashea_metodo_inicial_label || mp.cashea_metodo_inicial || 'Punto de Venta'}
                  </div>
                  {mp.cashea_referencia_inicial && (
                    <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>Ref. Inicial: {mp.cashea_referencia_inicial}</div>
                  )}
                  {mp.credito_cashea_usd > 0 && (
                    <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>
                      Crédito Cashea: {formatUSD(mp.credito_cashea_usd)} ({formatBs(mp.credito_cashea_bs)})
                    </div>
                  )}
                </>
              )}
              {mp.zelle_titular && (
                <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>Emisor: {mp.zelle_titular}</div>
              )}
              {mp.zelle_email && (
                <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>Correo: {mp.zelle_email}</div>
              )}
              {mp.referencia && (
                <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>
                  {mp.metodo_id === 'cashea' ? 'Orden Cashea: ' : 'Ref: '}{mp.referencia}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="ticket__divider" />

        {/* Footer */}
        <div className="ticket__footer">
          <p style={{ fontWeight: 'bold', marginBottom: '2px' }}>{empresa.slogan}</p>
          <p style={{ fontSize: '9.5px', color: '#000', fontWeight: 'bold' }}>Documento de entrega / comprobante de venta interno</p>
        </div>
      </div>
    </div>
  );
}

