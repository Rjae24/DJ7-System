import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatUSD, formatBs, formatFecha, formatTasa } from '../utils/formatters';
import toast from 'react-hot-toast';
import TicketFactura from '../components/print/TicketFactura';
import {
  HiOutlineMagnifyingGlass, HiOutlinePrinter, HiOutlineEye,
  HiOutlineXCircle, HiOutlineFunnel,
} from 'react-icons/hi2';

export default function HistorialFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [showDetalle, setShowDetalle] = useState(null);
  const [showTicket, setShowTicket] = useState(null);

  useEffect(() => { loadFacturas(); }, []);

  async function loadFacturas() {
    setLoading(true);
    const { data } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes(nombre, documento_identidad),
        usuarios!facturas_vendedor_id_fkey(nombre_completo),
        tasas_cambio(tasa_usd_bs, fecha_registro)
      `)
      .order('fecha_emision', { ascending: false })
      .limit(200);
    setFacturas(data || []);
    setLoading(false);
  }

  async function verDetalle(factura) {
    const { data: detalles } = await supabase
      .from('detalles_factura')
      .select('*')
      .eq('factura_id', factura.id);
    setShowDetalle({ ...factura, detalles: detalles || [] });
  }

  async function anularFactura(factura) {
    if (!confirm(`¿Anular la factura ${factura.numero_factura}? El stock será revertido.`)) return;
    try {
      const { error } = await supabase
        .from('facturas')
        .update({ estado: 'anulada' })
        .eq('id', factura.id);
      if (error) throw error;
      toast.success('Factura anulada');
      loadFacturas();
      setShowDetalle(null);
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function imprimirFactura(factura) {
    try {
      let detalles = factura.detalles;
      if (!detalles || detalles.length === 0) {
        const { data } = await supabase
          .from('detalles_factura')
          .select('*')
          .eq('factura_id', factura.id);
        detalles = data || [];
      }
      const ticketData = {
        ...factura,
        cliente: factura.clientes || factura.cliente,
        vendedor: factura.usuarios || factura.vendedor,
        tasa: factura.tasas_cambio || factura.tasa,
        detalles: detalles,
        metodos_pago_detalle: factura.metodos_pago,
      };
      setShowTicket(ticketData);
    } catch (e) {
      toast.error('Error al preparar impresión: ' + e.message);
    }
  }

  const facturasFiltradas = facturas.filter(f => {
    const matchSearch = !search ||
      f.numero_factura.toLowerCase().includes(search.toLowerCase()) ||
      f.clientes?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      f.usuarios?.nombre_completo?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !filtroEstado || f.estado === filtroEstado;
    const matchDesde = !filtroFechaDesde || new Date(f.fecha_emision) >= new Date(filtroFechaDesde);
    const matchHasta = !filtroFechaHasta || new Date(f.fecha_emision) <= new Date(filtroFechaHasta + 'T23:59:59');
    return matchSearch && matchEstado && matchDesde && matchHasta;
  });

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Cargando historial...</p></div>;

  return (
    <div className="page">
      {showTicket && (
        <TicketFactura factura={showTicket} onClose={() => setShowTicket(null)} />
      )}

      <div className="page__header">
        <h1 className="page__title">Historial de Facturas</h1>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineMagnifyingGlass className="search-box__icon" />
          <input placeholder="Buscar por número, cliente o vendedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="emitida">Emitida</option>
          <option value="anulada">Anulada</option>
        </select>
        <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
        <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>N° Factura</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Total USD</th>
                <th>Total Bs</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map(f => (
                <tr key={f.id} className={f.estado === 'anulada' ? 'table__row--muted' : ''}>
                  <td><code>{f.numero_factura}</code></td>
                  <td>{f.clientes?.nombre}</td>
                  <td>{f.usuarios?.nombre_completo}</td>
                  <td>{formatUSD(f.total_usd)}</td>
                  <td>{formatBs(f.total_bs)}</td>
                  <td>
                    <span className={`badge badge--${f.estado === 'emitida' ? 'success' : 'danger'}`}>
                      {f.estado.charAt(0).toUpperCase() + f.estado.slice(1)}
                    </span>
                  </td>
                  <td>{formatFecha(f.fecha_emision, true)}</td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--ghost btn--xs" onClick={() => verDetalle(f)} title="Ver detalle"><HiOutlineEye /></button>
                      {f.estado === 'emitida' && (
                        <>
                          <button className="btn btn--ghost btn--xs" onClick={() => imprimirFactura(f)} title="Imprimir Ticket"><HiOutlinePrinter /></button>
                          <button className="btn btn--ghost btn--xs text-danger" onClick={() => anularFactura(f)} title="Anular"><HiOutlineXCircle /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {facturasFiltradas.length === 0 && <tr><td colSpan="8" className="table__empty">No se encontraron facturas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetalle && (
        <div className="modal-overlay" onClick={() => setShowDetalle(null)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Factura {showDetalle.numero_factura}</h2>
              <span className={`badge badge--${showDetalle.estado === 'emitida' ? 'success' : 'danger'}`}>
                {showDetalle.estado}
              </span>
            </div>
            <div className="modal__form">
              <div className="form-row">
                <p><strong>Cliente:</strong> {showDetalle.clientes?.nombre} ({showDetalle.clientes?.documento_identidad})</p>
                <p><strong>Vendedor:</strong> {showDetalle.usuarios?.nombre_completo}</p>
              </div>
              <p><strong>Fecha:</strong> {formatFecha(showDetalle.fecha_emision, true)}</p>
              <p><strong>Tasa:</strong> {formatTasa(showDetalle.tasas_cambio?.tasa_usd_bs)}</p>

              <h4 style={{ marginTop: '1rem' }}>Productos</h4>
              <table className="table">
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {(showDetalle.detalles || []).map(d => (
                    <tr key={d.id}>
                      <td>{d.producto_nombre}</td>
                      <td>{d.cantidad}</td>
                      <td>{formatUSD(d.precio_unitario_usd)}</td>
                      <td>{formatUSD(d.subtotal_usd || d.cantidad * d.precio_unitario_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pos-totals" style={{ marginTop: '1rem' }}>
                <div className="pos-totals__row pos-totals__row--total"><span>Total USD:</span><span>{formatUSD(showDetalle.total_usd)}</span></div>
                <div className="pos-totals__row pos-totals__row--bs"><span>Total Bs:</span><span>{formatBs(showDetalle.total_bs)}</span></div>
              </div>

              <h4 style={{ marginTop: '1rem' }}>Métodos de Pago</h4>
              {(showDetalle.metodos_pago || []).map((mp, i) => (
                <div key={i} className="pos-totals__row">
                  <span>{mp.metodo}{mp.referencia ? ` (Ref: ${mp.referencia})` : ''}</span>
                  <span>{formatUSD(mp.monto_usd)}</span>
                </div>
              ))}

              <div className="pos-payment-actions" style={{ marginTop: '1.5rem' }}>
                {showDetalle.estado === 'emitida' && (
                  <>
                    <button className="btn btn--primary" onClick={() => imprimirFactura(showDetalle)}>
                      <HiOutlinePrinter /> Imprimir Ticket
                    </button>
                    <button className="btn btn--ghost text-danger" onClick={() => anularFactura(showDetalle)}>
                      <HiOutlineXCircle /> Anular Factura
                    </button>
                  </>
                )}
                <button className="btn btn--ghost" onClick={() => setShowDetalle(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
