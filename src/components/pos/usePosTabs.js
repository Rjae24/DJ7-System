/**
 * Hook y utilidades para persistencia y pestañas concurrentes del Punto de Venta (POS)
 * Permite manejar múltiples cuentas/tickets abiertos a la vez ("Cuentas en Espera / Pestañas")
 * y sincronizar en caché local (localStorage) para no perder datos al navegar a Inventario u otros módulos.
 */
import { useState, useEffect, useCallback } from 'react';

export const POS_CACHE_STORAGE_KEY = 'dj7_pos_cuentas_cache';
export const POS_ACTIVE_INDEX_KEY = 'dj7_pos_active_cuenta_index';

export function createNuevaCuenta(index = 1) {
  return {
    id: `cuenta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    nombre: `Cuenta ${index}`,
    clienteSeleccionado: null,
    clienteSearch: '',
    carrito: [],
    showPago: false,
    metodosPago: [],
    creadaEn: new Date().toISOString(),
  };
}

export function loadCuentasFromStorage() {
  try {
    const raw = localStorage.getItem(POS_CACHE_STORAGE_KEY);
    if (!raw) return [createNuevaCuenta(1)];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [createNuevaCuenta(1)];
  } catch (err) {
    console.warn('[PosCache] Error al recuperar cuentas del storage:', err);
    return [createNuevaCuenta(1)];
  }
}

export function saveCuentasToStorage(cuentas) {
  try {
    localStorage.setItem(POS_CACHE_STORAGE_KEY, JSON.stringify(cuentas));
  } catch (err) {
    console.error('[PosCache] Error al guardar cuentas en storage:', err);
  }
}

export function loadActiveIndexFromStorage(maxIndex) {
  try {
    const raw = localStorage.getItem(POS_ACTIVE_INDEX_KEY);
    if (raw !== null) {
      const idx = parseInt(raw, 10);
      if (!isNaN(idx) && idx >= 0 && idx < maxIndex) {
        return idx;
      }
    }
  } catch {
    // ignorar
  }
  return 0;
}

export function saveActiveIndexToStorage(index) {
  try {
    localStorage.setItem(POS_ACTIVE_INDEX_KEY, String(index));
  } catch {
    // ignorar
  }
}

export function usePosTabs() {
  const [cuentas, setCuentas] = useState(loadCuentasFromStorage);
  const [activeIdx, setActiveIdx] = useState(() => loadActiveIndexFromStorage(cuentas.length));

  // Persistir en localStorage automáticamente cada vez que cambien las cuentas
  useEffect(() => {
    saveCuentasToStorage(cuentas);
  }, [cuentas]);

  // Persistir índice activo
  useEffect(() => {
    saveActiveIndexToStorage(activeIdx);
  }, [activeIdx]);

  const cuentaActiva = cuentas[activeIdx] || cuentas[0];

  const actualizarCuentaActiva = useCallback((updater) => {
    setCuentas(prev => {
      const copy = [...prev];
      const actual = copy[activeIdx] || copy[0];
      const updated = typeof updater === 'function' ? updater(actual) : { ...actual, ...updater };
      copy[activeIdx] = updated;
      return copy;
    });
  }, [activeIdx]);

  const agregarCuenta = useCallback(() => {
    setCuentas(prev => {
      const nextIndex = prev.length + 1;
      const nueva = createNuevaCuenta(nextIndex);
      const updated = [...prev, nueva];
      setActiveIdx(updated.length - 1);
      return updated;
    });
  }, []);

  const cerrarCuenta = useCallback((indexParaCerrar) => {
    setCuentas(prev => {
      if (prev.length <= 1) {
        // Si es la última cuenta, simplemente la reseteamos en vez de borrarla
        return [createNuevaCuenta(1)];
      }
      const updated = prev.filter((_, i) => i !== indexParaCerrar);
      setActiveIdx(curr => {
        if (curr >= updated.length) return updated.length - 1;
        if (curr === indexParaCerrar) return Math.max(0, indexParaCerrar - 1);
        if (curr > indexParaCerrar) return curr - 1;
        return curr;
      });
      return updated;
    });
  }, []);

  const limpiarCuentaActiva = useCallback(() => {
    actualizarCuentaActiva({
      clienteSeleccionado: null,
      clienteSearch: '',
      carrito: [],
      showPago: false,
      metodosPago: [],
    });
  }, [actualizarCuentaActiva]);

  return {
    cuentas,
    activeIdx,
    setActiveIdx,
    cuentaActiva,
    actualizarCuentaActiva,
    agregarCuenta,
    cerrarCuenta,
    limpiarCuentaActiva,
  };
}
