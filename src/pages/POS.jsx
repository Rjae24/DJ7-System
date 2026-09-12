import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { METODOS_PAGO } from '../utils/constants';
import { formatUSD, formatBs, formatTasa } from '../utils/formatters';
import toast from 'react-hot-toast';
import TicketFactura from '../components/print/TicketFactura';
import { fetchTasaBCV } from '../services/bcvService';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineUserPlus,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

export default function POS() {
  const { profile, isAdmin } = useAuth();
  
  // Client
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResults, setClienteResults] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', documento_identidad: '', telefono: '' });
  
  // Products
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResults, setProductoResults] = useState([]);
  const [carrito, setCarrito] = useState([]);
  
  // Exchange rate
  const [tasaHoy, setTasaHoy] = useState(null);
  
  // Payment
  const [showPago, setShowPago] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);
  
  // Invoice result
  const [facturaEmitida, setFacturaEmitida] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const productoSearchRef = useRef(null);

  // Load today's rate on mount
  useEffect(() => {
    loadTasaHoy();
  }, []);

  async function loadTasaHoy() {
    const { data } = await supabase
      .from('tasas_cambio')
      .select('*')
      .order('fecha_registro', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTasaHoy(data);
  }

  async function sincronizarBCV() {
    try {
      toast.loading('Consultando API BCV...', { id: 'bcv-sync' });
      const bcv = await fetchTasaBCV();
      if (!bcv.tasa_usd) throw new Error('No se obtuvo tasa');
      const valor = parseFloat(bcv.tasa_usd.toFixed(4));
      const hoy = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('tasas_cambio')
        .select('id')
        .eq('fecha_registro', hoy)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('tasas_cambio')
          .update({ tasa_usd_bs: valor, registrado_por: profile?.id })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('tasas_cambio')
          .insert({ tasa_usd_bs: valor, fecha_registro: hoy, registrado_por: profile?.id });
      }
      await loadTasaHoy();
      toast.success(`Tasa BCV actualizada: Bs ${valor.toFixed(4)}`, { id: 'bcv-sync' });
    } catch (e) {
      toast.error(`Error al sincronizar BCV: ${e.message}`, { id: 'bcv-sync' });
    }
  }

  // Search clients
  async function searchClientes(query) {
    setClienteSearch(query);
    if (query.length < 2) { setClienteResults([]); return; }
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,documento_identidad.ilike.%${query}%`)
      .limit(5);
    setClienteResults(data || []);
  }

  // Create new client inline
  async function crearCliente(e) {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.documento_identidad) {
      toast.error('Nombre y documento son obligatorios');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert(nuevoCliente)
        .select()
        .single();
      if (error) throw error;
      setClienteSeleccionado(data);
      setShowNuevoCliente(false);
      setNuevoCliente({ nombre: '', documento_identidad: '', telefono: '' });
      toast.success('Cliente creado');
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Search products
  async function searchProductos(query) {
    setProductoSearch(query);
    if (query.length < 2) { setProductoResults([]); return; }
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .or(`nombre.ilike.%${query}%,sku.ilike.%${query}%`)
      .gt('stock', 0)
      .limit(10);
    setProductoResults(data || []);
  }

  // Add product to cart
  function agregarAlCarrito(producto) {
    const existente = carrito.find(item => item.producto_id === producto.id);
    if (existente) {
      if (existente.cantidad + 1 > producto.stock) {
        toast.error(`Stock insuficiente. Disponible: ${producto.stock}`);
        return;
      }
      setCarrito(carrito.map(item =>
        item.producto_id === producto.id
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        precio_unitario: parseFloat(producto.precio_usd),
        cantidad: 1,
        subtotal: parseFloat(producto.precio_usd),
        stock_disponible: producto.stock,
      }]);
    }
    setProductoSearch('');
    setProductoResults([]);
    productoSearchRef.current?.focus();
  }

  // Update cart quantity
  function actualizarCantidad(productoId, nuevaCantidad) {
    const item = carrito.find(i => i.producto_id === productoId);
    if (nuevaCantidad < 1) return;
    if (nuevaCantidad > item.stock_disponible) {
      toast.error(`Stock insuficiente. Disponible: ${item.stock_disponible}`);
      return;
    }
    setCarrito(carrito.map(i =>
      i.producto_id === productoId
        ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precio_unitario }
        : i
    ));
  }

  // Remove from cart
  function quitarDelCarrito(productoId) {
    setCarrito(carrito.filter(i => i.producto_id !== productoId));
  }

  // Calculate totals
  const subtotalUSD = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const totalUSD = subtotalUSD;
  const totalBs = tasaHoy ? totalUSD * parseFloat(tasaHoy.tasa_usd_bs) : 0;


  function agregarMetodoPago(metodoId = '') {
    const defaultMontoUSD = Math.max(0, parseFloat((restante || 0).toFixed(2)));
    const metodoConfig = METODOS_PAGO.find(m => m.id === metodoId);
    const tasa = tasaHoy ? parseFloat(tasaHoy.tasa_usd_bs) : 0;
    const montoBs = (metodoConfig?.enBs && tasa > 0) ? parseFloat((defaultMontoUSD * tasa).toFixed(2)) : 0;

    setMetodosPago([
      ...metodosPago,
      {
        metodo: metodoId,
        monto_usd: defaultMontoUSD,
        monto_bs: montoBs,
        referencia: '',
        zelle_email: '',
        zelle_titular: '',
        cashea_inicial_usd: defaultMontoUSD,
        cashea_inicial_bs: montoBs,
      }
    ]);
  }

  function actualizarMetodoPago(index, field, value) {
    const updated = [...metodosPago];
    const item = { ...updated[index] };
    const tasa = tasaHoy ? parseFloat(tasaHoy.tasa_usd_bs) : 0;

    if (field === 'metodo') {
      item.metodo = value;
      const metodoConfig = METODOS_PAGO.find(m => m.id === value);
      // Auto-assign remaining USD if current amount is 0
      if (!item.monto_usd || item.monto_usd === 0) {
        const otherPayments = updated
          .filter((_, i) => i !== index)
          .reduce((sum, mp) => sum + parseFloat(mp.monto_usd || 0), 0);
        const pend = Math.max(0, parseFloat((totalUSD - otherPayments).toFixed(2)));
        item.monto_usd = pend;
      }
      if (metodoConfig?.enBs && tasa > 0) {
        item.monto_bs = parseFloat((item.monto_usd * tasa).toFixed(2));
      } else {
        item.monto_bs = 0;
      }
    } else if (field === 'monto_usd') {
      const numVal = parseFloat(value) || 0;
      item.monto_usd = value === '' ? '' : numVal;
      const metodoConfig = METODOS_PAGO.find(m => m.id === item.metodo);
      if (metodoConfig?.enBs && tasa > 0) {
        item.monto_bs = parseFloat((numVal * tasa).toFixed(2));
      }
    } else if (field === 'monto_bs') {
      const numBs = parseFloat(value) || 0;
      item.monto_bs = value === '' ? '' : numBs;
      if (tasa > 0) {
        item.monto_usd = parseFloat((numBs / tasa).toFixed(2));
      }
    } else {
      item[field] = value;
    }

    updated[index] = item;
    setMetodosPago(updated);
  }

  function quitarMetodoPago(index) {
    setMetodosPago(metodosPago.filter((_, i) => i !== index));
  }

  // Si hay Cashea, calculamos el total cubierto considerando la inicial pagada en tienda + el crédito asumido por Cashea
  const tieneCashea = metodosPago.some(mp => mp.metodo === 'cashea');
  const totalPagado = metodosPago.reduce((sum, mp) => sum + parseFloat(mp.monto_usd || 0), 0);
  // Si usa Cashea, la inicial es lo que paga el cliente hoy, y el crédito Cashea cubre el resto de la factura
  const casheaItem = metodosPago.find(mp => mp.metodo === 'cashea');
  const casheaCreditoUSD = (tieneCashea && casheaItem) ? Math.max(0, parseFloat((totalUSD - totalPagado).toFixed(2))) : 0;
  const restante = tieneCashea ? 0 : Math.max(0, parseFloat((totalUSD - totalPagado).toFixed(2)));

  // Emit invoice
  async function emitirFactura() {
    if (!clienteSeleccionado) { toast.error('Seleccione un cliente'); return; }
    if (carrito.length === 0) { toast.error('Agregue productos al carrito'); return; }
    if (!tasaHoy) { toast.error('No hay tasa de cambio registrada'); return; }
    if (restante > 0.01) { toast.error(`Faltan ${formatUSD(restante)} por pagar`); return; }

    // Validate payment methods requirements
    for (const mp of metodosPago) {
      if (!mp.metodo) { toast.error('Seleccione el método de pago'); return; }
      if (mp.metodo === 'zelle') {
        if (!mp.zelle_titular?.trim()) { toast.error('Ingrese el nombre del titular/emisor de Zelle'); return; }
        if (!mp.zelle_email?.trim()) { toast.error('Ingrese el correo del emisor de Zelle'); return; }
      } else if (mp.metodo === 'cashea') {
        if (!mp.referencia?.trim()) { toast.error('Ingrese el N° de orden / comprobante Cashea'); return; }
        if (parseFloat(mp.monto_usd || 0) <= 0) { toast.error('Ingrese el monto de la inicial pagada en Cashea'); return; }
      } else if (METODOS_PAGO.find(m => m.id === mp.metodo)?.requiereReferencia) {
        if (!mp.referencia?.trim()) { toast.error(`Ingrese el número de referencia para ${METODOS_PAGO.find(m => m.id === mp.metodo)?.label}`); return; }
      }
    }

    setLoading(true);
    try {
      // Generate invoice number
      const { data: numData, error: numError } = await supabase.rpc('generar_numero_factura');
      if (numError) throw numError;

      // Prepare payment methods for storage
      const tasa = parseFloat(tasaHoy.tasa_usd_bs);
      const metodosStorage = metodosPago.map(mp => {
        if (mp.metodo === 'cashea') {
          const inicialUSD = parseFloat(mp.monto_usd || 0);
          const inicialBs = parseFloat((inicialUSD * tasa).toFixed(2));
          const creditoUSD = parseFloat((totalUSD - totalPagado).toFixed(2));
          const creditoBs = parseFloat((creditoUSD * tasa).toFixed(2));
          return {
            metodo: 'Cashea',
            metodo_id: 'cashea',
            monto_usd: inicialUSD,
            monto_bs: inicialBs,
            inicial_usd: inicialUSD,
            inicial_bs: inicialBs,
            credito_cashea_usd: creditoUSD,
            credito_cashea_bs: creditoBs,
            referencia: mp.referencia || '',
          };
        }
        return {
          metodo: METODOS_PAGO.find(m => m.id === mp.metodo)?.label || mp.metodo,
          metodo_id: mp.metodo,
          monto_usd: parseFloat(mp.monto_usd || 0),
          ...(mp.monto_bs > 0 && { monto_bs: parseFloat(mp.monto_bs) }),
          ...(mp.referencia && { referencia: mp.referencia }),
          ...(mp.zelle_titular && { zelle_titular: mp.zelle_titular }),
          ...(mp.zelle_email && { zelle_email: mp.zelle_email }),
        };
      });

      // Insert invoice without subtotal_usd if it's a generated/default column
      const invoicePayload = {
        numero_factura: numData,
        cliente_id: clienteSeleccionado.id,
        vendedor_id: profile.id,
        tasa_id: tasaHoy.id,
        descuento_usd: 0,
        total_usd: totalUSD,
        total_bs: totalBs,
        metodos_pago: metodosStorage,
      };

      // Try inserting with subtotal_usd; if schema complains it's a generated column, retry without it
      let factura;
      const { data: factData, error: factError } = await supabase
        .from('facturas')
        .insert({ ...invoicePayload, subtotal_usd: subtotalUSD })
        .select()
        .single();

      if (factError) {
        if (factError.message?.includes('subtotal_usd') || factError.code === '428C9') {
          const { data: retryData, error: retryError } = await supabase
            .from('facturas')
            .insert(invoicePayload)
            .select()
            .single();
          if (retryError) throw retryError;
          factura = retryData;
        } else {
          throw factError;
        }
      } else {
        factura = factData;
      }

      // Insert invoice details
      const detalles = carrito.map(item => ({
        factura_id: factura.id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        cantidad: item.cantidad,
        precio_unitario_usd: item.precio_unitario,
        subtotal_usd: item.subtotal,
      }));

      const { error: detError } = await supabase
        .from('detalles_factura')
        .insert(detalles);
      if (detError) throw detError;

      // Success!
      setFacturaEmitida({
        ...factura,
        cliente: clienteSeleccionado,
        detalles: carrito,
        tasa: tasaHoy,
        vendedor: profile,
        metodos_pago_detalle: metodosStorage,
      });

      
      toast.success(`Factura ${numData} emitida correctamente`);
      
      // Reset form
      setCarrito([]);
      setClienteSeleccionado(null);
      setClienteSearch('');
      setMetodosPago([]);
      setShowPago(false);
    } catch (error) {
      toast.error(error.message || 'Error al emitir factura');
    } finally {
      setLoading(false);
    }
  }

  function nuevaVenta() {
    setFacturaEmitida(null);
    setShowTicket(false);
  }

  // Render invoice success screen
  if (facturaEmitida) {
    return (
      <div className="page">
        {showTicket && (
          <TicketFactura
            factura={facturaEmitida}
            onClose={() => setShowTicket(false)}
          />
        )}
        <div className="pos-success">
          <div className="pos-success__icon">
            <HiOutlineCheckCircle />
          </div>
          <h2>¡Factura Emitida!</h2>
          <p className="pos-success__numero">{facturaEmitida.numero_factura}</p>
          <p className="pos-success__total">{formatUSD(facturaEmitida.total_usd)}</p>
          <p className="pos-success__total-bs">{formatBs(facturaEmitida.total_bs)}</p>
          
          <div className="pos-success__actions">
            <button className="btn btn--primary" onClick={() => setShowTicket(true)}>
              <HiOutlinePrinter /> Imprimir Ticket
            </button>
            <button className="btn btn--outline" onClick={nuevaVenta}>
              <HiOutlinePlus /> Nueva Venta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page pos-page">
      <div className="page__header">
        <h1 className="page__title">Punto de Venta</h1>
        {tasaHoy && (
          <div className="pos-tasa" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Tasa BCV: <strong>Bs {formatTasa(tasaHoy.tasa_usd_bs)}</strong></span>
            <button
              className="btn btn--ghost btn--xs"
              onClick={sincronizarBCV}
              title="Actualizar tasa desde BCV"
            >
              <HiOutlineArrowPath />
            </button>
          </div>
        )}
        {!tasaHoy && (
          <div className="pos-tasa pos-tasa--warning" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>⚠️ Sin tasa de cambio</span>
            <button className="btn btn--primary btn--xs" onClick={sincronizarBCV}>
              <HiOutlineArrowPath /> Cargar Tasa BCV
            </button>
          </div>
        )}
      </div>

      <div className="pos-layout">
        {/* Left: Products area */}
        <div className="pos-products">
          {/* Client selection */}
          <div className="card pos-section">
            <h3 className="card__title">Cliente</h3>
            {clienteSeleccionado ? (
              <div className="pos-cliente-selected">
                <div>
                  <strong>{clienteSeleccionado.nombre}</strong>
                  <span>{clienteSeleccionado.documento_identidad}</span>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => {
                  setClienteSeleccionado(null);
                  setClienteSearch('');
                }}>
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
                    onChange={(e) => searchClientes(e.target.value)}
                  />
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowNuevoCliente(true)} title="Nuevo Cliente">
                    <HiOutlineUserPlus />
                  </button>
                </div>
                {clienteResults.length > 0 && (
                  <div className="search-results">
                    {clienteResults.map(c => (
                      <button key={c.id} className="search-result-item" onClick={() => {
                        setClienteSeleccionado(c);
                        setClienteSearch('');
                        setClienteResults([]);
                      }}>
                        <span className="search-result-item__name">{c.nombre}</span>
                        <span className="search-result-item__sub">{c.documento_identidad}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* New Client Modal Inline */}
            {showNuevoCliente && (
              <div className="pos-nuevo-cliente">
                <form onSubmit={crearCliente}>
                  <h4>Nuevo Cliente</h4>
                  <input placeholder="Nombre completo" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} required />
                  <input placeholder="Cédula / RIF" value={nuevoCliente.documento_identidad} onChange={e => setNuevoCliente({...nuevoCliente, documento_identidad: e.target.value})} required />
                  <input placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} />
                  <div className="pos-nuevo-cliente__actions">
                    <button type="submit" className="btn btn--primary btn--sm">Guardar</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowNuevoCliente(false)}>Cancelar</button>
                  </div>
                </form>
              </div>
            )}
          </div>

            {/* Product search */}
          <div className="card pos-section">
            <h3 className="card__title">Agregar Productos</h3>
            <div className="search-box">
              <HiOutlineMagnifyingGlass className="search-box__icon" />
              <input
                ref={productoSearchRef}
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={productoSearch}
                onChange={(e) => searchProductos(e.target.value)}
              />
            </div>
            {productoResults.length > 0 && (
              <div className="search-results">
                {productoResults.map(p => (
                  <button key={p.id} className="search-result-item" onClick={() => agregarAlCarrito(p)}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="search-result-item__name">{p.nombre}</span>
                      </div>
                      <span className="search-result-item__sub">{p.sku} — Stock: {p.stock}</span>
                    </div>
                    <span className="search-result-item__price">{formatUSD(p.precio_usd)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="card pos-section">
            <h3 className="card__title">Carrito ({carrito.length})</h3>
            {carrito.length === 0 ? (
              <p className="card__empty">Agregue productos para comenzar</p>
            ) : (
              <div className="pos-cart">
                {carrito.map(item => (
                  <div key={item.producto_id} className="pos-cart-item">
                    <div className="pos-cart-item__info">
                      <span className="pos-cart-item__name">{item.producto_nombre}</span>
                      <span className="pos-cart-item__price">{formatUSD(item.precio_unitario)} c/u</span>
                    </div>
                    <div className="pos-cart-item__controls">
                      <button className="btn btn--ghost btn--xs" onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}>−</button>
                      <input
                        type="number"
                        className="pos-cart-item__qty"
                        value={item.cantidad}
                        min={1}
                        max={item.stock_disponible}
                        onChange={(e) => actualizarCantidad(item.producto_id, parseInt(e.target.value) || 1)}
                      />
                      <button className="btn btn--ghost btn--xs" onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}>+</button>
                    </div>
                    <span className="pos-cart-item__subtotal">{formatUSD(item.subtotal)}</span>
                    <button className="btn btn--ghost btn--xs text-danger" onClick={() => quitarDelCarrito(item.producto_id)}>
                      <HiOutlineTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Payment */}
        <div className="pos-summary">
          <div className="card">
            <h3 className="card__title">Resumen</h3>
            
            <div className="pos-totals">
              <div className="pos-totals__row pos-totals__row--total">
                <span>Total USD</span>
                <span>{formatUSD(totalUSD)}</span>
              </div>
              {tasaHoy && (
                <div className="pos-totals__row pos-totals__row--bs">
                  <span>Total Bs</span>
                  <span>{formatBs(totalBs)}</span>
                </div>
              )}
            </div>


            {!showPago ? (
              <button
                className="btn btn--primary btn--full"
                onClick={() => {
                  if (carrito.length === 0) { toast.error('Carrito vacío'); return; }
                  if (!clienteSeleccionado) { toast.error('Seleccione un cliente'); return; }
                  if (!tasaHoy) { toast.error('Registre la tasa del día primero'); return; }
                  setShowPago(true);
                  agregarMetodoPago();
                }}
                disabled={carrito.length === 0}
              >
                Cobrar {formatUSD(totalUSD)}
              </button>
            ) : (
              <div className="pos-payment">
                <h4>Métodos de Pago</h4>
                
                {metodosPago.map((mp, index) => {
                  const metodoConfig = METODOS_PAGO.find(m => m.id === mp.metodo);
                  return (
                    <div key={index} className="pos-payment-method">
                      <div className="pos-payment-method__header">
                        <select
                          value={mp.metodo}
                          onChange={(e) => actualizarMetodoPago(index, 'metodo', e.target.value)}
                        >
                          <option value="">Seleccionar método...</option>
                          {METODOS_PAGO.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs text-danger"
                          onClick={() => quitarMetodoPago(index)}
                          title="Eliminar método"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>

                      {mp.metodo && (
                        <>
                          <div className="pos-payment-method__amounts">
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                              <label style={{ fontSize: '0.75rem' }}>Monto ($ USD)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={mp.monto_usd ?? ''}
                                onChange={(e) => actualizarMetodoPago(index, 'monto_usd', e.target.value)}
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
                                  onChange={(e) => actualizarMetodoPago(index, 'monto_bs', e.target.value)}
                                />
                              </div>
                            )}
                          </div>

                          {/* Zelle details: Correo y Nombre del emisor */}
                          {metodoConfig?.isZelle && (
                            <div className="pos-payment-method__zelle">
                              <div className="form-group" style={{ marginBottom: '0.35rem' }}>
                                <input
                                  type="text"
                                  placeholder="Nombre / Titular del Emisor Zelle"
                                  value={mp.zelle_titular || ''}
                                  onChange={(e) => actualizarMetodoPago(index, 'zelle_titular', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <input
                                  type="email"
                                  placeholder="Correo del Emisor Zelle"
                                  value={mp.zelle_email || ''}
                                  onChange={(e) => actualizarMetodoPago(index, 'zelle_email', e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                          )}

                          {/* Cashea details: Notificación de crédito y comprobante */}
                          {metodoConfig?.isCashea && (
                            <div style={{
                              background: 'rgba(234, 179, 8, 0.1)',
                              border: '1px solid rgba(234, 179, 8, 0.3)',
                              borderRadius: '6px',
                              padding: '0.5rem 0.65rem',
                              marginTop: '0.35rem',
                              fontSize: '0.78rem',
                              color: '#FACC15'
                            }}>
                              <span>El cliente paga esta inicial en tienda. El resto queda a crédito Cashea.</span>
                            </div>
                          )}

                          {/* Referencia para Pago Móvil, Punto de Venta, Transferencia o Cashea */}
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
                                onChange={(e) => actualizarMetodoPago(index, 'referencia', e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                <button className="btn btn--ghost btn--sm" onClick={() => agregarMetodoPago()}>
                  <HiOutlinePlus /> Agregar otro método (Pago Mixto)
                </button>

                <div className="pos-payment-summary">
                  <div className="pos-totals__row">
                    <span>Pagado</span>
                    <span className="text-success">{formatUSD(totalPagado)}</span>
                  </div>
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
                    onClick={emitirFactura}
                    disabled={loading || restante > 0.01}
                  >
                    {loading ? 'Procesando...' : `Emitir Factura ${formatUSD(totalUSD)}`}
                  </button>
                  <button className="btn btn--ghost btn--full" onClick={() => { setShowPago(false); setMetodosPago([]); }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
