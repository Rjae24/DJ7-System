import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatUSD, formatBs, formatFecha, formatTasa } from '../utils/formatters';
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
  HiOutlineCheckBadge,
} from 'react-icons/hi2';

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas' | 'inventario' | 'metodos'
  const [pageVentas, setPageVentas] = useState(1);
  const [pageInventario, setPageInventario] = useState(1);

  // Date filters (defaults: last 30 days)
  const now = new Date();
  const defaultDesde = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultHasta = now.toISOString().split('T')[0];

  const [fechaDesde, setFechaDesde] = useState(defaultDesde);
  const [fechaHasta, setFechaHasta] = useState(defaultHasta);

  // Data states
  const [ventas, setVentas] = useState([]);
  const [detallesVentas, setDetallesVentas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [tasaActual, setTasaActual] = useState(null);

  useEffect(() => {
    loadReportes();
  }, [fechaDesde, fechaHasta]);

  async function loadReportes() {
    setLoading(true);
    try {
      // 1. Fetch Invoices in date range
      const { data: facturasData, error: fErr } = await supabase
        .from('facturas')
        .select(`
          *,
          clientes(nombre, documento_identidad),
          usuarios!facturas_vendedor_id_fkey(nombre_completo),
          tasas_cambio(tasa_usd_bs)
        `)
        .gte('fecha_emision', `${fechaDesde}T00:00:00`)
        .lte('fecha_emision', `${fechaHasta}T23:59:59`)
        .order('fecha_emision', { ascending: false });

      if (fErr) throw fErr;
      setVentas(facturasData || []);

      // 2. Fetch invoice details for sold products stats
      const facturaIds = (facturasData || []).filter(f => f.estado === 'emitida').map(f => f.id);
      if (facturaIds.length > 0) {
        const { data: detallesData } = await supabase
          .from('detalles_factura')
          .select('*')
          .in('factura_id', facturaIds);
        setDetallesVentas(detallesData || []);
      } else {
        setDetallesVentas([]);
      }

      // 3. Fetch current products inventory
      const { data: prodsData } = await supabase
        .from('productos')
        .select(`
          *,
          categorias(nombre)
        `)
        .eq('activo', true)
        .order('nombre');
      setInventario(prodsData || []);

      // 4. Latest rate
      const { data: rateData } = await supabase
        .from('tasas_cambio')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .limit(1)
        .maybeSingle();
      setTasaActual(rateData);

    } catch (error) {
      console.error('Error cargando reportes:', error);
      toast.error('Error al cargar datos del reporte');
    } finally {
      setLoading(false);
    }
  }

  // Calculations: Sales
  const facturasEmitidas = ventas.filter(f => f.estado === 'emitida');
  const facturasAnuladas = ventas.filter(f => f.estado === 'anulada');

  const totalUSD = facturasEmitidas.reduce((sum, f) => sum + parseFloat(f.total_usd || 0), 0);
  const totalBs = facturasEmitidas.reduce((sum, f) => sum + parseFloat(f.total_bs || 0), 0);
  const ticketPromedioUSD = facturasEmitidas.length > 0 ? totalUSD / facturasEmitidas.length : 0;

  // Breakdown by payment methods
  const metodosTotales = {};
  facturasEmitidas.forEach(f => {
    (f.metodos_pago || []).forEach(mp => {
      const metodo = mp.metodo || 'Otro';
      if (!metodosTotales[metodo]) {
        metodosTotales[metodo] = { total_usd: 0, total_bs: 0, transacciones: 0 };
      }
      metodosTotales[metodo].total_usd += parseFloat(mp.monto_usd || 0);
      metodosTotales[metodo].total_bs += parseFloat(mp.monto_bs || 0);
      metodosTotales[metodo].transacciones += 1;
    });
  });

  // Top products sold
  const rankingProductos = {};
  detallesVentas.forEach(d => {
    const nombre = d.producto_nombre || 'Producto';
    if (!rankingProductos[nombre]) {
      rankingProductos[nombre] = { cantidad: 0, total_usd: 0 };
    }
    rankingProductos[nombre].cantidad += d.cantidad;
    const precio = parseFloat(d.precio_unitario_usd || 0);
    rankingProductos[nombre].total_usd += d.cantidad * precio;
  });

  const listaRankingProductos = Object.entries(rankingProductos)
    .map(([nombre, stat]) => ({ nombre, ...stat }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Inventory valuation
  const tasaBsRef = tasaActual?.tasa_usd_bs || 1;
  const valorInventarioUSD = inventario.reduce((sum, p) => sum + (p.stock * parseFloat(p.precio_usd || 0)), 0);
  const valorInventarioBs = valorInventarioUSD * tasaBsRef;
  const productosBajoStock = inventario.filter(p => p.stock <= p.stock_minimo);

  // CSV Exporters
  function exportarVentasCSV() {
    if (facturasEmitidas.length === 0) {
      toast.error('No hay ventas para exportar');
      return;
    }
    const headers = ['Numero', 'Fecha', 'Cliente', 'Documento', 'Vendedor', 'Total USD', 'Total Bs', 'Metodos'];
    const rows = facturasEmitidas.map(f => [
      `"${f.numero_factura}"`,
      `"${f.fecha_emision}"`,
      `"${f.clientes?.nombre || 'General'}"`,
      `"${f.clientes?.documento_identidad || 'N/A'}"`,
      `"${f.usuarios?.nombre_completo || 'N/A'}"`,
      f.total_usd,
      f.total_bs,
      `"${(f.metodos_pago || []).map(m => `${m.metodo}: $${m.monto_usd}`).join(' | ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    descargarArchivo(csvContent, `reporte_ventas_${fechaDesde}_al_${fechaHasta}.csv`);
    toast.success('Reporte de ventas descargado');
  }

  function exportarInventarioCSV() {
    if (inventario.length === 0) {
      toast.error('No hay productos para exportar');
      return;
    }
    const headers = ['SKU', 'Nombre', 'Categoria', 'Precio USD', 'Stock Actual', 'Stock Minimo', 'Valor Total USD'];
    const rows = inventario.map(p => [
      `"${p.sku}"`,
      `"${p.nombre}"`,
      `"${p.categorias?.nombre || 'General'}"`,
      p.precio_usd,
      p.stock,
      p.stock_minimo,
      (p.stock * p.precio_usd).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    descargarArchivo(csvContent, `reporte_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Reporte de inventario descargado');
  }

  function descargarArchivo(contenido, nombreArchivo) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrintReport() {
    window.print();
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Generando reportes de gestión...</p>
      </div>
    );
  }

  return (
    <div className="page reportes-page">
      {/* Header */}
      <div className="page__header no-print">
        <div>
          <h1 className="page__title">Reportes y Auditoría</h1>
          <p className="page__subtitle">Métricas de facturación, balance financiero e inventario valorizado</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn--outline" onClick={handlePrintReport} title="Imprimir informe en formato estándar">
            <HiOutlinePrinter /> Imprimir Reporte
          </button>
          <button className="btn btn--primary" onClick={activeTab === 'inventario' ? exportarInventarioCSV : exportarVentasCSV}>
            <HiOutlineArrowDownTray /> Exportar a CSV
          </button>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiOutlineCalendar style={{ color: '#DC2626' }} />
              <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Período:</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#A3A3A3' }}>Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                style={{ background: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.6rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#A3A3A3' }}>Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                style={{ background: '#141414', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.6rem' }}
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', background: '#141414', padding: '4px', borderRadius: '8px', border: '1px solid #262626' }}>
            <button
              className={`btn btn--xs ${activeTab === 'ventas' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setActiveTab('ventas')}
            >
              Ventas & Flujo
            </button>
            <button
              className={`btn btn--xs ${activeTab === 'inventario' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setActiveTab('inventario')}
            >
              Inventario Valorizado
            </button>
            <button
              className={`btn btn--xs ${activeTab === 'metodos' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setActiveTab('metodos')}
            >
              Métodos de Pago
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Header (Visible when printed) */}
      <div className="print-report-header" style={{ display: 'none' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>COMERCIALIZADORA DJ7 C.A.</h2>
        <h3 style={{ fontSize: '14px', margin: '4px 0' }}>REPORTE DE GESTIÓN EMPRESARIAL</h3>
        <p style={{ fontSize: '11px', color: '#555' }}>
          Período: {formatFecha(fechaDesde)} al {formatFecha(fechaHasta)} | Generado el: {formatFecha(new Date(), true)}
        </p>
        <hr style={{ margin: '10px 0', borderColor: '#ccc' }} />
      </div>

      {/* Key Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--primary">
            <HiOutlineBanknotes />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Facturación USD</span>
            <span className="stat-card__value">{formatUSD(totalUSD)}</span>
            <span className="stat-card__sub">{facturasEmitidas.length} facturas emitidas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--success">
            <HiOutlineCreditCard />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Facturación Bs</span>
            <span className="stat-card__value">{formatBs(totalBs)}</span>
            <span className="stat-card__sub">Al cambio de cada operación</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--info">
            <HiOutlineDocumentChartBar />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Ticket Promedio</span>
            <span className="stat-card__value">{formatUSD(ticketPromedioUSD)}</span>
            <span className="stat-card__sub">Promedio por venta</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
            <HiOutlineCube />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Valor Inventario Actual</span>
            <span className="stat-card__value">{formatUSD(valorInventarioUSD)}</span>
            <span className="stat-card__sub">{inventario.length} productos activos</span>
          </div>
        </div>
      </div>

      {/* TAB 1: Ventas & Flujo */}
      {activeTab === 'ventas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top products table */}
          <div className="card">
            <h3 className="card__title">Top Productos Vendidos en el Período</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Unidades Vendidas</th>
                    <th style={{ textAlign: 'right' }}>Total Facturado (USD)</th>
                    <th style={{ textAlign: 'right' }}>% Aporte Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {listaRankingProductos.slice(0, 10).map((prod, idx) => {
                    const pct = totalUSD > 0 ? ((prod.total_usd / totalUSD) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx}>
                        <td><strong>{prod.nombre}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge--primary">{prod.cantidad} uds</span>
                        </td>
                        <td style={{ textAlign: 'right' }}><strong>{formatUSD(prod.total_usd)}</strong></td>
                        <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                  {listaRankingProductos.length === 0 && (
                    <tr><td colSpan="4" className="table__empty">No hay ventas registradas en el período seleccionado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices log in period */}
          <div className="card">
            <h3 className="card__title">Desglose de Facturas ({facturasEmitidas.length})</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Total USD</th>
                    <th>Total Bs</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.slice((pageVentas - 1) * 20, pageVentas * 20).map(f => (
                    <tr key={f.id} className={f.estado === 'anulada' ? 'table__row--muted' : ''}>
                      <td><code>{f.numero_factura}</code></td>
                      <td>{formatFecha(f.fecha_emision, true)}</td>
                      <td>{f.clientes?.nombre || 'Consumidor Final'}</td>
                      <td>{f.usuarios?.nombre_completo || '—'}</td>
                      <td><strong>{formatUSD(f.total_usd)}</strong></td>
                      <td>{formatBs(f.total_bs)}</td>
                      <td>
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
            <Pagination
              currentPage={pageVentas}
              totalItems={ventas.length}
              pageSize={20}
              onPageChange={setPageVentas}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Inventario Valorizado */}
      {activeTab === 'inventario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {productosBajoStock.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #EF4444', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <HiOutlineExclamationTriangle style={{ color: '#EF4444', fontSize: '1.25rem' }} />
                <h4 style={{ margin: 0, color: '#EF4444' }}>Alerta de Stock Crítico ({productosBajoStock.length} artículos)</h4>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#A3A3A3', margin: 0 }}>
                Los siguientes productos se encuentran en o por debajo de su punto de reorden:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {productosBajoStock.map(p => (
                  <span key={p.id} className="badge badge--danger">
                    {p.nombre} (Stock: {p.stock} / Mín: {p.stock_minimo})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="card__title">Valoración de Existencias</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio USD</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Valor Total USD</th>
                    <th style={{ textAlign: 'right' }}>Valor Total Bs</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.slice((pageInventario - 1) * 20, pageInventario * 20).map(p => {
                    const totalProdUSD = p.stock * parseFloat(p.precio_usd || 0);
                    const totalProdBs = totalProdUSD * tasaBsRef;
                    const esBajo = p.stock <= p.stock_minimo;
                    return (
                      <tr key={p.id}>
                        <td><code>{p.sku}</code></td>
                        <td><strong>{p.nombre}</strong></td>
                        <td>{p.categorias?.nombre || 'General'}</td>
                        <td>{formatUSD(p.precio_usd)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${esBajo ? 'badge--danger' : 'badge--success'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}><strong>{formatUSD(totalProdUSD)}</strong></td>
                        <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{formatBs(totalProdBs)}</td>
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

      {/* TAB 3: Métodos de Pago */}
      {activeTab === 'metodos' && (
        <div className="card">
          <h3 className="card__title">Desglose de Cobranzas por Método de Pago</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Método de Pago</th>
                  <th style={{ textAlign: 'center' }}>Operaciones</th>
                  <th style={{ textAlign: 'right' }}>Total Recaudado (USD)</th>
                  <th style={{ textAlign: 'right' }}>Total Recaudado (Bs)</th>
                  <th style={{ textAlign: 'right' }}>Participación (%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metodosTotales).map(([metodo, stat], i) => {
                  const pct = totalUSD > 0 ? ((stat.total_usd / totalUSD) * 100).toFixed(1) : 0;
                  return (
                    <tr key={i}>
                      <td><strong>{metodo}</strong></td>
                      <td style={{ textAlign: 'center' }}>{stat.transacciones}</td>
                      <td style={{ textAlign: 'right' }}><strong>{formatUSD(stat.total_usd)}</strong></td>
                      <td style={{ textAlign: 'right' }}>{stat.total_bs > 0 ? formatBs(stat.total_bs) : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{pct}%</td>
                    </tr>
                  );
                })}
                {Object.keys(metodosTotales).length === 0 && (
                  <tr><td colSpan="5" className="table__empty">Sin cobros en este rango de fechas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
