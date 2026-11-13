import { supabase } from '../lib/supabase';
import { getEmpresaConfig, saveEmpresaConfig } from '../utils/constants';

export const SUPERADMIN_EMAIL = 'titinarrieche@gmail.com';

const AVISO_TAG_REGEX = /<!--SYS_AVISO:({.*?})-->/s;

export const DEFAULT_AVISO_CONFIG = {
  activo: true,
  fecha: '2026-11-15T23:59:59',
  mensaje: 'Se aproxima la fecha de pago del servicio (15 de Noviembre).',
};

/**
 * Extrae la configuración del aviso desde la cadena slogan
 */
export function extraerAvisoConfig(sloganRaw) {
  if (!sloganRaw || typeof sloganRaw !== 'string') return DEFAULT_AVISO_CONFIG;
  const match = sloganRaw.match(AVISO_TAG_REGEX);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      return { ...DEFAULT_AVISO_CONFIG, ...parsed };
    } catch (e) {
      console.error('Error parseando config de aviso:', e);
    }
  }
  return DEFAULT_AVISO_CONFIG;
}

/**
 * Limpia el slogan para que nunca muestre el tag secreto en recibos o inputs
 */
export function limpiarSlogan(sloganRaw) {
  if (!sloganRaw || typeof sloganRaw !== 'string') return '';
  return sloganRaw.replace(AVISO_TAG_REGEX, '').trim();
}

/**
 * Genera el slogan empaquetado con la metadata del aviso
 */
export function empaquetarSlogan(sloganLimpio, avisoConfig) {
  const base = limpiarSlogan(sloganLimpio) || '¡Gracias por su compra!';
  const payload = JSON.stringify(avisoConfig);
  return `${base}<!--SYS_AVISO:${payload}-->`;
}

/**
 * Obtiene la configuración de aviso actual desde Supabase o localStorage
 */
export async function getAvisoConfig() {
  try {
    const { data, error } = await supabase
      .from('configuracion_empresa')
      .select('slogan')
      .eq('id', 'default')
      .maybeSingle();

    if (data && !error && data.slogan) {
      return extraerAvisoConfig(data.slogan);
    }
  } catch (err) {
    console.error('Error al obtener aviso de pago:', err);
  }

  const localCfg = getEmpresaConfig();
  return extraerAvisoConfig(localCfg?.slogan);
}

/**
 * Guarda la nueva configuración del aviso (Solo SuperAdmin)
 */
export async function saveAvisoConfig(nuevoAviso) {
  try {
    // 1. Obtener slogan actual de la base de datos
    const { data } = await supabase
      .from('configuracion_empresa')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const sloganActualLimpio = limpiarSlogan(data?.slogan || '¡Gracias por su compra!');
    const sloganEmpaquetado = empaquetarSlogan(sloganActualLimpio, nuevoAviso);

    const payload = {
      ...(data || {}),
      slogan: sloganEmpaquetado,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('configuracion_empresa')
      .upsert(payload);

    if (error) throw error;

    // Actualizar cache local
    const cfgLocal = getEmpresaConfig();
    saveEmpresaConfig({
      ...cfgLocal,
      slogan: sloganEmpaquetado,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dj7_aviso_pago_updated', { detail: nuevoAviso }));
    }

    return true;
  } catch (err) {
    console.error('Error guardando aviso de cobro:', err);
    throw err;
  }
}
