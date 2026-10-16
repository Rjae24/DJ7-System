import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getPrinterConfig,
  savePrinterConfig,
  checkPrintBridgeStatus,
  getAvailablePrinters,
  probarImpresoraFactura,
  probarImpresoraEtiqueta,
  PRINT_BRIDGE_URL,
} from '../../services/printService';
import {
  HiOutlinePrinter,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlineCheck,
  HiOutlineCpuChip,
  HiOutlineTag,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';

export default function ModalConfigImpresoras({ isOpen, onClose }) {
  const [config, setConfig] = useState(getPrinterConfig());
  const [bridgeStatus, setBridgeStatus] = useState({ online: false, checking: true });
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [activeTab, setActiveTab] = useState('facturas'); // 'facturas' | 'etiquetas'
  const [testingFactura, setTestingFactura] = useState(false);
  const [testingEtiqueta, setTestingEtiqueta] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getPrinterConfig());
      verificarEstadoBridge();
    }
  }, [isOpen]);

  async function verificarEstadoBridge() {
    setBridgeStatus({ online: false, checking: true });
    const status = await checkPrintBridgeStatus();
    setBridgeStatus({ online: status.online, version: status.version, checking: false });

    if (status.online) {
      cargarImpresoras();
    }
  }

  async function cargarImpresoras() {
    setLoadingPrinters(true);
    try {
      const printers = await getAvailablePrinters();
      setSystemPrinters(printers);
      if (printers.length === 0) {
        toast('No se detectaron impresoras instaladas en Windows.', { icon: 'ℹ️' });
      }
    } catch (err) {
      // Manejado silenciosamente, el usuario verá el estado desconectado
    } finally {
      setLoadingPrinters(false);
    }
  }

  function handleFacturaChange(field, value) {
    setConfig(prev => ({
      ...prev,
      facturas: { ...prev.facturas, [field]: value }
    }));
  }

  function handleEtiquetaChange(field, value) {
    setConfig(prev => ({
      ...prev,
      etiquetas: { ...prev.etiquetas, [field]: value }
    }));
  }

  function handleGuardar() {
    const ok = savePrinterConfig(config);
    if (ok) {
      toast.success('Configuración de impresoras guardada en esta caja');
      onClose();
    } else {
      toast.error('Error al guardar la configuración local');
    }
  }

  async function handleTestFactura() {
    setTestingFactura(true);
    try {
      await probarImpresoraFactura(config.facturas);
    } catch (err) {
      // El error ya emite un toast en el servicio
    } finally {
      setTestingFactura(false);
    }
  }

  async function handleTestEtiqueta() {
    setTestingEtiqueta(true);
    try {
      await probarImpresoraEtiqueta(config.etiquetas);
    } catch (err) {
      // El error ya emite un toast en el servicio
    } finally {
      setTestingEtiqueta(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div 
        className="modal-content"
        style={{ maxWidth: '680px', width: '95%', padding: '0', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--primary-bg)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}>
              <HiOutlinePrinter />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Configuración de Impresión Térmica Silenciosa
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Controlador dual para Facturación (ESC/POS 80mm) y Etiquetas (TSPL)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)' }}
            title="Cerrar"
          >
            <HiOutlineXMark style={{ fontSize: '1.3rem' }} />
          </button>
        </div>

        {/* Barra de Estado del Agente Local */}
        <div style={{
          padding: '0.85rem 1.5rem',
          background: bridgeStatus.online ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: bridgeStatus.online ? 'var(--success)' : 'var(--danger)',
              boxShadow: bridgeStatus.online ? '0 0 8px var(--success)' : '0 0 8px var(--danger)',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {bridgeStatus.checking ? 'Comprobando agente local...' : (
                bridgeStatus.online 
                  ? `Agente de Impresión Conectado (v${bridgeStatus.version})` 
                  : 'Agente de Impresión Desconectado'
              )}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={verificarEstadoBridge}
              disabled={bridgeStatus.checking}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <HiOutlineArrowPath className={bridgeStatus.checking ? 'spin' : ''} />
              Reconectar
            </button>
            {bridgeStatus.online && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={cargarImpresoras}
                disabled={loadingPrinters}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <HiOutlineCpuChip />
                {loadingPrinters ? 'Buscando...' : 'Buscar Impresoras'}
              </button>
            )}
          </div>
        </div>

        {/* Alerta de advertencia si el agente está desconectado */}
        {!bridgeStatus.online && !bridgeStatus.checking && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <HiOutlineExclamationTriangle style={{ color: 'var(--warning)', fontSize: '1.25rem', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '2px' }}>
                El servicio local no está respondiendo en http://127.0.0.1:8080
              </strong>
              Para imprimir sin cuadros de diálogo, inicie el agente local en esta PC ejecutando el instalador en <code style={{ color: '#fff', background: '#333', padding: '2px 4px', borderRadius: '4px' }}>C:\PrintBridge</code> o ejecute <code style={{ color: '#fff', background: '#333', padding: '2px 4px', borderRadius: '4px' }}>npm start</code> dentro de <code style={{ color: '#fff', background: '#333', padding: '2px 4px', borderRadius: '4px' }}>/print-bridge</code>.
            </div>
          </div>
        )}

        {/* Selector de Pestañas */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          padding: '0 1.5rem',
          marginTop: '1rem',
          gap: '1rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('facturas')}
            style={{
              padding: '0.75rem 0.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'facturas' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'facturas' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'facturas' ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'var(--transition)'
            }}
          >
            <HiOutlineDocumentText />
            1. Facturas y Recibos (80mm)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('etiquetas')}
            style={{
              padding: '0.75rem 0.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'etiquetas' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'etiquetas' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'etiquetas' ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'var(--transition)'
            }}
          >
            <HiOutlineTag />
            2. Etiquetas de Código de Barras (TSPL)
          </button>
        </div>

        {/* Contenido de la pestaña */}
        <div style={{ padding: '1.5rem', maxHeight: '420px', overflowY: 'auto' }}>
          {activeTab === 'facturas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Conexión a la Impresora de Recibos</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="factura_conn"
                      value="spooler"
                      checked={config.facturas.connectionType === 'spooler'}
                      onChange={() => handleFacturaChange('connectionType', 'spooler')}
                    />
                    Cola de Windows (USB / Compartida)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="factura_conn"
                      value="socket"
                      checked={config.facturas.connectionType === 'socket'}
                      onChange={() => handleFacturaChange('connectionType', 'socket')}
                    />
                    Red Directa (Socket TCP / Ethernet)
                  </label>
                </div>
              </div>

              {config.facturas.connectionType === 'spooler' ? (
                <div className="form-group">
                  <label className="form-label">Seleccionar Impresora en Windows (80mm)</label>
                  <select
                    className="form-control"
                    value={config.facturas.targetPrinter}
                    onChange={e => handleFacturaChange('targetPrinter', e.target.value)}
                  >
                    <option value="">-- Seleccionar impresora de tickets --</option>
                    {systemPrinters.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.port ? `(${p.port})` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Si su impresora no aparece, verifique que esté encendida en Windows y presione "Buscar Impresoras".
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dirección IP de la Impresora</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="192.168.1.200"
                      value={config.facturas.ip}
                      onChange={e => handleFacturaChange('ip', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Puerto</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="9100"
                      value={config.facturas.port}
                      onChange={e => handleFacturaChange('port', parseInt(e.target.value, 10) || 9100)}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={config.facturas.autoPrint}
                    onChange={e => handleFacturaChange('autoPrint', e.target.checked)}
                  />
                  <span>Imprimir automáticamente ticket al emitir factura en el POS</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={config.facturas.cutPaper}
                    onChange={e => handleFacturaChange('cutPaper', e.target.checked)}
                  />
                  <span>Realizar corte automático de papel (ESC/POS Cut)</span>
                </label>
              </div>

              {/* Botón de prueba de factura */}
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleTestFactura}
                  disabled={testingFactura || (!bridgeStatus.online)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <HiOutlinePrinter />
                  {testingFactura ? 'Imprimiendo prueba...' : 'Probar Ticket Factura (80mm)'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'etiquetas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Conexión a la Impresora de Etiquetas</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="etiqueta_conn"
                      value="spooler"
                      checked={config.etiquetas.connectionType === 'spooler'}
                      onChange={() => handleEtiquetaChange('connectionType', 'spooler')}
                    />
                    Cola de Windows (USB / Compartida)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="etiqueta_conn"
                      value="socket"
                      checked={config.etiquetas.connectionType === 'socket'}
                      onChange={() => handleEtiquetaChange('connectionType', 'socket')}
                    />
                    Red Directa (Socket TCP / Ethernet)
                  </label>
                </div>
              </div>

              {config.etiquetas.connectionType === 'spooler' ? (
                <div className="form-group">
                  <label className="form-label">Seleccionar Impresora de Etiquetas en Windows</label>
                  <select
                    className="form-control"
                    value={config.etiquetas.targetPrinter}
                    onChange={e => handleEtiquetaChange('targetPrinter', e.target.value)}
                  >
                    <option value="">-- Seleccionar impresora de etiquetas --</option>
                    {systemPrinters.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.port ? `(${p.port})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dirección IP de la Impresora</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="192.168.1.201"
                      value={config.etiquetas.ip}
                      onChange={e => handleEtiquetaChange('ip', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Puerto</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="9100"
                      value={config.etiquetas.port}
                      onChange={e => handleEtiquetaChange('port', parseInt(e.target.value, 10) || 9100)}
                    />
                  </div>
                </div>
              )}

              {/* Dimensiones de la etiqueta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Ancho de Etiqueta (mm)</label>
                  <input
                    type="number"
                    min="20"
                    max="110"
                    className="form-control"
                    value={config.etiquetas.widthMm}
                    onChange={e => handleEtiquetaChange('widthMm', Number(e.target.value) || 50)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Predeterminado: 50 mm</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Alto de Etiqueta (mm)</label>
                  <input
                    type="number"
                    min="15"
                    max="150"
                    className="form-control"
                    value={config.etiquetas.heightMm}
                    onChange={e => handleEtiquetaChange('heightMm', Number(e.target.value) || 30)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Predeterminado: 30 mm</span>
                </div>
              </div>

              {/* Botón de prueba de etiqueta */}
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleTestEtiqueta}
                  disabled={testingEtiqueta || (!bridgeStatus.online)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <HiOutlineTag />
                  {testingEtiqueta ? 'Imprimiendo etiqueta...' : 'Probar Etiqueta Código de Barras'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <HiOutlineInformationCircle />
            <span>Configuración persistente para esta caja de cobro</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleGuardar}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <HiOutlineCheck />
              Guardar Configuración en esta Caja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
