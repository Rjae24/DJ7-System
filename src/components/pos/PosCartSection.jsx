import { formatUSD } from '../../utils/formatters';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineSparkles,
} from 'react-icons/hi2';

/**
 * Sección de búsqueda de productos y visualización del carrito de compras POS
 * Soporta visualización y desglose de Combos / Bolsas de comida
 * Límite estricto < 600 líneas (SRP)
 */
export default function PosCartSection({
  productoSearch,
  onSearchChange,
  productoResults,
  onAgregarAlCarrito,
  productoSearchRef,
  carrito,
  cuentaNombre,
  onActualizarCantidad,
  onQuitarDelCarrito,
}) {
  return (
    <>
      {/* Buscador de Productos */}
      <div className="card pos-section">
        <h3 className="card__title">Agregar Productos o Combos</h3>
        <div className="search-box">
          <HiOutlineMagnifyingGlass className="search-box__icon" />
          <input
            ref={productoSearchRef}
            type="text"
            placeholder="Buscar por nombre, SKU o combo..."
            value={productoSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {productoResults.length > 0 && (
          <div className="search-results">
            {productoResults.map(p => (
              <button
                key={p.id}
                className="search-result-item"
                onClick={() => onAgregarAlCarrito(p)}
                style={{ textAlign: 'left' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="search-result-item__name">{p.nombre}</span>
                    {p.es_combo && (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          fontWeight: 700,
                        }}
                      >
                        COMBO
                      </span>
                    )}
                  </div>
                  <span className="search-result-item__sub">
                    SKU: {p.sku} | Stock: {p.stock} {p.es_combo ? 'combos' : 'und'}
                  </span>
                  {p.es_combo && p.items_combo?.length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      Incluye: {p.items_combo.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
                    </div>
                  )}
                </div>
                <span className="search-result-item__price">{formatUSD(p.precio_usd)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carrito de Compras */}
      <div className="card pos-section">
        <h3 className="card__title">
          Carrito de {cuentaNombre || 'la Cuenta'} ({carrito.length} items)
        </h3>
        {carrito.length === 0 ? (
          <p className="pos-empty">El carrito está vacío</p>
        ) : (
          <div className="pos-cart">
            {carrito.map(item => (
              <div
                key={item.producto_id}
                className="pos-cart-item"
                style={{
                  flexDirection: item.es_combo ? 'column' : 'row',
                  alignItems: item.es_combo ? 'stretch' : 'center',
                  gap: item.es_combo ? '0.5rem' : '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div className="pos-cart-item__info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="pos-cart-item__name">{item.producto_nombre}</span>
                      {item.es_combo && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            fontWeight: 700,
                          }}
                        >
                          COMBO
                        </span>
                      )}
                    </div>
                    <span className="pos-cart-item__price">{formatUSD(item.precio_unitario)} c/u</span>
                  </div>

                  <div className="pos-cart-item__controls">
                    <button
                      className="btn btn--ghost btn--xs"
                      onClick={() => onActualizarCantidad(item.producto_id, item.cantidad - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="pos-cart-item__qty"
                      value={item.cantidad}
                      min={1}
                      max={item.stock_disponible}
                      onChange={(e) => onActualizarCantidad(item.producto_id, parseInt(e.target.value) || 1)}
                    />
                    <button
                      className="btn btn--ghost btn--xs"
                      onClick={() => onActualizarCantidad(item.producto_id, item.cantidad + 1)}
                    >
                      +
                    </button>
                  </div>

                  <span className="pos-cart-item__subtotal">{formatUSD(item.subtotal)}</span>

                  <button
                    className="btn btn--ghost btn--xs text-danger"
                    onClick={() => onQuitarDelCarrito(item.producto_id)}
                    title="Eliminar de la cuenta"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>

                {/* Desglose explicativo para combos en el carrito */}
                {item.es_combo && item.items_combo?.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.05)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      borderLeft: '2px solid #38bdf8',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <HiOutlineSparkles style={{ fontSize: '0.85rem' }} /> Contenido del combo ({item.cantidad > 1 ? `x${item.cantidad} combos` : '1 combo'}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {item.items_combo.map((ci, idx) => (
                        <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          • {ci.cantidad * item.cantidad}x {ci.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
