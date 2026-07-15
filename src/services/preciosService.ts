import { supabase } from '../lib/supabase';
import { handleSupabaseError, CatalogoError } from '../utils/errors';
import {
  validarMontoPositivo,
  validarId,
} from '../utils/validators';
import type {
  TipoCambioRow,
  ListaPrecioRow,
  VarianteRow,
  PrecioInsert,
} from '../types/database.types';
import type {
  VarianteConPrecios,
  CargarTipoCambioForm,
  OverridePrecioForm,
  EdicionMasivaForm,
} from '../types/precios';

const DECIMALES_PRECIO = 2;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

export function redondearPrecio(valor: number): number {
  return Number(valor.toFixed(DECIMALES_PRECIO));
}

export function calcularPrecioAutomatico(
  costoUsd: number,
  margen: number,
  tipoCambio: number
): number {
  return redondearPrecio(costoUsd * tipoCambio * (1 + margen));
}

// ------------------------------------------------------------------
// Tipo de cambio
// ------------------------------------------------------------------

/**
 * Devuelve el tipo de cambio vigente (último cargado).
 * Si no hay TC cargado, lanza error.
 */
export async function obtenerTipoCambioVigente(): Promise<number> {
  const { data, error } = await supabase
    .from('tipos_cambio')
    .select('valor')
    .order('fecha', { ascending: false })
    .limit(1)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No hay tipo de cambio cargado.');

  return data.valor;
}

/**
 * Carga un nuevo tipo de cambio en el historial.
 * Requiere usuario autenticado (auth.uid).
 */
export async function cargarTipoCambio(
  form: CargarTipoCambioForm
): Promise<TipoCambioRow> {
  const valor = validarMontoPositivo(form.valor, 'Tipo de cambio');
  if (valor <= 0) throw new CatalogoError('El tipo de cambio debe ser mayor a cero.');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Debe haber un usuario autenticado para cargar el tipo de cambio.');
  }

  const { data, error } = await supabase
    .from('tipos_cambio')
    .insert({ valor, usuario_id: user.id })
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se pudo cargar el tipo de cambio.');

  return data;
}

// ------------------------------------------------------------------
// Listas de precios
// ------------------------------------------------------------------

export async function obtenerListasPrecios(): Promise<ListaPrecioRow[]> {
  const { data, error } = await supabase
    .from('listas_precios')
    .select('*')
    .order('nombre');

  if (error) handleSupabaseError(error);
  return data ?? [];
}

// ------------------------------------------------------------------
// Variantes con precios
// ------------------------------------------------------------------

