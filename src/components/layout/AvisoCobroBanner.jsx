import { useState, useEffect } from 'react';
import { HiOutlineClock, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { getAvisoConfig } from '../../services/avisoPagoService';

/**
 * Banner superior con reloj y cuenta regresiva de fecha límite de pago
 * Se visualiza en todos los módulos de la aplicación cuando está activo.
 */
export default function AvisoCobroBanner() {
  const [aviso, setAviso] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0, vencido: false });

  useEffect(() => {
    // Carga inicial
    getAvisoConfig().then(cfg => {
      if (cfg) setAviso(cfg);
    });

    // Escuchar actualizaciones en vivo del SuperAdmin
    const handleUpdate = (e) => {
      if (e.detail) setAviso(e.detail);
    };
    window.addEventListener('dj7_aviso_pago_updated', handleUpdate);
    return () => window.removeEventListener('dj7_aviso_pago_updated', handleUpdate);
  }, []);

  // Temporizador de cuenta regresiva
  useEffect(() => {
    if (!aviso || !aviso.activo || !aviso.fecha) return;

    function calcular() {
      const destino = new Date(aviso.fecha).getTime();
      const ahora = new Date().getTime();
      const diff = destino - ahora;

      if (diff <= 0) {
        setTiempoRestante({ dias: 0, horas: 0, minutos: 0, segundos: 0, vencido: true });
        return;
      }

      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);

      setTiempoRestante({ dias, horas, minutos, segundos, vencido: false });
    }

    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [aviso]);

  if (!aviso || !aviso.activo) return null;

  return (
    <div
      style={{
        background: tiempoRestante.vencido
          ? 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)'
          : 'linear-gradient(90deg, #854d0e 0%, #b45309 100%)',
        color: '#ffffff',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.88rem',
        fontWeight: '500',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
          {tiempoRestante.vencido ? <HiOutlineExclamationTriangle /> : <HiOutlineClock />}
        </span>
        <span>
          <strong>{tiempoRestante.vencido ? '¡Atención Requerida!' : 'Aviso Administrativo:'}</strong>{' '}
          {aviso.mensaje || 'Se aproxima la fecha de pago del servicio (15 de Noviembre).'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.35)',
          padding: '4px 12px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '0.92rem',
          letterSpacing: '0.5px',
        }}
      >
        {tiempoRestante.vencido ? (
          <span style={{ color: '#fca5a5', fontWeight: 'bold' }}>PLAZO VENCIDO</span>
        ) : (
          <>
            <span>Plazo:</span>
            <strong style={{ color: '#fef08a' }}>
              {tiempoRestante.dias}d {tiempoRestante.horas}h {tiempoRestante.minutos}m {tiempoRestante.segundos}s
            </strong>
          </>
        )}
      </div>
    </div>
  );
}
