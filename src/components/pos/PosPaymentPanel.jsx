import {
  METODOS_PAGO,
  METODOS_INICIAL_CASHEA,
} from '../../utils/constants';
import { formatUSD } from '../../utils/formatters';
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi2';

export default function PosPaymentPanel({
  metodosPago = [],
  totalUSD = 0,
  tasaHoy = null,
  tieneCashea = false,
  totalPagadoEnTienda = 0,
  casheaCreditoUSD = 0,
  restante = 0,
  loading = false,
  onActualizarMetodo,
  onQuitarMetodo,
  onAgregarMetodo,
  onEmitirFactura,
  onCancelar,
}) {
  return (
    <div className="pos-payment">
      <h4>Métodos de Pago</h4>

      {metodosPago.map((mp, index) => {
        const metodoConfig = METODOS_PAGO.find(m => m.id === mp.metodo);
        return (
          <div key={index} className="pos-payment-method">
            <div className="pos-payment-method__header">
              <select
                value={mp.metodo}
                onChange={(e) => onActualizarMetodo(index, 'metodo', e.target.value)}
              >
                <option value="">Seleccionar método...</option>
                {METODOS_PAGO.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--ghost btn--xs text-danger"
                onClick={() => onQuitarMetodo(index)}
                title="Eliminar método"
              >
                <HiOutlineTrash />
              </button>
            </div>

            {mp.metodo && (
              <>
                <div className="pos-payment-method__amounts">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{
                      fontSize: '0.75rem',
                      color: metodoConfig?.isCashea ? '#EC4899' : undefined,
                      fontWeight: metodoConfig?.isCashea ? 'bold' : undefined,
                    }}>
                      {metodoConfig?.isCashea ? 'Inicial Cashea ($ USD)' : 'Monto ($ USD)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={mp.monto_usd ?? ''}
                      onChange={(e) => onActualizarMetodo(index, 'monto_usd', e.target.value)}
                    />
                  </div>

                  {metodoConfig?.enBs && (
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Monto (Bs)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={mp.monto_bs ?? ''}
                        onChange={(e) => onActualizarMetodo(index, 'monto_bs', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Zelle */}
                {metodoConfig?.isZelle && (
                  <div className="pos-payment-method__zelle">
                    <div className="form-group" style={{ marginBottom: '0.35rem' }}>
                      <input
                        type="text"
                        placeholder="Nombre / Titular del Emisor Zelle"
                        value={mp.zelle_titular || ''}
                        onChange={(e) => onActualizarMetodo(index, 'zelle_titular', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <input
                        type="email"
                        placeholder="Correo del Emisor Zelle"
                        value={mp.zelle_email || ''}
                        onChange={(e) => onActualizarMetodo(index, 'zelle_email', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Cashea */}
                {metodoConfig?.isCashea && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.65rem',
                      fontSize: '0.78rem',
                      color: '#FACC15',
                    }}>
                      <span>El cliente paga esta inicial en tienda. El resto queda a crédito Cashea.</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Método de Pago de la Inicial:
                      </label>
                      <select
                        value={mp.cashea_metodo_inicial || 'punto_venta'}
                        onChange={(e) => onActualizarMetodo(index, 'cashea_metodo_inicial', e.target.value)}
                        style={{ marginTop: '0.2rem' }}
                      >
                        {METODOS_INICIAL_CASHEA.map(mi => (
                          <option key={mi.id} value={mi.id}>{mi.label}</option>
                        ))}
                      </select>
                    </div>

                    {METODOS_INICIAL_CASHEA.find(mi => mi.id === (mp.cashea_metodo_inicial || 'punto_venta'))?.requiereReferencia && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                          type="text"
                          placeholder="N° Referencia del Pago de la Inicial"
                          value={mp.cashea_referencia_inicial || ''}
                          onChange={(e) => onActualizarMetodo(index, 'cashea_referencia_inicial', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Referencia general */}
                {metodoConfig?.requiereReferencia && (
                  <div className="form-group" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder={
                        mp.metodo === 'pago_movil'
                          ? 'N° de Referencia Pago Móvil (ej. 4 últimos dígitos)'
                          : mp.metodo === 'cashea'
                          ? 'N° de Orden / Comprobante Cashea'
                          : 'N° de Referencia / Comprobante'
                      }
                      value={mp.referencia || ''}
                      onChange={(e) => onActualizarMetodo(index, 'referencia', e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <button className="btn btn--ghost btn--sm" onClick={onAgregarMetodo}>
        <HiOutlinePlus /> Agregar otro método (Pago Mixto)
      </button>

      <div className="pos-payment-summary">
        <div className="pos-totals__row">
          <span>{tieneCashea ? 'Total Cobrado hoy en Tienda' : 'Pagado'}</span>
          <span className="text-success">{formatUSD(totalPagadoEnTienda)}</span>
        </div>
        {tieneCashea && (
          <div className="pos-totals__row" style={{ color: '#EC4899', fontWeight: 'bold' }}>
            <span>Monto Financiado Cashea (Crédito)</span>
            <span>{formatUSD(casheaCreditoUSD)}</span>
          </div>
        )}
        {restante > 0.01 && (
          <div className="pos-totals__row">
            <span>Restante</span>
            <span className="text-danger">{formatUSD(restante)}</span>
          </div>
        )}
      </div>

      <div className="pos-payment-actions">
        <button
          className="btn btn--primary btn--full"
          onClick={onEmitirFactura}
          disabled={loading || restante > 0.01}
        >
          {loading ? 'Procesando...' : `Emitir Factura ${formatUSD(totalUSD)}`}
        </button>
        <button className="btn btn--ghost btn--full" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
