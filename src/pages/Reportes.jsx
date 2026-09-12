import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatUSD, formatBs, formatFecha } from '../utils/formatters';
import toast from 'react-hot-toast';
import Pagination from '../components/common/Pagination';
import {
  HiOutlineDocumentChartBar,
  HiOutlineArrowDownTray,
  HiOutlinePrinter,
  HiOutlineCalendar,
  HiOutlineBanknotes,
  HiOutlineCreditCard,
  HiOutlineCube,
  HiOutlineExclamationTriangle,
  HiOutlineUserGroup,
  HiOutlineReceiptPercent,
  HiOutlineNoSymbol,
  HiOutlineArrowTrendingUp,
  HiOutlineChartBar,
} from 'react-icons/hi2';

// ── Date preset helpers ──────────────────────────────────────────
function getPreset(preset) {
  const now = new Date();
  const pad = d => d.toISOString().split('T')[0];
  switch (preset) {
    case 'hoy':
      return { desde: pad(now), hasta: pad(now) };
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { desde: pad(d), hasta: pad(now) };
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { desde: pad(d), hasta: pad(now) };
    }
    case 'mes': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { desde: pad(d), hasta: pad(now) };
    }
    case 'anio': {
      const d = new Date(now.getFullYear(), 0, 1);
      return { desde: pad(d), hasta: pad(now) };
    }
    default:
      return null;
  }
}

