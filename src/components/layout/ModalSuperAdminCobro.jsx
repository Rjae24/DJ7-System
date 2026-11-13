import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineKey,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineClock,
} from 'react-icons/hi2';
import { getAvisoConfig, saveAvisoConfig } from '../../services/avisoPagoService';

/**
 * Modal exclusivo para el Super Administrador
 * Permite controlar en tiempo real el aviso de cobro y reloj para todos los módulos.
 */
export default function ModalSuperAdminCobro({ isOpen, onClose }) {
  const [activo, setActivo] = useState(true);
  const [fecha, setFecha] = useState('2026-11-15T23:59');
  const [mensaje, setMensaje] = useState('Se aproxima la fecha de pago del servicio (15 de Noviembre).');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAvisoConfig().then(cfg => {
        if (cfg) {
          setActivo(cfg.activo !== false);
          if (cfg.fecha) {
            // Formatear para input datetime-local (YYYY-MM-DDTHH:mm)
            const d = new Date(cfg.fecha);
            const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setFecha(iso);
          }
          if (cfg.mensaje) setMensaje(cfg.mensaje);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await saveAvisoConfig({
        activo,
        fecha: new Date(fecha).toISOString(),
        mensaje: mensaje.trim(),
      });
      toast.success('Configuración de cobro actualizada en todo el sistema');
      onClose();
    } catch (err) {
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '95%',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        }}
      >
        <div className="modal__header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem', color: '#eab308' }}>
              <HiOutlineKey />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Panel SuperAdmin (Control de Pagos)</h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Acceso exclusivo titinarrieche@gmail.com
              </span>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}><HiOutlineXMark /></button>
        </div>

        <form onSubmit={handleGuardar} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.25rem' }}>
          {/* Switch Activar / Desactivar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.04)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.95rem', display: 'block', cursor: 'pointer' }} htmlFor="switch-aviso">
                Mostrar Aviso y Reloj en Todos los Módulos
              </label>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                Si se desactiva, el reloj desaparecerá completamente para todos los usuarios.
              </span>
            </div>
            <input
              id="switch-aviso"
              type="checkbox"
              checked={activo}
              onChange={e => setActivo(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#eab308' }}
            />
          </div>

          {/* Fecha Límite */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HiOutlineClock /> Fecha y Hora Límite de Pago
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#13151b',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
              }}
            />
          </div>

          {/* Mensaje del Aviso */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Texto del Mensaje a Visualizar
            </label>
            <textarea
              rows={2}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Ej. Se aproxima la fecha de pago del servicio (15 de Noviembre)."
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#13151b',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={guardando}>
              Cerrar
            </button>
            <button type="submit" className="btn btn--primary" disabled={guardando} style={{ background: '#eab308', borderColor: '#ca8a04', color: '#000', fontWeight: 'bold' }}>
              <HiOutlineCheck /> {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
