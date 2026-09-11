import { useState, useEffect } from 'react';
import { getEmpresaConfig, saveEmpresaConfig, DEFAULT_EMPRESA } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  HiOutlineBuildingOffice2,
  HiOutlineIdentification,
  HiOutlineMapPin,
  HiOutlinePhone,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlineCheck,
} from 'react-icons/hi2';

export default function Configuracion() {
  const [config, setConfig] = useState(DEFAULT_EMPRESA);

  useEffect(() => {
    setConfig(getEmpresaConfig());
  }, []);

  function handleChange(field, value) {
    setConfig(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    saveEmpresaConfig(config);
    toast.success('Configuración de empresa guardada con éxito');
  }

  function handleReset() {
    if (confirm('¿Restablecer datos predeterminados?')) {
      setConfig(DEFAULT_EMPRESA);
      saveEmpresaConfig(DEFAULT_EMPRESA);
      toast.success('Valores por defecto restablecidos');
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Configuración del Sistema</h1>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #2A2A2A', paddingBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-color, #EF4444)',
              fontSize: '1.25rem'
            }}>
              <HiOutlineBuildingOffice2 />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Datos Fiscales y de Facturación</h2>
              <p style={{ fontSize: '0.85rem', color: '#888' }}>
                Esta información aparecerá en el encabezado y pie de página de los tickets de venta y facturas emitidas.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="modal__form" style={{ padding: 0 }}>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HiOutlineBuildingOffice2 /> Razón Social / Nombre Comercial
                </label>
                <input
                  type="text"
                  value={config.nombre}
                  onChange={e => handleChange('nombre', e.target.value)}
                  placeholder="Ej. COMERCIALIZADORA DJ7 C.A."
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HiOutlineIdentification /> RIF / Identificación Fiscal
                </label>
                <input
                  type="text"
                  value={config.rif}
                  onChange={e => handleChange('rif', e.target.value)}
                  placeholder="Ej. J-50123456-7"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HiOutlineMapPin /> Dirección Fiscal
                </label>
                <input
                  type="text"
                  value={config.direccion}
                  onChange={e => handleChange('direccion', e.target.value)}
                  placeholder="Ej. Caracas, Venezuela"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HiOutlinePhone /> Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={config.telefono}
                  onChange={e => handleChange('telefono', e.target.value)}
                  placeholder="Ej. 0414-1234567"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HiOutlineSparkles /> Slogan / Mensaje de Despedida
                </label>
                <input
                  type="text"
                  value={config.slogan}
                  onChange={e => handleChange('slogan', e.target.value)}
                  placeholder="Ej. ¡Gracias por su compra!"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HiOutlineReceiptPercent /> IVA Estándar (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={config.iva_porcentaje}
                  onChange={e => handleChange('iva_porcentaje', parseFloat(e.target.value) || 0)}
                  placeholder="16"
                  required
                />
              </div>
            </div>

            {/* Preview Box */}
            <div style={{
              background: '#141414',
              border: '1px dashed #333',
              borderRadius: '8px',
              padding: '1.25rem',
              margin: '1rem 0'
            }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#777', fontWeight: 600 }}>
                Vista previa en Ticket
              </span>
              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '1rem', display: 'block' }}>{config.nombre || 'Nombre de Empresa'}</strong>
                <span style={{ fontSize: '0.8rem', color: '#999', display: 'block' }}>RIF: {config.rif || 'J-00000000-0'}</span>
                <span style={{ fontSize: '0.8rem', color: '#999', display: 'block' }}>{config.direccion || 'Dirección'}</span>
                {config.telefono && <span style={{ fontSize: '0.8rem', color: '#999', display: 'block' }}>Tlf: {config.telefono}</span>}
                <div style={{ borderTop: '1px dashed #333', margin: '0.75rem 0' }}></div>
                <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#aaa' }}>{config.slogan}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleReset}
              >
                <HiOutlineArrowPath /> Restablecer
              </button>
              <button
                type="submit"
                className="btn btn--primary"
              >
                <HiOutlineCheck /> Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