// ── Payment method badge colors ──────────────────────────────────
const METODO_COLORS = {
  'Efectivo USD': '#22C55E',
  'Zelle': '#3B82F6',
  'Punto de Venta': '#8B5CF6',
  'Pago Móvil': '#F59E0B',
  'Cashea': '#EC4899',
  'Transferencia': '#06B6D4',
};
function getMetodoColor(m) { return METODO_COLORS[m] || '#A3A3A3'; }

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ventas');
  const [activePreset, setActivePreset] = useState('30d');
  const [pageVentas, setPageVentas] = useState(1);
  const [pageInventario, setPageInventario] = useState(1);
  const [pageVendedores, setPageVendedores] = useState(1);

  // Date filters (default: last 30 days)
  const defaultPreset = getPreset('30d');
  const [fechaDesde, setFechaDesde] = useState(defaultPreset.desde);
  const [fechaHasta, setFechaHasta] = useState(defaultPreset.hasta);

  // Data
  const [ventas, setVentas] = useState([]);
  const [detallesVentas, setDetallesVentas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [tasaActual, setTasaActual] = useState(null);

  useEffect(() => { loadReportes(); }, [fechaDesde, fechaHasta]);

  async function loadReportes() {
    setLoading(true);
    try {
      const [
        { data: facturasData, error: fErr },
        { data: prodsData, error: pErr },
        { data: rateData },
      ] = await Promise.all([
        supabase
          .from('facturas')
          .select(`
            id, numero_factura, fecha_emision, estado, total_usd, total_bs, metodos_pago,
            clientes(nombre, documento_identidad),
            usuarios!facturas_vendedor_id_fkey(nombre_completo)
          `)
          .gte('fecha_emision', `${fechaDesde}T00:00:00`)
          .lte('fecha_emision', `${fechaHasta}T23:59:59`)
          .order('fecha_emision', { ascending: false }),
        supabase
          .from('productos')
          .select('id, sku, nombre, precio_usd, stock, stock_minimo, categorias(nombre)')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('tasas_cambio')
          .select('tasa_usd_bs')
          .order('fecha_registro', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (fErr) throw fErr;
      if (pErr) throw pErr;

      const facturas = facturasData || [];
      setVentas(facturas);
      setInventario(prodsData || []);
      setTasaActual(rateData);

      // Fetch detalles only for emitted invoices (max 150)
      const facturaIds = facturas
        .filter(f => f.estado === 'emitida')
        .slice(0, 150)
        .map(f => f.id);

      if (facturaIds.length > 0) {
        const { data: detallesData } = await supabase
          .from('detalles_factura')
          .select('producto_nombre, cantidad, precio_unitario_usd, subtotal_usd')
          .in('factura_id', facturaIds);
        setDetallesVentas(detallesData || []);
      } else {
        setDetallesVentas([]);
      }
    } catch (error) {
      console.error('Error cargando reportes:', error);
      toast.error('Error al cargar datos del reporte');
    } finally {
      setLoading(false);
    }
  }

  // ── Calculated Metrics ───────────────────────────────────────────
  const facturasEmitidas = ventas.filter(f => f.estado === 'emitida');
  const facturasAnuladas = ventas.filter(f => f.estado === 'anulada');

  const totalUSD = facturasEmitidas.reduce((s, f) => s + parseFloat(f.total_usd || 0), 0);
  const totalBs  = facturasEmitidas.reduce((s, f) => s + parseFloat(f.total_bs  || 0), 0);
  const ticketPromedio = facturasEmitidas.length > 0 ? totalUSD / facturasEmitidas.length : 0;

  // Payment method breakdown
  const metodosTotales = {};
  facturasEmitidas.forEach(f => {
    (f.metodos_pago || []).forEach(mp => {
      const key = mp.metodo || 'Otro';
      if (!metodosTotales[key]) metodosTotales[key] = { total_usd: 0, total_bs: 0, transacciones: 0 };
      metodosTotales[key].total_usd     += parseFloat(mp.monto_usd || 0);
      metodosTotales[key].total_bs      += parseFloat(mp.monto_bs  || 0);
      metodosTotales[key].transacciones += 1;
    });
  });
  const metodosOrdenados = Object.entries(metodosTotales)
    .map(([m, s]) => ({ metodo: m, ...s }))
    .sort((a, b) => b.total_usd - a.total_usd);
  const maxMetodoUSD = metodosOrdenados[0]?.total_usd || 1;

  // Top products sold
  const rankingProductos = {};
  detallesVentas.forEach(d => {
    const key = d.producto_nombre || 'Producto';
    if (!rankingProductos[key]) rankingProductos[key] = { cantidad: 0, total_usd: 0 };
    rankingProductos[key].cantidad   += d.cantidad;
    rankingProductos[key].total_usd  += parseFloat(d.subtotal_usd || (d.cantidad * (d.precio_unitario_usd || 0)));
  });
  const listaRanking = Object.entries(rankingProductos)
    .map(([nombre, s]) => ({ nombre, ...s }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Sellers breakdown
  const vendedoresTotales = {};
  facturasEmitidas.forEach(f => {
    const key = f.usuarios?.nombre_completo || 'Sin asignar';
    if (!vendedoresTotales[key]) vendedoresTotales[key] = { facturas: 0, total_usd: 0, total_bs: 0 };
    vendedoresTotales[key].facturas  += 1;
    vendedoresTotales[key].total_usd += parseFloat(f.total_usd || 0);
    vendedoresTotales[key].total_bs  += parseFloat(f.total_bs  || 0);
  });
  const listaVendedores = Object.entries(vendedoresTotales)
    .map(([nombre, s]) => ({ nombre, ...s }))
    .sort((a, b) => b.total_usd - a.total_usd);
  const maxVendedorUSD = listaVendedores[0]?.total_usd || 1;
  const vendedoresPage = listaVendedores.slice((pageVendedores - 1) * 20, pageVendedores * 20);

  // Inventory valuation
  const tasaBsRef = tasaActual?.tasa_usd_bs || 1;
  const valorInventarioUSD = inventario.reduce((s, p) => s + (p.stock * parseFloat(p.precio_usd || 0)), 0);
  const productosBajoStock = inventario.filter(p => p.stock <= p.stock_minimo);

  // ── Preset handler ───────────────────────────────────────────────
  function applyPreset(preset) {
    const range = getPreset(preset);
    if (!range) return;
    setActivePreset(preset);
    setFechaDesde(range.desde);
    setFechaHasta(range.hasta);
    setPageVentas(1);
    setPageVendedores(1);
  }

  function handleManualDate(field, value) {
    setActivePreset(null);
    if (field === 'desde') setFechaDesde(value);
    else setFechaHasta(value);
    setPageVentas(1);
  }

  // ── CSV Exporters ────────────────────────────────────────────────
  function exportarVentasCSV() {
    if (!facturasEmitidas.length) { toast.error('No hay ventas para exportar'); return; }
    const h = ['N° Factura','Fecha','Cliente','Vendedor','Total USD','Total Bs','Métodos'];
    const rows = facturasEmitidas.map(f => [
      `"${f.numero_factura}"`,
      `"${formatFecha(f.fecha_emision, true)}"`,
      `"${f.clientes?.nombre || 'General'}"`,
      `"${f.usuarios?.nombre_completo || 'N/A'}"`,
      f.total_usd,
      f.total_bs,
      `"${(f.metodos_pago || []).map(m => `${m.metodo}: $${m.monto_usd}`).join(' | ')}"`,
    ]);
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    descargarArchivo(csv, `ventas_${fechaDesde}_al_${fechaHasta}.csv`);
    toast.success('Reporte descargado');
  }

  function exportarInventarioCSV() {
    if (!inventario.length) { toast.error('No hay datos de inventario'); return; }
    const h = ['SKU','Nombre','Categoría','Precio USD','Stock','Stock Mín','Valor USD'];
    const rows = inventario.map(p => [
      `"${p.sku}"`, `"${p.nombre}"`, `"${p.categorias?.nombre || 'General'}"`,
      p.precio_usd, p.stock, p.stock_minimo,
      (p.stock * parseFloat(p.precio_usd || 0)).toFixed(2),
    ]);
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    descargarArchivo(csv, `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Inventario descargado');
  }

  function descargarArchivo(contenido, nombre) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.setAttribute('download', nombre);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Generando reportes...</p>
      </div>
    );
  }

  const PRESETS = [
    { id: 'hoy',  label: 'Hoy' },
    { id: '7d',   label: '7 días' },
    { id: '30d',  label: '30 días' },
    { id: 'mes',  label: 'Este mes' },
    { id: 'anio', label: 'Este año' },
  ];

  const TABS = [
    { id: 'ventas',     label: 'Ventas & Flujo',       icon: <HiOutlineArrowTrendingUp /> },
    { id: 'vendedores', label: 'Por Vendedor',          icon: <HiOutlineUserGroup /> },
    { id: 'metodos',    label: 'Métodos de Pago',       icon: <HiOutlineChartBar /> },
    { id: 'inventario', label: 'Inventario Valorizado', icon: <HiOutlineCube /> },
  ];

  return (
    <div className="page reportes-page">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="page__header no-print">
        <div>
          <h1 className="page__title">Reportes y Auditoría</h1>
          <p className="page__subtitle">Métricas de facturación, rendimiento por vendedor e inventario valorizado</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn--outline" onClick={() => window.print()} title="Imprimir informe">
            <HiOutlinePrinter /> Imprimir
          </button>
          <button
            className="btn btn--primary"
            onClick={activeTab === 'inventario' ? exportarInventarioCSV : exportarVentasCSV}
          >
            <HiOutlineArrowDownTray /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Filters & Tabs ──────────────────────────────────────── */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        {/* Date presets + custom range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HiOutlineCalendar style={{ color: '#DC2626' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#A3A3A3', whiteSpace: 'nowrap' }}>
              PERÍODO:
            </span>
          </div>
          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderColor: activePreset === p.id ? '#DC2626' : '#333',
                  background: activePreset === p.id ? 'rgba(220,38,38,0.15)' : 'transparent',
                  color: activePreset === p.id ? '#DC2626' : '#A3A3A3',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Manual date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.82rem', color: '#666' }}>Desde</span>
            <input
              type="date" value={fechaDesde}
              onChange={e => handleManualDate('desde', e.target.value)}
              style={{ background: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '0.35rem 0.55rem', fontSize: '0.82rem' }}
            />
            <span style={{ fontSize: '0.82rem', color: '#666' }}>Hasta</span>
            <input
              type="date" value={fechaHasta}
              onChange={e => handleManualDate('hasta', e.target.value)}
              style={{ background: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '0.35rem 0.55rem', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '0.35rem', background: '#0D0D0D', padding: '4px', borderRadius: '10px', border: '1px solid #1F1F1F' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.9rem', borderRadius: '7px', border: 'none',
                fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
                background: activeTab === tab.id ? '#DC2626' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#777',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Printable header ────────────────────────────────────── */}
      <div className="print-report-header" style={{ display: 'none' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>COMERCIALIZADORA DJ7 C.A.</h2>
        <h3 style={{ fontSize: '14px', margin: '4px 0' }}>REPORTE DE GESTIÓN EMPRESARIAL</h3>
        <p style={{ fontSize: '11px', color: '#555' }}>
          Período: {formatFecha(fechaDesde)} al {formatFecha(fechaHasta)} | Generado: {formatFecha(new Date(), true)}
        </p>
        <hr style={{ margin: '10px 0', borderColor: '#ccc' }} />
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--primary"><HiOutlineBanknotes /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Facturación USD</span>
            <span className="stat-card__value">{formatUSD(totalUSD)}</span>
            <span className="stat-card__sub">{facturasEmitidas.length} facturas emitidas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--success"><HiOutlineCreditCard /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Facturación Bs</span>
            <span className="stat-card__value">{formatBs(totalBs)}</span>
            <span className="stat-card__sub">Al cambio de cada operación</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--info"><HiOutlineDocumentChartBar /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Ticket Promedio</span>
            <span className="stat-card__value">{formatUSD(ticketPromedio)}</span>
            <span className="stat-card__sub">Promedio por venta</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: facturasAnuladas.length > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
          <div className="stat-card__icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
            <HiOutlineNoSymbol />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Facturas Anuladas</span>
            <span className="stat-card__value" style={{ color: facturasAnuladas.length > 0 ? '#EF4444' : undefined }}>
              {facturasAnuladas.length}
            </span>
            <span className="stat-card__sub">
              {facturasAnuladas.length > 0
                ? `${formatUSD(facturasAnuladas.reduce((s, f) => s + parseFloat(f.total_usd || 0), 0))} anulados`
                : 'Sin anulaciones'}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — Ventas & Flujo
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'ventas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Products */}
          <div className="card">
            <h3 className="card__title">
              <HiOutlineReceiptPercent style={{ marginRight: '0.5rem', color: '#DC2626' }} />
              Top Productos Vendidos en el Período
            </h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Unidades</th>
                    <th style={{ textAlign: 'right' }}>Total (USD)</th>
                    <th style={{ textAlign: 'right' }}>% Aporte</th>
                  </tr>
                </thead>
                <tbody>
                  {listaRanking.slice(0, 10).map((prod, idx) => {
                    const pct = totalUSD > 0 ? ((prod.total_usd / totalUSD) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ color: idx < 3 ? '#DC2626' : '#555', fontWeight: '700', textAlign: 'center' }}>
                          {idx + 1}
                        </td>
                        <td><strong>{prod.nombre}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge--primary">{prod.cantidad} uds</span>
                        </td>
                        <td style={{ textAlign: 'right' }}><strong>{formatUSD(prod.total_usd)}</strong></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <div style={{ width: '60px', height: '6px', background: '#1F1F1F', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#DC2626', borderRadius: '3px' }} />
                            </div>
                            <span style={{ color: '#A3A3A3', fontSize: '0.82rem', minWidth: '36px' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {listaRanking.length === 0 && (
                    <tr><td colSpan="5" className="table__empty">No hay ventas registradas en el período seleccionado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices Log */}
          <div className="card">
            <h3 className="card__title">Desglose de Facturas ({ventas.length} en el período)</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th style={{ textAlign: 'right' }}>Total USD</th>
                    <th style={{ textAlign: 'right' }}>Total Bs</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.slice((pageVentas - 1) * 20, pageVentas * 20).map(f => (
                    <tr key={f.id} className={f.estado === 'anulada' ? 'table__row--muted' : ''}>
                      <td><code>{f.numero_factura}</code></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatFecha(f.fecha_emision, true)}</td>
                      <td>{f.clientes?.nombre || 'Consumidor Final'}</td>
                      <td>{f.usuarios?.nombre_completo || '—'}</td>
                      <td style={{ textAlign: 'right' }}><strong>{formatUSD(f.total_usd)}</strong></td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{formatBs(f.total_bs)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge--${f.estado === 'emitida' ? 'success' : 'danger'}`}>
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ventas.length === 0 && (
                    <tr><td colSpan="7" className="table__empty">No se encontraron facturas en este rango</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={pageVentas} totalItems={ventas.length} pageSize={20} onPageChange={p => { setPageVentas(p); }} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — Por Vendedor
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'vendedores' && (
        <div className="card">
          <h3 className="card__title">
            <HiOutlineUserGroup style={{ marginRight: '0.5rem', color: '#DC2626' }} />
            Rendimiento por Vendedor
          </h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vendedor</th>
                  <th style={{ textAlign: 'center' }}>Facturas</th>
                  <th style={{ textAlign: 'right' }}>Total USD</th>
                  <th style={{ textAlign: 'right' }}>Total Bs</th>
                  <th style={{ textAlign: 'right' }}>Ticket Promedio</th>
                  <th>Participación</th>
                </tr>
              </thead>
              <tbody>
                {vendedoresPage.map((v, idx) => {
                  const pct = totalUSD > 0 ? ((v.total_usd / totalUSD) * 100).toFixed(1) : 0;
                  const barWidth = maxVendedorUSD > 0 ? ((v.total_usd / maxVendedorUSD) * 100).toFixed(1) : 0;
                  const ticket  = v.facturas > 0 ? v.total_usd / v.facturas : 0;
                  const rank    = (pageVendedores - 1) * 20 + idx + 1;
                  return (
                    <tr key={v.nombre}>
                      <td style={{ color: rank <= 3 ? '#DC2626' : '#555', fontWeight: '700', textAlign: 'center' }}>{rank}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'rgba(220,38,38,0.15)', color: '#DC2626',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '0.82rem', flexShrink: 0,
                          }}>
                            {v.nombre.charAt(0).toUpperCase()}
                          </div>
                          <strong>{v.nombre}</strong>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge--primary">{v.facturas}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}><strong>{formatUSD(v.total_usd)}</strong></td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{formatBs(v.total_bs)}</td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{formatUSD(ticket)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ flex: 1, height: '8px', background: '#1F1F1F', borderRadius: '4px', overflow: 'hidden', minWidth: '80px' }}>
                            <div style={{ width: `${barWidth}%`, height: '100%', background: '#DC2626', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#A3A3A3', minWidth: '38px' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {listaVendedores.length === 0 && (
                  <tr><td colSpan="7" className="table__empty">No hay datos de vendedores en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={pageVendedores} totalItems={listaVendedores.length} pageSize={20} onPageChange={setPageVendedores} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3 — Métodos de Pago
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'metodos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Visual chart */}
          <div className="card">
            <h3 className="card__title">
              <HiOutlineChartBar style={{ marginRight: '0.5rem', color: '#DC2626' }} />
              Distribución de Cobros por Método
            </h3>
            {metodosOrdenados.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
                {metodosOrdenados.map(m => {
                  const pct    = totalUSD > 0 ? ((m.total_usd / totalUSD) * 100) : 0;
                  const barPct = maxMetodoUSD > 0 ? ((m.total_usd / maxMetodoUSD) * 100) : 0;
                  const color  = getMetodoColor(m.metodo);
                  return (
                    <div key={m.metodo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{m.metodo}</span>
                          <span className="badge badge--primary" style={{ fontSize: '0.72rem' }}>{m.transacciones} ops</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{formatUSD(m.total_usd)}</span>
                          <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div style={{ height: '10px', background: '#1F1F1F', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${barPct}%`, height: '100%', background: color,
                          borderRadius: '5px', transition: 'width 0.5s ease',
                          boxShadow: `0 0 8px ${color}55`,
                        }} />
                      </div>
                      {m.total_bs > 0 && (
                        <div style={{ fontSize: '0.77rem', color: '#555', marginTop: '0.25rem' }}>
                          Equiv. Bs: {formatBs(m.total_bs)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#555', textAlign: 'center', padding: '2rem 0' }}>Sin cobros en este rango de fechas</p>
            )}
          </div>

          {/* Detail table */}
          <div className="card">
            <h3 className="card__title">Detalle por Método de Pago</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th style={{ textAlign: 'center' }}>Operaciones</th>
                    <th style={{ textAlign: 'right' }}>Total Recaudado (USD)</th>
                    <th style={{ textAlign: 'right' }}>Total Recaudado (Bs)</th>
                    <th style={{ textAlign: 'right' }}>Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {metodosOrdenados.map((m, i) => {
                    const pct   = totalUSD > 0 ? ((m.total_usd / totalUSD) * 100).toFixed(1) : 0;
                    const color = getMetodoColor(m.metodo);
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                            <strong>{m.metodo}</strong>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{m.transacciones}</td>
                        <td style={{ textAlign: 'right' }}><strong>{formatUSD(m.total_usd)}</strong></td>
                        <td style={{ textAlign: 'right', color: '#A3A3A3' }}>
                          {m.total_bs > 0 ? formatBs(m.total_bs) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                  {metodosOrdenados.length === 0 && (
                    <tr><td colSpan="5" className="table__empty">Sin cobros en este rango</td></tr>
                  )}
                </tbody>
                {metodosOrdenados.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #262626' }}>
                      <td><strong>TOTAL</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <strong>{metodosOrdenados.reduce((s, m) => s + m.transacciones, 0)}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}><strong style={{ color: '#22C55E' }}>{formatUSD(totalUSD)}</strong></td>
                      <td style={{ textAlign: 'right' }}><strong style={{ color: '#A3A3A3' }}>{formatBs(totalBs)}</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>100%</strong></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4 — Inventario Valorizado
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'inventario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                <HiOutlineCube />
              </div>
              <div className="stat-card__content">
                <span className="stat-card__label">Valor USD</span>
                <span className="stat-card__value">{formatUSD(valorInventarioUSD)}</span>
                <span className="stat-card__sub">{inventario.length} productos activos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                <HiOutlineBanknotes />
              </div>
              <div className="stat-card__content">
                <span className="stat-card__label">Valor Bs (tasa actual)</span>
                <span className="stat-card__value">{formatBs(valorInventarioUSD * tasaBsRef)}</span>
                <span className="stat-card__sub">Tasa: {tasaBsRef.toFixed(2)} Bs/$</span>
              </div>
            </div>
            <div className="stat-card" style={{ borderColor: productosBajoStock.length > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
              <div className="stat-card__icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                <HiOutlineExclamationTriangle />
              </div>
              <div className="stat-card__content">
                <span className="stat-card__label">Stock Crítico</span>
                <span className="stat-card__value" style={{ color: productosBajoStock.length > 0 ? '#EF4444' : undefined }}>
                  {productosBajoStock.length}
                </span>
                <span className="stat-card__sub">artículos bajo el mínimo</span>
              </div>
            </div>
          </div>

          {/* Critical stock alert */}
          {productosBajoStock.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #EF4444', background: 'rgba(239,68,68,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <HiOutlineExclamationTriangle style={{ color: '#EF4444', fontSize: '1.25rem' }} />
                <h4 style={{ margin: 0, color: '#EF4444' }}>Alerta Stock Crítico ({productosBajoStock.length} artículos)</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {productosBajoStock.map(p => (
                  <span key={p.id} className="badge badge--danger">
                    {p.nombre} ({p.stock}/{p.stock_minimo})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Products table */}
          <div className="card">
            <h3 className="card__title">Valoración de Existencias</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Precio USD</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Valor USD</th>
                    <th style={{ textAlign: 'right' }}>Valor Bs</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.slice((pageInventario - 1) * 20, pageInventario * 20).map(p => {
                    const vUSD = p.stock * parseFloat(p.precio_usd || 0);
                    const vBs  = vUSD * tasaBsRef;
                    const bajo = p.stock <= p.stock_minimo;
                    return (
                      <tr key={p.id}>
                        <td><code>{p.sku}</code></td>
                        <td><strong>{p.nombre}</strong></td>
                        <td>{p.categorias?.nombre || 'General'}</td>
                        <td style={{ textAlign: 'right' }}>{formatUSD(p.precio_usd)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${bajo ? 'badge--danger' : 'badge--success'}`}>{p.stock}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}><strong>{formatUSD(vUSD)}</strong></td>
                        <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{formatBs(vBs)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={pageInventario}
              totalItems={inventario.length}
              pageSize={20}
              onPageChange={setPageInventario}
            />
          </div>
        </div>
      )}
    </div>
  );
}
