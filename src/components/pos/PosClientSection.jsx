import { HiOutlineMagnifyingGlass, HiOutlineUserPlus, HiOutlineXMark } from 'react-icons/hi2';

export default function PosClientSection({
  cuentaNombre = 'Cuenta Actual',
  clienteSeleccionado = null,
  clienteSearch = '',
  clienteResults = [],
  showNuevoCliente = false,
  nuevoCliente = { nombre: '', documento_identidad: '', telefono: '' },
  onSearchClientes,
  onSelectCliente,
  onDeselectCliente,
  onToggleNuevoCliente,
  onNuevoClienteChange,
  onCrearCliente,
}) {
  return (
    <div className="card pos-section">
      <h3 className="card__title">Cliente ({cuentaNombre})</h3>
      {clienteSeleccionado ? (
        <div className="pos-cliente-selected">
          <div>
            <strong>{clienteSeleccionado.nombre}</strong>
            <span>{clienteSeleccionado.documento_identidad}</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onDeselectCliente}>
            <HiOutlineXMark />
          </button>
        </div>
      ) : (
        <>
          <div className="search-box">
            <HiOutlineMagnifyingGlass className="search-box__icon" />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={clienteSearch}
              onChange={(e) => onSearchClientes(e.target.value)}
            />
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => onToggleNuevoCliente(true)}
              title="Nuevo Cliente"
            >
              <HiOutlineUserPlus />
            </button>
          </div>
          {clienteResults.length > 0 && (
            <div className="search-results">
              {clienteResults.map(c => (
                <button
                  key={c.id}
                  className="search-result-item"
                  onClick={() => onSelectCliente(c)}
                >
                  <span className="search-result-item__name">{c.nombre}</span>
                  <span className="search-result-item__sub">{c.documento_identidad}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showNuevoCliente && (
        <div className="pos-nuevo-cliente">
          <form onSubmit={onCrearCliente}>
            <h4>Nuevo Cliente</h4>
            <input
              placeholder="Nombre completo"
              value={nuevoCliente.nombre}
              onChange={e => onNuevoClienteChange({ ...nuevoCliente, nombre: e.target.value })}
              required
            />
            <input
              placeholder="Cédula / RIF"
              value={nuevoCliente.documento_identidad}
              onChange={e => onNuevoClienteChange({ ...nuevoCliente, documento_identidad: e.target.value })}
              required
            />
            <input
              placeholder="Teléfono"
              value={nuevoCliente.telefono}
              onChange={e => onNuevoClienteChange({ ...nuevoCliente, telefono: e.target.value })}
            />
            <div className="pos-nuevo-cliente__actions">
              <button type="submit" className="btn btn--primary btn--sm">Guardar</button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onToggleNuevoCliente(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
