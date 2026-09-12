import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatTasa, formatFecha } from '../utils/formatters';
import { fetchTasaBCV } from '../services/bcvService';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineCurrencyDollar,
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineGlobeAlt,
} from 'react-icons/hi2';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TasaCambio() {
  const { profile } = useAuth();
  const [tasas, setTasas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingBCV, setSyncingBCV] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nuevaTasa, setNuevaTasa] = useState('');
  const [bcvData, setBcvData] = useState(null);

  useEffect(() => {
    loadTasas();
    checkBCVRate();
  }, []);

  async function checkBCVRate() {
    try {
      const data = await fetchTasaBCV();
      setBcvData(data);
    } catch (e) {
      console.warn('Could not auto-fetch BCV:', e);
    }
  }

  async function loadTasas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasas_cambio')
      .select('*, usuarios!tasas_cambio_registrado_por_fkey(nombre_completo)')
      .order('fecha_registro', { ascending: false })
      .limit(90);

    if (error) {
      console.error('Error loading tasas:', error);
    }
    setTasas(data || []);
    setLoading(false);
  }

  async function handleSincronizarBCV() {
    setSyncingBCV(true);
    try {
      const data = await fetchTasaBCV();
      setBcvData(data);
      if (!data.tasa_usd || data.tasa_usd <= 0) {
        throw new Error('Tasa BCV inválida recibida');
      }

      const valorTasa = parseFloat(data.tasa_usd.toFixed(2));
      const hoy = new Date().toISOString().split('T')[0];

      // Insert or update for today
      const { data: existingRate } = await supabase
        .from('tasas_cambio')
        .select('id')
        .eq('fecha_registro', hoy)
        .maybeSingle();

      if (existingRate) {
        const { error: updErr } = await supabase
          .from('tasas_cambio')
          .update({
            tasa_usd_bs: valorTasa,
            registrado_por: profile.id,
          })
          .eq('id', existingRate.id);
        if (updErr) throw updErr;
        toast.success(`Tasa del día actualizada a Bs ${valorTasa.toFixed(2)} (BCV)`);
      } else {
        const { error: insErr } = await supabase
          .from('tasas_cambio')
          .insert({
            tasa_usd_bs: valorTasa,
            fecha_registro: hoy,
            registrado_por: profile.id,
          });
        if (insErr) throw insErr;
        toast.success(`Tasa BCV sincronizada y registrada: Bs ${valorTasa.toFixed(2)}`);
      }

      await loadTasas();
    } catch (error) {
      toast.error(`Error al sincronizar BCV: ${error.message}`);
    } finally {
      setSyncingBCV(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nuevaTasa || parseFloat(nuevaTasa) <= 0) {
      toast.error('Ingrese una tasa válida');
      return;
    }
    const valor = parseFloat(parseFloat(nuevaTasa).toFixed(2));
    const hoy = new Date().toISOString().split('T')[0];

    try {
      const { data: existingRate } = await supabase
        .from('tasas_cambio')
        .select('id')
        .eq('fecha_registro', hoy)
        .maybeSingle();

      if (existingRate) {
        const { error } = await supabase
          .from('tasas_cambio')
          .update({ tasa_usd_bs: valor, registrado_por: profile.id })
          .eq('id', existingRate.id);
        if (error) throw error;
        toast.success('Tasa actualizada correctamente');
      } else {
        const { error } = await supabase
          .from('tasas_cambio')
          .insert({
            tasa_usd_bs: valor,
            fecha_registro: hoy,
            registrado_por: profile.id,
          });
        if (error) throw error;
        toast.success('Tasa registrada exitosamente');
      }
      setShowForm(false);
      setNuevaTasa('');
      loadTasas();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const hoyFecha = new Date().toISOString().split('T')[0];
  const tasaHoy = tasas.find(t => t.fecha_registro === hoyFecha);
  const chartData = [...tasas].reverse().map(t => ({
    fecha: new Date(t.fecha_registro).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
    tasa: parseFloat(t.tasa_usd_bs),
  }));

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Cargando tasas...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Tasa de Cambio</h1>
          <p className="page__subtitle">Control de tasas de cambio oficial USD/Bs y sincronización con el BCV</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn--outline"
            onClick={handleSincronizarBCV}
            disabled={syncingBCV}
            title="Consumir API del Banco Central de Venezuela"
          >
            <HiOutlineArrowPath className={syncingBCV ? 'spin' : ''} />
            {syncingBCV ? 'Sincronizando...' : 'Sincronizar con BCV'}
          </button>
          <button className="btn btn--primary" onClick={() => { setNuevaTasa(tasaHoy ? tasaHoy.tasa_usd_bs : (bcvData?.tasa_usd || '')); setShowForm(true); }}>
            <HiOutlinePlus /> {tasaHoy ? 'Ajustar Manualmente' : 'Registrar Manualmente'}
          </button>
        </div>
      </div>

      {/* BCV Live Status banner */}
      {bcvData && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(20, 20, 20, 0.8) 100%)', border: '1px solid rgba(220, 38, 38, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: '1.25rem' }}>
                <HiOutlineGlobeAlt />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#fff', fontSize: '1rem' }}>API Banco Central de Venezuela</span>
                  <span className="badge badge--success" style={{ fontSize: '0.75rem' }}>En Línea</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: '#A3A3A3', marginTop: '2px' }}>
                  Última actualización oficial: {bcvData.updated_at ? formatFecha(bcvData.updated_at, true) : 'Reciente'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa Oficial BCV</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#22C55E' }}>
                  Bs {formatTasa(bcvData.tasa_usd)}
                </div>
              </div>
              {bcvData.tasa_eur > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Euro BCV</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#E5E5E5' }}>
                    Bs {formatTasa(bcvData.tasa_eur)}
                  </div>
                </div>
              )}
              <button
                className="btn btn--primary btn--sm"
                onClick={handleSincronizarBCV}
                disabled={syncingBCV}
              >
                Aplicar al Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Rate Card */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className={`stat-card ${!tasaHoy ? 'stat-card--warning' : ''}`}>
          <div className="stat-card__icon stat-card__icon--primary">
            <HiOutlineCurrencyDollar />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Tasa del Sistema Hoy</span>
            <span className="stat-card__value">
              {tasaHoy ? `Bs ${formatTasa(tasaHoy.tasa_usd_bs)}` : '⚠️ Sin registrar'}
            </span>
            <span className="stat-card__sub">{formatFecha(new Date())}</span>
          </div>
        </div>

        {tasas.length >= 2 && (
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--info">
              <HiOutlineCurrencyDollar />
            </div>
            <div className="stat-card__content">
              <span className="stat-card__label">Tasa Anterior</span>
              <span className="stat-card__value">Bs {formatTasa(tasas[tasaHoy ? 1 : 0]?.tasa_usd_bs)}</span>
              <span className="stat-card__sub">{formatFecha(tasas[tasaHoy ? 1 : 0]?.fecha_registro)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 className="card__title">Historial de Tasas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTasa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="fecha" tick={{ fill: '#A3A3A3', fontSize: 12 }} />
              <YAxis tick={{ fill: '#A3A3A3', fontSize: 12 }} tickFormatter={v => `Bs ${v}`} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#F5F5F5' }} formatter={(v) => [`Bs ${v}`, 'Tasa']} />
              <Area type="monotone" dataKey="tasa" stroke="#DC2626" fill="url(#colorTasa)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card__title">Registro Histórico Inmutable</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tasa (Bs/$)</th>
                <th>Registrado por</th>
                <th>Equivalencia $100</th>
              </tr>
            </thead>
            <tbody>
              {tasas.map(t => (
                <tr key={t.id}>
                  <td>{formatFecha(t.fecha_registro)}</td>
                  <td><strong style={{ color: '#F5F5F5' }}>Bs {formatTasa(t.tasa_usd_bs)}</strong></td>
                  <td>{t.usuarios?.nombre_completo || 'Sistema / BCV'}</td>
                  <td style={{ color: '#A3A3A3' }}>Bs {(parseFloat(t.tasa_usd_bs) * 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {tasas.length === 0 && <tr><td colSpan="4" className="table__empty">Sin registros</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Rate Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{tasaHoy ? 'Actualizar' : 'Registrar'} Tasa del Día</h2>
            </div>
            <form onSubmit={handleSubmit} className="modal__form">
              <div className="form-group">
                <label>Tasa USD → Bs</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevaTasa}
                  onChange={e => setNuevaTasa(e.target.value)}
                  placeholder="Ej: 520.50"
                  autoFocus
                  required
                />
              </div>
              {bcvData?.tasa_usd && (
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setNuevaTasa(bcvData.tasa_usd)}
                >
                  Usar valor oficial BCV (Bs {bcvData.tasa_usd})
                </button>
              )}
              {nuevaTasa && parseFloat(nuevaTasa) > 0 && (
                <p style={{ color: '#A3A3A3', fontSize: '0.9rem' }}>
                  $1.00 = Bs {parseFloat(nuevaTasa).toFixed(4)} | $10 = Bs {(parseFloat(nuevaTasa) * 10).toFixed(2)}
                </p>
              )}
              <button type="submit" className="btn btn--primary btn--full">
                {tasaHoy ? 'Guardar Actualización' : 'Registrar Tasa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
