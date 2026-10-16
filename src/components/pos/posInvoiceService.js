import { supabase } from '../../lib/supabase';
import { METODOS_PAGO, METODOS_INICIAL_CASHEA } from '../../utils/constants';

/**
 * Función desacoplada para emitir la factura en Supabase y registrar detalles
 */
export async function procesarEmisionFactura({
  clienteSeleccionado,
  carrito,
  tasaHoy,
  totalUSD,
  totalBs,
  metodosPago,
  tieneCashea,
  totalPagadoEnTienda,
  profile,
}) {
  const { data: numData, error: numError } = await supabase.rpc('generar_numero_factura');
  if (numError) throw numError;

  const tasa = parseFloat(tasaHoy.tasa_usd_bs);
  const desgloseInicial = tieneCashea ? metodosPago.map(mp => {
    if (mp.metodo === 'cashea') {
      const metodoInicialConfig = METODOS_INICIAL_CASHEA.find(m => m.id === mp.cashea_metodo_inicial);
      const montoUSD = parseFloat(mp.monto_usd || 0);
      const montoBs = mp.monto_bs ? parseFloat(mp.monto_bs) : (tasa > 0 ? parseFloat((montoUSD * tasa).toFixed(2)) : 0);
      return {
        metodo: metodoInicialConfig?.label || 'Punto de Venta',
        metodo_id: mp.cashea_metodo_inicial || 'punto_venta',
        monto_usd: montoUSD,
        monto_bs: montoBs,
        referencia: mp.cashea_referencia_inicial || '',
      };
    }
    const montoUSD = parseFloat(mp.monto_usd || 0);
    const montoBs = mp.monto_bs ? parseFloat(mp.monto_bs) : (tasa > 0 ? parseFloat((montoUSD * tasa).toFixed(2)) : 0);
    return {
      metodo: METODOS_PAGO.find(m => m.id === mp.metodo)?.label || mp.metodo,
      metodo_id: mp.metodo,
      monto_usd: montoUSD,
      monto_bs: montoBs,
      referencia: mp.referencia || '',
      titular: mp.zelle_titular || '',
    };
  }) : [];

  const metodosStorage = metodosPago.map(mp => {
    const montoUSD = parseFloat(mp.monto_usd || 0);
    const montoBs = mp.monto_bs ? parseFloat(mp.monto_bs) : (tasa > 0 ? parseFloat((montoUSD * tasa).toFixed(2)) : 0);

    if (mp.metodo === 'cashea') {
      const inicialUSD = totalPagadoEnTienda;
      const inicialBs = parseFloat((inicialUSD * tasa).toFixed(2));
      const creditoUSD = Math.max(0, parseFloat((totalUSD - totalPagadoEnTienda).toFixed(2)));
      const creditoBs = parseFloat((creditoUSD * tasa).toFixed(2));
      const metodoInicialConfig = METODOS_INICIAL_CASHEA.find(m => m.id === mp.cashea_metodo_inicial);
      return {
        metodo: 'Cashea',
        metodo_id: 'cashea',
        monto_usd: montoUSD,
        monto_bs: montoBs,
        inicial_usd: inicialUSD,
        inicial_bs: inicialBs,
        cashea_metodo_inicial: mp.cashea_metodo_inicial || 'punto_venta',
        cashea_metodo_inicial_label: metodoInicialConfig?.label || 'Punto de Venta',
        cashea_referencia_inicial: mp.cashea_referencia_inicial || '',
        credito_cashea_usd: creditoUSD,
        credito_cashea_bs: creditoBs,
        referencia: mp.referencia || '',
        desglose_inicial: desgloseInicial,
      };
    }
    return {
      metodo: METODOS_PAGO.find(m => m.id === mp.metodo)?.label || mp.metodo,
      metodo_id: mp.metodo,
      monto_usd: montoUSD,
      monto_bs: montoBs,
      ...(mp.referencia && { referencia: mp.referencia }),
      ...(mp.zelle_titular && { zelle_titular: mp.zelle_titular }),
      ...(mp.zelle_email && { zelle_email: mp.zelle_email }),
    };
  });

  const invoicePayload = {
    numero_factura: numData,
    cliente_id: clienteSeleccionado.id,
    vendedor_id: profile?.id,
    tasa_id: tasaHoy.id,
    descuento_usd: 0,
    total_usd: totalUSD,
    total_bs: totalBs,
    metodos_pago: metodosStorage,
  };

  let factura;
  let { data: factData, error: factError } = await supabase
    .from('facturas')
    .insert(invoicePayload)
    .select()
    .single();

  if (factError && factError.code === '23505' && factError.message?.includes('facturas_numero_factura_key')) {
    const { data: nuevoNum } = await supabase.rpc('generar_numero_factura');
    if (nuevoNum) {
      invoicePayload.numero_factura = nuevoNum;
      const retryRes = await supabase.from('facturas').insert(invoicePayload).select().single();
      factData = retryRes.data;
      factError = retryRes.error;
    }
  }

  if (factError) {
    if (factError.message?.includes('subtotal_usd')) {
      const { data: retryData, error: retryError } = await supabase
        .from('facturas')
        .insert({ ...invoicePayload, subtotal_usd: totalUSD })
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

  const detallesBase = carrito.map(item => ({
    factura_id: factura.id,
    producto_id: item.producto_id,
    producto_nombre: item.producto_nombre,
    cantidad: item.cantidad,
    precio_unitario_usd: item.precio_unitario,
    es_combo: !!item.es_combo,
    items_combo: item.items_combo || [],
  }));

  const { error: detError } = await supabase.from('detalles_factura').insert(detallesBase);

  if (detError) {
    if (detError.message?.includes('subtotal_usd') || detError.code === '23502') {
      const detallesConSubtotal = carrito.map(item => ({
        ...detallesBase.find(d => d.producto_id === item.producto_id),
        subtotal_usd: item.subtotal,
      }));
      const { error: detRetryError } = await supabase.from('detalles_factura').insert(detallesConSubtotal);
      if (detRetryError) throw detRetryError;
    } else {
      throw detError;
    }
  }

  return {
    factura,
    numData,
    metodosStorage,
  };
}