export async function obtenerVariantesConPrecios(
  soloActivas = true
): Promise<VarianteConPrecios[]> {
  let query = supabase
    .from('variantes')
    .select('*, productos(*), precios(*, listas_precios(*))')
    .order('created_at', { ascending: false });

  if (soloActivas) {
    query = query.eq('activo', true);
  }

  const { data, error } = await query.returns<VarianteConPrecios[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

// ------------------------------------------------------------------
// Cálculo de precio aplicado a una variante en una lista
// ------------------------------------------------------------------

export async function obtenerPrecioAplicado(
  variante: VarianteRow,
  lista: ListaPrecioRow,
  tipoCambio?: number
): Promise<{ precio_ars: number; es_manual: boolean }> {
  const tc = tipoCambio ?? (await obtenerTipoCambioVigente());

  const { data: precioGuardado, error } = await supabase
    .from('precios')
    .select('*')
    .eq('variante_id', variante.id)
    .eq('lista_id', lista.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    handleSupabaseError(error);
  }

  if (precioGuardado && precioGuardado.es_manual) {
    return { precio_ars: precioGuardado.precio_ars, es_manual: true };
  }

  return {
    precio_ars: calcularPrecioAutomatico(variante.costo_usd, lista.margen, tc),
    es_manual: false,
  };
}

// ------------------------------------------------------------------
// Override manual
// ------------------------------------------------------------------

export async function aplicarOverrideManual(
  form: OverridePrecioForm
): Promise<void> {
  const varianteId = validarId(form.variante_id, 'ID de variante');
  const listaId = validarId(form.lista_id, 'ID de lista');
  const precioArs = validarMontoPositivo(form.precio_ars, 'Precio en ARS');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Usuario no autenticado.');
  }

  const row: PrecioInsert = {
    variante_id: varianteId,
    lista_id: listaId,
    precio_ars: precioArs,
    es_manual: true,
    fecha: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('precios')
    .upsert(row, { onConflict: 'variante_id, lista_id' });

  if (error) handleSupabaseError(error);
}

/**
 * Libera un precio manual para que vuelva a calcularse automáticamente.
 */
export async function liberarPrecioManual(
  varianteId: string,
  listaId: string
): Promise<void> {
  const vId = validarId(varianteId, 'ID de variante');
  const lId = validarId(listaId, 'ID de lista');

  const [tc, variante, lista] = await Promise.all([
    obtenerTipoCambioVigente(),
    obtenerVariante(vId),
    obtenerLista(lId),
  ]);

  const precioCalculado = calcularPrecioAutomatico(
    variante.costo_usd,
    lista.margen,
    tc
  );

  const row: PrecioInsert = {
    variante_id: vId,
    lista_id: lId,
    precio_ars: precioCalculado,
    es_manual: false,
    fecha: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('precios')
    .upsert(row, { onConflict: 'variante_id, lista_id' });

  if (error) handleSupabaseError(error);
}

// ------------------------------------------------------------------
// Recálculo masivo automático
// ------------------------------------------------------------------

/**
 * Recalcula todos los precios automáticos (no manuales) con el TC vigente.
 * Los precios manuales se respetan y no se modifican.
 */
export async function recalcularPreciosAutomaticos(): Promise<number> {
  const [tc, listas, variantes] = await Promise.all([
    obtenerTipoCambioVigente(),
    obtenerListasPrecios(),
    obtenerVariantesConPrecios(false),
  ]);

  const manuales = new Set<string>();
  for (const variante of variantes) {
    for (const precio of variante.precios) {
      if (precio.es_manual) {
        manuales.add(`${variante.id}|${precio.lista_id}`);
      }
    }
  }

  let actualizados = 0;

  for (const lista of listas) {
    const filas: PrecioInsert[] = [];

    for (const variante of variantes) {
      const clave = `${variante.id}|${lista.id}`;
      if (manuales.has(clave)) continue;

      filas.push({
        variante_id: variante.id,
        lista_id: lista.id,
        precio_ars: calcularPrecioAutomatico(variante.costo_usd, lista.margen, tc),
        es_manual: false,
        fecha: new Date().toISOString(),
      });
      actualizados++;
    }

    if (filas.length > 0) {
      const { error } = await supabase
        .from('precios')
        .upsert(filas, { onConflict: 'variante_id, lista_id' });
      if (error) handleSupabaseError(error);
    }
  }

  return actualizados;
}

// ------------------------------------------------------------------
// Edición masiva: aplicar precio X a variantes con costo Y
// ------------------------------------------------------------------

export async function edicionMasivaPorCosto(
  form: EdicionMasivaForm
): Promise<number> {
  const listaId = validarId(form.lista_id, 'ID de lista');
  const costoUsd = validarMontoPositivo(form.costo_usd, 'Costo en USD');
  const precioArs = validarMontoPositivo(form.precio_ars, 'Precio en ARS');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Usuario no autenticado.');
  }

  const { data: variantes, error } = await supabase
    .from('variantes')
    .select('id')
    .eq('costo_usd', costoUsd);

  if (error) handleSupabaseError(error);

  const ids = variantes?.map((v) => v.id) ?? [];
  if (ids.length === 0) return 0;

  const filas: PrecioInsert[] = ids.map((varianteId) => ({
    variante_id: varianteId,
    lista_id: listaId,
    precio_ars: precioArs,
    es_manual: true,
    fecha: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('precios')
    .upsert(filas, { onConflict: 'variante_id, lista_id' });

  if (upsertError) handleSupabaseError(upsertError);

  return ids.length;
}

// ------------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------------

async function obtenerVariante(id: string): Promise<VarianteRow> {
  const { data, error } = await supabase
    .from('variantes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la variante.');
  return data;
}

async function obtenerLista(id: string): Promise<ListaPrecioRow> {
  const { data, error } = await supabase
    .from('listas_precios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la lista de precios.');
  return data;
}
