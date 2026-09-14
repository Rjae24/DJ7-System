import React from 'react';
import { HiOutlineExclamationTriangle, HiOutlineXCircle } from 'react-icons/hi2';

export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel} style={{ zIndex: 300 }}>
      <div
        className="modal modal--sm"
        onClick={e => e.stopPropagation()}
        style={{
          borderTop: variant === 'danger' ? '4px solid #ef4444' : '4px solid #f59e0b',
        }}
      >
        <div className="modal__header" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: variant === 'danger' ? '#ef4444' : '#f59e0b',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              {variant === 'danger' ? <HiOutlineXCircle /> : <HiOutlineExclamationTriangle />}
            </div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, lineHeight: 1.3 }}>{title}</h2>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {message}
        </div>

        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: 'rgba(0,0,0,0.1)',
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${variant === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: variant === 'danger' ? '#ef4444' : undefined,
              borderColor: variant === 'danger' ? '#ef4444' : undefined,
              color: '#fff',
            }}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
