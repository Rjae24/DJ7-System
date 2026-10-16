import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getEmpresaConfig, saveEmpresaConfig, DEFAULT_EMPRESA, PRINT_WIDTHS } from '../../utils/constants';
import { formatUSD, formatBs, formatFecha, formatTasa } from '../../utils/formatters';
import { HiOutlinePrinter, HiOutlineXMark, HiOutlineBolt } from 'react-icons/hi2';
import { imprimirFactura } from '../../services/printService';
import { getTicketThermalStyles } from './ticketFacturaStyles';

export default function TicketFactura({ factura, onClose }) {
  const config = PRINT_WIDTHS['80mm'];
  const [empresa, setEmpresa] = useState(() => getEmpresaConfig());
  const [thermalPrinting, setThermalPrinting] = useState(false);
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
            ${getTicketThermalStyles(config.width)}
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

  async function handleThermalPrint() {
    setThermalPrinting(true);
    try {
      await imprimirFactura({
        ...factura,
        empresa,
        cliente,
        detalles,
        vendedor,
        tasa,
      });
    } catch (err) {
      // Toast ya gestionado en printService
    } finally {
      setThermalPrinting(false);
    }
  }

  return (
    <div className="ticket-overlay">
      <div className="ticket-controls no-print">
        <div className="ticket-controls__options">
          <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>Formato: 80mm (Térmico)</span>
        </div>
        <div className="ticket-controls__actions">
          <button 
            className="btn btn--primary" 
            onClick={handleThermalPrint}
            disabled={thermalPrinting}
            title="Impresión instantánea silenciosa en la impresora de recibos"
          >
            <HiOutlineBolt /> {thermalPrinting ? 'Imprimiendo...' : 'Impresión Térmica Silenciosa'}
          </button>
          <button className="btn btn--secondary" onClick={handlePrint} title="Impresión con cuadro de diálogo del navegador">
            <HiOutlinePrinter /> Navegador
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
                    <div>{item.producto_nombre || item.nombre}</div>
                    {(item.es_combo || item.items_combo?.length > 0) && (
                      <div className="ticket__combo-breakdown">
                        <div style={{ textDecoration: 'underline' }}>Contiene:</div>
                        {item.items_combo.map((ci, cIdx) => (
                          <div key={cIdx}>
                            - {ci.cantidad * item.cantidad}x {ci.nombre}
                          </div>
                        ))}
                      </div>
                    )}
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
          {(() => {
            const esMetodoEnBs = (mp) => {
              if (!mp) return false;
              const id = (mp.metodo_id || mp.id || '').toLowerCase();
              const nombre = (mp.metodo || mp.label || '').toLowerCase();
              return (
                id === 'punto_venta' ||
                id === 'pago_movil' ||
                id === 'efectivo_bs' ||
                id === 'transferencia' ||
                nombre.includes('punto') ||
                nombre.includes('pago móvil') ||
                nombre.includes('pago movil') ||
                nombre.includes('efectivo bs') ||
                nombre.includes('transferencia') ||
                nombre.includes('bolívares') ||
                nombre.includes('bolivares') ||
                mp.enBs === true
              );
            };

            const casheaItem = metodosPago.find(mp => mp.metodo_id === 'cashea' || mp.metodo?.toLowerCase?.().includes('cashea'));
            
            if (casheaItem) {
              const otrosMetodos = metodosPago.filter(mp => mp !== casheaItem);
              
              // Build breakdown of all methods used to pay the initial
              let desgloseInicial = [];
              if (Array.isArray(casheaItem.desglose_inicial) && casheaItem.desglose_inicial.length > 0) {
                desgloseInicial = casheaItem.desglose_inicial;
              } else {
                const casheaPropio = parseFloat(casheaItem.inicial_usd ?? casheaItem.monto_usd ?? 0);
                if (casheaPropio > 0 || otrosMetodos.length === 0) {
                  desgloseInicial.push({
                    metodo: casheaItem.cashea_metodo_inicial_label || casheaItem.cashea_metodo_inicial || 'Punto de Venta',
                    metodo_id: casheaItem.cashea_metodo_inicial || 'punto_venta',
                    monto_usd: casheaPropio,
                    monto_bs: casheaItem.inicial_bs || (tasaNum > 0 ? parseFloat((casheaPropio * tasaNum).toFixed(2)) : 0),
                    referencia: casheaItem.cashea_referencia_inicial,
                  });
                }
                otrosMetodos.forEach(om => {
                  const omUSD = parseFloat(om.monto_usd || 0);
                  desgloseInicial.push({
                    metodo: om.metodo,
                    metodo_id: om.metodo_id,
                    monto_usd: omUSD,
                    monto_bs: om.monto_bs || (tasaNum > 0 ? parseFloat((omUSD * tasaNum).toFixed(2)) : 0),
                    referencia: om.referencia,
                    titular: om.zelle_titular,
                  });
                });
              }

              const totalInicialUSD = desgloseInicial.reduce((s, d) => s + (parseFloat(d.monto_usd) || 0), 0);
              const totalInicialBs = tasaNum > 0 ? parseFloat((totalInicialUSD * tasaNum).toFixed(2)) : 0;

              let debiendoUSD = 0;
              if (casheaItem.credito_cashea_usd !== undefined && casheaItem.credito_cashea_usd !== null && !isNaN(Number(casheaItem.credito_cashea_usd))) {
                debiendoUSD = parseFloat(casheaItem.credito_cashea_usd);
              } else {
                debiendoUSD = Math.max(0, parseFloat(((parseFloat(factura.total_usd) || 0) - totalInicialUSD).toFixed(2)));
              }

              return (
                <div className="ticket__payment-item ticket__cashea-box" style={{ border: '1px dashed #000', padding: '4px 6px', margin: '5px 0' }}>
                  <div className="ticket__cashea-title" style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '4px' }}>
                    PAGO FINANCIADO CASHEA
                  </div>

                  {/* Inicial Pagada Total */}
                  <div className="ticket__row" style={{ fontWeight: 'bold' }}>
                    <span>Inicial Pagada:</span>
                    <span>{formatUSD(totalInicialUSD)}</span>
                  </div>
                  {totalInicialBs > 0 && (
                    <div className="ticket__ref" style={{ color: '#000', fontWeight: 'bold' }}>
                      Ref. Inicial: {formatBs(totalInicialBs)}
                    </div>
                  )}

                  {/* Desglose de Métodos de la Inicial */}
                  <div style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px dotted #000' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000', marginBottom: '2px' }}>
                      Métodos de Pago de la Inicial:
                    </div>
                    {desgloseInicial.map((di, idx) => {
                      const diUSD = parseFloat(di.monto_usd || 0);
                      const diBs = di.monto_bs !== undefined && di.monto_bs !== null && Number(di.monto_bs) > 0
                        ? Number(di.monto_bs)
                        : (tasaNum > 0 ? diUSD * tasaNum : 0);
                      const isBs = esMetodoEnBs(di);

                      return (
                        <div key={idx} className="ticket__ref" style={{ color: '#000', fontWeight: 'bold', paddingLeft: '4px' }}>
                          • {di.metodo}: {isBs ? `${formatBs(diBs)} (Ref. ${formatUSD(diUSD)})` : `${formatUSD(diUSD)}`}
                          {di.referencia ? ` (N° Op: ${di.referencia})` : ''}
                          {di.titular ? ` (Emisor: ${di.titular})` : ''}
                        </div>
                      );
                    })}
                  </div>

                  {casheaItem.referencia && (
                    <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000', marginTop: '4px', borderTop: '1px dotted #000', paddingTop: '2px' }}>
                      N° Orden Cashea: {casheaItem.referencia}
                    </div>
                  )}

                  {/* Monto Financiado Cashea */}
                  <div className="ticket__row ticket__cashea-deuda" style={{ marginTop: '4px', paddingTop: '3px', borderTop: '1px dotted #000', fontWeight: 'bold' }}>
                    <span>Monto Financiado Cashea:</span>
                    <span>{formatUSD(debiendoUSD)}</span>
                  </div>
                  <div className="ticket__cashea-note" style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '2px', color: '#000' }}>
                    * Cuotas a pagar por el cliente a través de Cashea
                  </div>
                </div>
              );
            }

            // Regular payment methods if not a Cashea sale
            return (
              <>
                <div className="ticket__section-title">PAGOS:</div>
                {metodosPago.map((mp, i) => {
                  const montoUSD = parseFloat(mp.monto_usd || 0);
                  const montoBs = mp.monto_bs !== undefined && mp.monto_bs !== null && Number(mp.monto_bs) > 0
                    ? Number(mp.monto_bs)
                    : (tasaNum > 0 ? (montoUSD * tasaNum) : 0);
                  const isBs = esMetodoEnBs(mp);

                  if (isBs) {
                    return (
                      <div key={i} className="ticket__payment-item">
                        <div className="ticket__row">
                          <span>{mp.metodo}:</span>
                          <span>{formatBs(montoBs)}</span>
                        </div>
                        <div className="ticket__ref" style={{ color: '#000', fontWeight: 'bold' }}>
                          Ref. {formatUSD(montoUSD)}
                        </div>
                        {mp.referencia && (
                          <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>
                            N° Op: {mp.referencia}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="ticket__payment-item">
                      <div className="ticket__row">
                        <span>{mp.metodo}:</span>
                        <span>{formatUSD(montoUSD)}</span>
                      </div>
                      {montoBs > 0 && (
                        <div className="ticket__ref" style={{ color: '#000', fontWeight: 'bold' }}>
                          Ref. {formatBs(montoBs)}
                        </div>
                      )}
                      {mp.zelle_titular && (
                        <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>Emisor: {mp.zelle_titular}</div>
                      )}
                      {mp.zelle_email && (
                        <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>Correo: {mp.zelle_email}</div>
                      )}
                      {mp.referencia && (
                        <div className="ticket__ref" style={{ fontWeight: 'bold', color: '#000' }}>
                          N° Op: {mp.referencia}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
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

