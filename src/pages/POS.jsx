import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { METODOS_PAGO, METODOS_INICIAL_CASHEA } from '../utils/constants';
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
  HiOutlineBolt,
} from 'react-icons/hi2';
import ModalConfigImpresoras from '../components/print/ModalConfigImpresoras';
import { imprimirFactura, getPrinterConfig } from '../services/printService';
import { usePosTabs } from '../components/pos/usePosTabs';
import PosTabsBar from '../components/pos/PosTabsBar';
import PosPaymentPanel from '../components/pos/PosPaymentPanel';
import PosClientSection from '../components/pos/PosClientSection';
import { procesarEmisionFactura } from '../components/pos/posInvoiceService';

import PosCartSection from '../components/pos/PosCartSection';

export default function POS() {
  const { profile, isAdmin } = useAuth();
  const [modalImpresorasOpen, setModalImpresorasOpen] = useState(false);

  // Sistema de Cuentas Simultáneas y Caché persistente (Local Storage)
  const {
    cuentas,
    activeIdx,
    setActiveIdx,
    cuentaActiva,
    actualizarCuentaActiva,
    agregarCuenta,
    cerrarCuenta,
    limpiarCuentaActiva,
  } = usePosTabs();

  // Atajos para la cuenta activa en foco
  const clienteSeleccionado = cuentaActiva?.clienteSeleccionado || null;
  const clienteSearch = cuentaActiva?.clienteSearch || '';
  const carrito = cuentaActiva?.carrito || [];
  const showPago = cuentaActiva?.showPago || false;
  const metodosPago = cuentaActiva?.metodosPago || [];

  // Estados locales temporales (búsqueda y modales)
  const [clienteResults, setClienteResults] = useState([]);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', documento_identidad: '', telefono: '' });
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResults, setProductoResults] = useState([]);
  const [tasaHoy, setTasaHoy] = useState(null);
  const [facturaEmitida, setFacturaEmitida] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const productoSearchRef = useRef(null);

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
      const valor = parseFloat(bcv.tasa_usd.toFixed(2));
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
      toast.success(`Tasa BCV actualizada: Bs ${valor.toFixed(2)}`, { id: 'bcv-sync' });
    } catch (e) {
      toast.error(`Error al sincronizar BCV: ${e.message}`, { id: 'bcv-sync' });
    }
  }

  // Búsqueda de clientes
  async function searchClientes(query) {
    actualizarCuentaActiva({ clienteSearch: query });
    if (query.length < 2) { setClienteResults([]); return; }
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,documento_identidad.ilike.%${query}%`)
      .limit(5);
    setClienteResults(data || []);
  }

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
      actualizarCuentaActiva({ clienteSeleccionado: data, clienteSearch: '' });
      setShowNuevoCliente(false);
      setNuevoCliente({ nombre: '', documento_identidad: '', telefono: '' });
      toast.success('Cliente creado');
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Búsqueda de productos
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

  // Operaciones del Carrito en la Cuenta Activa
  function agregarAlCarrito(producto) {
    const existente = carrito.find(item => item.producto_id === producto.id);
    if (existente) {
      if (existente.cantidad + 1 > producto.stock) {
        toast.error(`Stock insuficiente. Disponible: ${producto.stock}`);
        return;
      }
      const nuevoCarrito = carrito.map(item =>
        item.producto_id === producto.id
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
          : item
      );
      actualizarCuentaActiva({ carrito: nuevoCarrito });
    } else {
      const nuevoItem = {
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        precio_unitario: parseFloat(producto.precio_usd),
        cantidad: 1,
        subtotal: parseFloat(producto.precio_usd),
        stock_disponible: producto.stock,
        es_combo: !!producto.es_combo,
        items_combo: producto.items_combo || [],
      };
      actualizarCuentaActiva({ carrito: [...carrito, nuevoItem] });
    }
    setProductoSearch('');
    setProductoResults([]);
    productoSearchRef.current?.focus();
  }

  function actualizarCantidad(productoId, nuevaCantidad) {
    const item = carrito.find(i => i.producto_id === productoId);
    if (!item) return;
    const val = parseInt(nuevaCantidad, 10);
    if (isNaN(val) || val < 1) return;
    if (val > item.stock_disponible) {
      toast.error(`Stock insuficiente. Disponible: ${item.stock_disponible}`);
      return;
    }
    const nuevoCarrito = carrito.map(i =>
      i.producto_id === productoId
        ? { ...i, cantidad: val, subtotal: val * i.precio_unitario }
        : i
    );
    actualizarCuentaActiva({ carrito: nuevoCarrito });
  }

  function quitarDelCarrito(productoId) {
    actualizarCuentaActiva({ carrito: carrito.filter(i => i.producto_id !== productoId) });
  }

  // Cálculos de Totales
  const subtotalUSD = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const totalUSD = subtotalUSD;
  const totalBs = tasaHoy ? totalUSD * parseFloat(tasaHoy.tasa_usd_bs) : 0;

  // Métodos de Pago
  function agregarMetodoPago(metodoId = '') {
    const metodoConfig = METODOS_PAGO.find(m => m.id === metodoId);
    const tasa = tasaHoy ? parseFloat(tasaHoy.tasa_usd_bs) : 0;
    const otherPayments = metodosPago.reduce((sum, mp) => sum + parseFloat(mp.monto_usd || 0), 0);
    const pend = Math.max(0, parseFloat((totalUSD - otherPayments).toFixed(2)));
    const defaultMontoUSD = metodoConfig?.isCashea ? parseFloat((pend * 0.40).toFixed(2)) : pend;
    const montoBs = (metodoConfig?.enBs && tasa > 0) ? parseFloat((defaultMontoUSD * tasa).toFixed(2)) : 0;

    actualizarCuentaActiva({
      metodosPago: [
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
      ]
    });
  }

  function actualizarMetodoPago(index, field, value) {
    const updated = [...metodosPago];
    const item = { ...updated[index] };
    const tasa = tasaHoy ? parseFloat(tasaHoy.tasa_usd_bs) : 0;

    if (field === 'metodo') {
      item.metodo = value;
      const metodoConfig = METODOS_PAGO.find(m => m.id === value);
      const otherPayments = updated
        .filter((_, i) => i !== index)
        .reduce((sum, mp) => sum + parseFloat(mp.monto_usd || 0), 0);
      const pend = Math.max(0, parseFloat((totalUSD - otherPayments).toFixed(2)));

      if (metodoConfig?.isCashea) {
        item.monto_usd = parseFloat((pend * 0.40).toFixed(2));
      } else if (!item.monto_usd || item.monto_usd === 0) {
        item.monto_usd = pend;
      }

      item.monto_bs = (metodoConfig?.enBs && tasa > 0) ? parseFloat((item.monto_usd * tasa).toFixed(2)) : 0;
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
    actualizarCuentaActiva({ metodosPago: updated });
  }

  function quitarMetodoPago(index) {
    actualizarCuentaActiva({ metodosPago: metodosPago.filter((_, i) => i !== index) });
  }

  const tieneCashea = metodosPago.some(mp => mp.metodo === 'cashea');
  const casheaItem = metodosPago.find(mp => mp.metodo === 'cashea');
  const otrosPagos = metodosPago.filter(mp => mp.metodo !== 'cashea').reduce((sum, mp) => sum + parseFloat(mp.monto_usd || 0), 0);
  const casheaInicial = tieneCashea ? parseFloat(casheaItem?.monto_usd || 0) : 0;
  const totalPagadoEnTienda = otrosPagos + casheaInicial;
  const casheaCreditoUSD = tieneCashea ? Math.max(0, parseFloat((totalUSD - totalPagadoEnTienda).toFixed(2))) : 0;
  const restante = tieneCashea
    ? (casheaInicial <= 0 ? Math.max(0, parseFloat((totalUSD - otrosPagos).toFixed(2))) : 0)
    : Math.max(0, parseFloat((totalUSD - totalPagadoEnTienda).toFixed(2)));

  // Emisión de Factura
  async function emitirFactura() {
    if (!clienteSeleccionado) { toast.error('Seleccione un cliente'); return; }
    if (carrito.length === 0) { toast.error('Agregue productos al carrito'); return; }
    if (!tasaHoy) { toast.error('No hay tasa de cambio registrada'); return; }
    if (restante > 0.01) { toast.error(`Faltan ${formatUSD(restante)} por pagar`); return; }

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
      const { factura, numData, metodosStorage } = await procesarEmisionFactura({
        clienteSeleccionado,
        carrito,
        tasaHoy,
        totalUSD,
        totalBs,
        metodosPago,
        tieneCashea,
        totalPagadoEnTienda,
        profile,
      });

      const nuevaFacturaData = {
        ...factura,
        cliente: clienteSeleccionado,
        detalles: carrito,
        tasa: tasaHoy,
        vendedor: profile,
        metodos_pago_detalle: metodosStorage,
      };
      setFacturaEmitida(nuevaFacturaData);

      try {
        const printCfg = getPrinterConfig()?.facturas;
        if (printCfg?.autoPrint && (printCfg?.targetPrinter || printCfg?.connectionType === 'socket')) {
          imprimirFactura(nuevaFacturaData).catch(() => {});
        }
      } catch (printErr) {
        // Silenciar error en autoPrint
      }

      toast.success(`Factura ${numData} emitida correctamente`);
      limpiarCuentaActiva();
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
          
          <div className="pos-success__actions" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
            <button 
              className="btn btn--primary" 
              onClick={() => imprimirFactura(facturaEmitida)}
              title="Imprimir directamente en la impresora térmica sin diálogos"
            >
              <HiOutlineBolt /> Imprimir Térmico Directo (80mm)
            </button>
            <button className="btn btn--secondary" onClick={() => setShowTicket(true)}>
              <HiOutlinePrinter /> Vista Previa
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page__title">Punto de Venta</h1>
          <button
            className="btn btn--secondary btn--xs"
            onClick={() => setModalImpresorasOpen(true)}
            title="Configurar impresoras térmicas de tickets y etiquetas"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <HiOutlinePrinter /> Configurar Impresora
          </button>
        </div>
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

      {/* Barra de Múltiples Cuentas Concurrentes y Caché */}
      <PosTabsBar
        cuentas={cuentas}
        activeIdx={activeIdx}
        onSelectCuenta={setActiveIdx}
        onAddCuenta={agregarCuenta}
        onCloseCuenta={cerrarCuenta}
        onRenameCuenta={(idx, nuevoNombre) => {
          actualizarCuentaActiva({ nombre: nuevoNombre });
        }}
      />

      <div className="pos-layout">
        {/* Izquierda: Selección de Cliente y Catálogo de Productos */}
        <div className="pos-products">
          <PosClientSection
            cuentaNombre={cuentaActiva?.nombre || 'Cuenta Actual'}
            clienteSeleccionado={clienteSeleccionado}
            clienteSearch={clienteSearch}
            clienteResults={clienteResults}
            showNuevoCliente={showNuevoCliente}
            nuevoCliente={nuevoCliente}
            onSearchClientes={searchClientes}
            onSelectCliente={(c) => {
              actualizarCuentaActiva({ clienteSeleccionado: c, clienteSearch: '' });
              setClienteResults([]);
            }}
            onDeselectCliente={() => actualizarCuentaActiva({ clienteSeleccionado: null, clienteSearch: '' })}
            onToggleNuevoCliente={setShowNuevoCliente}
            onNuevoClienteChange={setNuevoCliente}
            onCrearCliente={crearCliente}
          />

          {/* Sección de Búsqueda de Productos y Carrito (con soporte de Combos) */}
          <PosCartSection
            productoSearch={productoSearch}
            onSearchChange={searchProductos}
            productoResults={productoResults}
            onAgregarAlCarrito={agregarAlCarrito}
            productoSearchRef={productoSearchRef}
            carrito={carrito}
            cuentaNombre={cuentaActiva?.nombre}
            onActualizarCantidad={actualizarCantidad}
            onQuitarDelCarrito={quitarDelCarrito}
          />
        </div>

        {/* Derecha: Resumen de Totales y Pasarela de Cobro */}
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
                  if (carrito.some(i => !i.cantidad || parseInt(i.cantidad, 10) < 1)) {
                    toast.error('Por favor especifique cantidades válidas en el carrito');
                    return;
                  }
                  if (!clienteSeleccionado) { toast.error('Seleccione un cliente'); return; }
                  if (!tasaHoy) { toast.error('Registre la tasa del día primero'); return; }
                  actualizarCuentaActiva({ showPago: true });
                  agregarMetodoPago();
                }}
                disabled={carrito.length === 0}
              >
                Cobrar {formatUSD(totalUSD)}
              </button>
            ) : (
              <PosPaymentPanel
                metodosPago={metodosPago}
                totalUSD={totalUSD}
                tasaHoy={tasaHoy}
                tieneCashea={tieneCashea}
                totalPagadoEnTienda={totalPagadoEnTienda}
                casheaCreditoUSD={casheaCreditoUSD}
                restante={restante}
                loading={loading}
                onActualizarMetodo={actualizarMetodoPago}
                onQuitarMetodo={quitarMetodoPago}
                onAgregarMetodo={() => agregarMetodoPago()}
                onEmitirFactura={emitirFactura}
                onCancelar={() => actualizarCuentaActiva({ showPago: false, metodosPago: [] })}
              />
            )}
          </div>
        </div>
      </div>

      <ModalConfigImpresoras
        isOpen={modalImpresorasOpen}
        onClose={() => setModalImpresorasOpen(false)}
      />
    </div>
  );
}
