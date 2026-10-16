import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatUSD } from '../../utils/formatters';
import toast from 'react-hot-toast';
import {
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineCube,
} from 'react-icons/hi2';

/**
 * Modal para armar y gestionar Combos / Bolsas de Comida
 * Cumple con SRP y límite estricto < 600 líneas
 */
export default function ModalComboBuilder({
  isOpen,
  onClose,
  onSuccess,
  comboEditando = null,
  productosDisponibles = [],
}) {
  const [sku, setSku] = useState(comboEditando?.sku || '');
  const [nombre, setNombre] = useState(comboEditando?.nombre || '');
  const [descripcion, setDescripcion] = useState(comboEditando?.descripcion || '');
  const [precioUsd, setPrecioUsd] = useState(comboEditando ? comboEditando.precio_usd.toString() : '');
  const [stockMinimo, setStockMinimo] = useState(comboEditando ? comboEditando.stock_minimo.toString() : '5');
  const [items, setItems] = useState(comboEditando?.items_combo || []);
  const [searchProd, setSearchProd] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtrar productos seleccionables (solo productos regulares, no combos recursivos)
  const prodsCandidatos = useMemo(() => {
    return productosDisponibles.filter(p => !p.es_combo && p.activo);
  }, [productosDisponibles]);

  const prodsFiltrados = useMemo(() => {
    if (!searchProd.trim()) return [];
    const query = searchProd.toLowerCase();
    return prodsCandidatos
      .filter(p => p.nombre.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
      .slice(0, 6);
  }, [prodsCandidatos, searchProd]);

  // Cálculo del costo referencial individual acumulado
  const costoSumaIndividual = useMemo(() => {
    return items.reduce((sum, item) => {
      const prod = prodsCandidatos.find(p => p.id === item.producto_id);
      const precio = prod ? parseFloat(prod.precio_usd || 0) : (item.precio_usd || 0);
      return sum + (precio * item.cantidad);
    }, 0);
  }, [items, prodsCandidatos]);

  // Cálculo del stock máximo que se puede armar con el inventario actual
  const stockPosibleCalculado = useMemo(() => {
    if (items.length === 0) return 0;
    let minArmables = Infinity;
    for (const item of items) {
      const prod = prodsCandidatos.find(p => p.id === item.producto_id);
      const stockActual = prod ? parseInt(prod.stock || 0) : 0;
      const cantReq = parseInt(item.cantidad || 1);
      if (cantReq <= 0) continue;
      const armablesConEste = Math.floor(stockActual / cantReq);
      if (armablesConEste < minArmables) {
        minArmables = armablesConEste;
      }
    }
    return minArmables === Infinity ? 0 : minArmables;
  }, [items, prodsCandidatos]);

  function handleAgregarItem(prod) {
    const yaExiste = items.find(i => i.producto_id === prod.id);
    if (yaExiste) {
      setItems(items.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setItems([...items, {
        producto_id: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        precio_usd: prod.precio_usd,
        cantidad: 1,
      }]);
    }
    setSearchProd('');
  }

  function handleCambiarCantidad(productoId, cant) {
    const val = parseInt(cant);
    if (isNaN(val) || val < 1) return;
    setItems(items.map(i => i.producto_id === productoId ? { ...i, cantidad: val } : i));
  }

  function handleEliminarItem(productoId) {
    setItems(items.filter(i => i.producto_id !== productoId));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre del combo es obligatorio');
      return;
    }
    if (items.length === 0) {
      toast.error('Debes incluir al menos un producto en el combo');
      return;
    }
    const precio = parseFloat(precioUsd);
    if (isNaN(precio) || precio <= 0) {
      toast.error('Indica un precio de oferta válido para el combo');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sku: sku.trim() || `CMB-${Date.now().toString().slice(-6)}`,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio_usd: precio,
        stock: stockPosibleCalculado,
        stock_minimo: parseInt(stockMinimo) || 5,
        activo: true,
        es_combo: true,
        items_combo: items.map(i => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          sku: i.sku,
          cantidad: parseInt(i.cantidad),
        })),
      };

      if (comboEditando?.id) {
        const { error } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', comboEditando.id);
        if (error) throw error;
        toast.success(`Combo "${payload.nombre}" actualizado con éxito`);
      } else {
        const { error } = await supabase
          .from('productos')
          .insert(payload);
        if (error) throw error;
        toast.success(`Combo "${payload.nombre}" creado con éxito`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al guardar el combo');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--lg"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '95%' }}
      >
        <div className="modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
              <HiOutlineSparkles />
            </span>
            <h2 style={{ margin: 0 }}>
              {comboEditando ? 'Editar Combo / Oferta' : 'Armar Nuevo Combo / Bolsa de Comida'}
            </h2>
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleGuardar} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Identificación del Combo */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>SKU / Código Referencial</label>
              <input
                type="text"
                placeholder="Ej. CMB-ALIM01 (vacío auto-genera)"
                value={sku}
                onChange={e => setSku(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nombre del Combo / Oferta *</label>
              <input
                type="text"
                placeholder="Ej. Bolsa Solidaria Familiar 5kg"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción / Detalle de la Oferta</label>
            <input
              type="text"
              placeholder="Ej. Contiene 2 Harinas PAN, 2 Arroz, 1 Aceite 1L"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          {/* Buscador de Componentes */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HiOutlineCube /> Productos que Integran el Combo ({items.length})
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Se descontará stock de cada uno al facturar
              </span>
            </div>

            <div className="search-box" style={{ marginBottom: '0.5rem' }}>
              <HiOutlineMagnifyingGlass className="search-box__icon" />
              <input
                type="text"
                placeholder="Buscar producto del inventario para añadir..."
                value={searchProd}
                onChange={e => setSearchProd(e.target.value)}
              />
            </div>

            {prodsFiltrados.length > 0 && (
              <div
                style={{
                  background: 'var(--surface-color, #1e293b)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  marginBottom: '0.75rem',
                }}
              >
                {prodsFiltrados.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAgregarItem(p)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.85rem',
                    }}
                    className="hover-highlight"
                  >
                    <div>
                      <strong>{p.nombre}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        (SKU: {p.sku} | Stock: {p.stock})
                      </span>
                    </div>
                    <span style={{ color: 'var(--accent, #38bdf8)' }}>{formatUSD(p.precio_usd)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de productos incluidos en el combo */}
            {items.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.75rem' }}>
                No has agregado productos a este combo todavía.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {items.map(item => {
                  const prod = prodsCandidatos.find(p => p.id === item.producto_id);
                  const stockActual = prod ? prod.stock : 0;
                  return (
                    <div
                      key={item.producto_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.nombre}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Stock inv: {stockActual} | Ref: {formatUSD(item.precio_usd || prod?.precio_usd || 0)} c/u
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cant:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={item.cantidad}
                          onChange={e => handleCambiarCantidad(item.producto_id, e.target.value)}
                          style={{
                            width: '55px',
                            padding: '0.2rem 0.4rem',
                            textAlign: 'center',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-color)',
                            color: 'inherit',
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs text-danger"
                          onClick={() => handleEliminarItem(item.producto_id)}
                          title="Quitar del combo"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Métricas y Fijación de Precio de Oferta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suma Precios Regulares</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                {formatUSD(costoSumaIndividual)}
              </div>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Stock Máximo Armable</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
                {stockPosibleCalculado} combos
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ color: 'var(--primary, #10b981)' }}>Precio Oferta Combo (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ej. 12.50"
                value={precioUsd}
                onChange={e => setPrecioUsd(e.target.value)}
                required
                style={{ fontWeight: 'bold', fontSize: '1.05rem', borderColor: 'var(--primary)' }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal__footer" style={{ padding: '0.5rem 0 0 0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Guardando...' : (comboEditando ? 'Actualizar Combo' : 'Crear Combo')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
