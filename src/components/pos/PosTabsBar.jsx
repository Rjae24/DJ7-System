import { useState } from 'react';
import { HiOutlinePlus, HiOutlineXMark, HiOutlinePencilSquare, HiOutlineCheck } from 'react-icons/hi2';
import { formatUSD } from '../../utils/formatters';

export default function PosTabsBar({
  cuentas = [],
  activeIdx = 0,
  onSelectCuenta,
  onAddCuenta,
  onCloseCuenta,
  onRenameCuenta,
}) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editNombre, setEditNombre] = useState('');

  const startRename = (e, idx, currentNombre) => {
    e.stopPropagation();
    setEditingIdx(idx);
    setEditNombre(currentNombre);
  };

  const saveRename = (e, idx) => {
    e.stopPropagation();
    if (editNombre.trim() && onRenameCuenta) {
      onRenameCuenta(idx, editNombre.trim());
    }
    setEditingIdx(null);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      overflowX: 'auto',
      paddingBottom: '0.5rem',
      marginBottom: '0.75rem',
      borderBottom: '1px solid var(--border)',
    }}>
      {cuentas.map((cuenta, idx) => {
        const isActive = idx === activeIdx;
        const totalItems = (cuenta.carrito || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
        const totalUSD = (cuenta.carrito || []).reduce((acc, it) => acc + (it.subtotal || 0), 0);
        const clienteNombre = cuenta.clienteSeleccionado?.nombre;

        return (
          <div
            key={cuenta.id || idx}
            onClick={() => onSelectCuenta(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: isActive ? 'var(--bg-elevated)' : 'var(--bg-card)',
              border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
              boxShadow: isActive ? '0 0 10px rgba(220, 38, 38, 0.2)' : 'none',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              minWidth: '130px',
              maxWidth: '220px',
            }}
          >
            {editingIdx === idx ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename(e, idx);
                    if (e.key === 'Escape') setEditingIdx(null);
                  }}
                  autoFocus
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--primary)',
                    color: 'var(--text-primary)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.8rem',
                    width: '100%',
                  }}
                />
                <button
                  type="button"
                  className="btn-icon"
                  style={{ color: 'var(--success)', padding: '2px' }}
                  onClick={e => saveRename(e, idx)}
                >
                  <HiOutlineCheck style={{ fontSize: '0.9rem' }} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.85rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {cuenta.nombre || `Cuenta ${idx + 1}`}
                    </span>
                    {isActive && (
                      <button
                        type="button"
                        onClick={e => startRename(e, idx, cuenta.nombre || `Cuenta ${idx + 1}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                        }}
                        title="Renombrar cuenta (Ej. Mesa 3 o Cliente)"
                      >
                        <HiOutlinePencilSquare style={{ fontSize: '0.8rem' }} />
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: '0.72rem', color: totalItems > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {totalItems > 0 ? `${totalItems} items · ${formatUSD(totalUSD)}` : (clienteNombre ? clienteNombre.slice(0, 15) : 'Vacío')}
                  </span>
                </div>

                {cuentas.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseCuenta(idx);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Cerrar esta cuenta"
                  >
                    <HiOutlineXMark style={{ fontSize: '0.95rem' }} />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddCuenta}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.45rem 0.8rem',
          borderRadius: '8px',
          background: 'transparent',
          border: '1px dashed var(--border)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.82rem',
          whiteSpace: 'nowrap',
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.color = 'var(--primary)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
        title="Crear otra cuenta / factura en paralelo"
      >
        <HiOutlinePlus style={{ fontSize: '1rem' }} />
        <span>Nueva Cuenta</span>
      </button>
    </div>
  );
}
