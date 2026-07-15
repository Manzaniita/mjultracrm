import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError, ValidationError } from '../utils/errors';
import {
  validarId,
  validarCantidadPositivaEntera,
  validarMontoPositivo,
  validarNombre,
} from '../utils/validators';
import {
  obtenerTipoCambioVigente,
  obtenerPrecioAplicado,
  redondearPrecio,
} from './preciosService';
import { crearPago } from './pagosService';
export { crearPago as registrarPago };
import type {
  VentaRow,
  VentaLineaInsert,
  VentaInsert,
  VentaLineaRow,
  PagoRow,
  PerfilRow,
  VarianteRow,
  ProductoRow,
  ListaPrecioRow,
  EstadoCobro,
} from '../types/database.types';
import type { SimularVentaForm, VentaSimulacion } from '../types/precios';

// ------------------------------------------------------------------
// Tipos de entrada
// ------------------------------------------------------------------

export interface VentaLineaForm {
  variante_id: string;
  cantidad: number;
  /** Precio manual para ventas admin; si no se indica se calcula según la lista. */
  precio_unit_ars?: number;
  /** Indica si el precio fue forzado manualmente por el admin. */
  precio_manual?: boolean;
}

export interface RegistrarVentaAdminForm {
  lista_id: string;
  lineas: VentaLineaForm[];
  /** Si es una venta registrada por cuenta de una reventa. */
  reventa_id?: string | null;
}

export interface RegistrarVentaReventaForm {
  variante_id: string;
  cantidad: number;
  /** Lista a aplicar. Si no se indica se usa la lista "Reventa". */
  lista_id?: string;
  /** Método de pago si la reventa abona en el momento. */
  metodo_pago?: 'efectivo' | 'transferencia';
  /** Monto abonado en el momento. Si no se indica, la venta queda como deuda. */
  monto_pagado_ars?: number;
}

export interface FiltrosVenta {
  reventa_id?: string;
  estado_cobro?: EstadoCobro;
  anulada?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
}

// ------------------------------------------------------------------
// Tipos de salida compuestos
// ------------------------------------------------------------------

export type VentaConDetalle = VentaRow & {
  reventa: PerfilRow | null;
  /** Alias de `reventa` para compatibilidad con la UI existente. */
  perfiles: PerfilRow | null;
  usuario: PerfilRow | null;
  lineas: (VentaLineaRow & {
    variante: (VarianteRow & { productos: ProductoRow | null }) | null;
  })[];
  pagos: PagoRow[];
};

/** Resumen de deuda de la reventa autenticada. */
export interface DetalleDeudaReventa {
  reventa: PerfilRow;
  total_ars: number;
  pagado_ars: number;
  deuda_ars: number;
  ventas: (VentaRow & { pagos: PagoRow[]; deuda: number })[];
}

// ------------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------------

async function obtenerUsuarioActual(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Debe haber un usuario autenticado para registrar la venta.');
  }

  return user.id;
}

async function obtenerPerfilRolActual(): Promise<{ id: string; rol: 'admin' | 'reventa' }> {
  const usuarioId = await obtenerUsuarioActual();

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, rol')
    .eq('id', usuarioId)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el perfil del usuario autenticado.');

  return data as { id: string; rol: 'admin' | 'reventa' };
}

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

async function obtenerListaReventa(): Promise<ListaPrecioRow> {
  const { data, error } = await supabase
    .from('listas_precios')
    .select('*')
    .eq('nombre', 'Reventa')
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la lista de precios "Reventa".');
  return data;
}

async function obtenerVentaConDetalle(id: string): Promise<VentaConDetalle> {
  const { data, error } = await supabase
    .from('ventas')
    .select(
      '*, reventa:reventa_id(*), perfiles:reventa_id(*), usuario:usuario_id(*), lineas:venta_lineas(*, variante:variante_id(*, productos(*))), pagos(*)'
    )
    .eq('id', id)
    .single()
    .returns<VentaConDetalle>();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la venta solicitada.');

  return data;
}

function validarLineasVenta(lineas: VentaLineaForm[]): VentaLineaForm[] {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new ValidationError('La venta debe tener al menos una línea.');
  }

  return lineas.map((linea, index) => {
    const varianteId = validarId(linea.variante_id, `ID de variante (línea ${index + 1})`);
    const cantidad = validarCantidadPositivaEntera(
      linea.cantidad,
      `Cantidad (línea ${index + 1})`
    );

    let precioUnitArs: number | undefined;
    let precioManual = false;

    if (linea.precio_unit_ars !== undefined) {
      precioUnitArs = validarMontoPositivo(
        linea.precio_unit_ars,
        `Precio unitario (línea ${index + 1})`
      );
      precioManual = linea.precio_manual ?? true;
    }

    return { variante_id: varianteId, cantidad, precio_unit_ars: precioUnitArs, precio_manual: precioManual };
  });
}

async function verificarStockConsignado(
  reventaId: string,
  lineas: { variante_id: string; cantidad: number }[]
): Promise<void> {
  for (const linea of lineas) {
    const { data, error } = await supabase
      .from('stock_consignado')
      .select('cantidad')
      .eq('variante_id', linea.variante_id)
      .eq('reventa_id', reventaId)
      .single();

    if (error) handleSupabaseError(error);

    if (!data || data.cantidad < linea.cantidad) {
      throw new CatalogoError(
        `No hay suficiente stock consignado de la variante ${linea.variante_id} para registrar la venta.`
      );
    }
  }
}

async function verificarStockCentral(
  lineas: { variante_id: string; cantidad: number }[]
): Promise<void> {
  for (const linea of lineas) {
    const { data, error } = await supabase
      .from('variantes')
      .select('stock_central')
      .eq('id', linea.variante_id)
      .single();

    if (error) handleSupabaseError(error);

    if (!data || data.stock_central < linea.cantidad) {
      throw new CatalogoError(
        `No hay suficiente stock central de la variante ${linea.variante_id} para registrar la venta.`
      );
    }
  }
}

async function insertarVentaYLineas(
  ventaInsert: VentaInsert,
  lineas: (VentaLineaInsert & { total_linea_ars?: number })[]
): Promise<VentaRow> {
  const { data: venta, error: ventaError } = await supabase
    .from('ventas')
    .insert(ventaInsert)
    .select()
    .single();

  if (ventaError) handleSupabaseError(ventaError);
  if (!venta) throw new CatalogoError('No se pudo registrar la venta.');

  const lineasInsert: VentaLineaInsert[] = lineas.map((linea) => ({
    venta_id: venta.id,
    variante_id: linea.variante_id,
    cantidad: linea.cantidad,
    precio_unit_ars: linea.precio_unit_ars,
    precio_manual: linea.precio_manual,
  }));

  const { error: lineasError } = await supabase.from('venta_lineas').insert(lineasInsert);

  if (lineasError) {
    // Rollback manual de la cabecera si fallan las líneas.
    await supabase.from('ventas').delete().eq('id', venta.id);
    handleSupabaseError(lineasError);
  }

  // Registrar movimientos de stock tipo 'venta' y descontar stock (central o consignado).
  const movimientosInsert = lineasInsert.map((linea) => ({
    tipo: 'venta' as const,
    variante_id: linea.variante_id,
    cantidad: linea.cantidad,
    reventa_origen_id: venta.reventa_id,
    referencia_tipo: 'venta' as const,
    referencia_id: venta.id,
    usuario_id: venta.usuario_id,
  }));

  const { error: movError } = await supabase
    .from('movimientos_stock')
    .insert(movimientosInsert);

  if (movError) {
    // Rollback: eliminar líneas y cabecera. El trigger de stock ya descontó,
    // pero al eliminar movimientos se revierte automáticamente si el trigger
    // de delete está implementado. Como no implementamos delete revert, evitamos
    // llegar aquí validando previamente.
    await supabase.from('venta_lineas').delete().eq('venta_id', venta.id);
    await supabase.from('ventas').delete().eq('id', venta.id);
    handleSupabaseError(movError);
  }

  return venta;
}

// ------------------------------------------------------------------
// Simulación
// ------------------------------------------------------------------

/**
 * Simula una venta calculando el snapshot inmutable ARS / USD.
 * No guarda nada en la base de datos.
 */
export async function simularVenta(
  form: SimularVentaForm
): Promise<VentaSimulacion> {
  const varianteId = validarId(form.variante_id, 'ID de variante');
  const listaId = validarId(form.lista_id, 'ID de lista');
  const cantidad = validarCantidadPositivaEntera(form.cantidad, 'Cantidad');

  const [variante, lista, tc] = await Promise.all([
    obtenerVariante(varianteId),
    obtenerLista(listaId),
    obtenerTipoCambioVigente(),
  ]);

  const { precio_ars: precioUnitArs, es_manual: precioManual } =
    await obtenerPrecioAplicado(variante, lista, tc);

  const totalArs = redondearPrecio(precioUnitArs * cantidad);
  const totalUsd = redondearPrecio(totalArs / tc);

  return {
    variante,
    lista,
    cantidad,
    precio_unit_ars: precioUnitArs,
    precio_manual: precioManual,
    total_ars: totalArs,
    tc_usado: tc,
    total_usd: totalUsd,
  };
}

// ------------------------------------------------------------------
// Registro de ventas
// ------------------------------------------------------------------

/**
 * Registra una venta directa del admin con el snapshot USD congelado.
 * Permite múltiples líneas, elegir lista y forzar precios manuales.
 */
export async function registrarVentaAdmin(
  form: RegistrarVentaAdminForm
): Promise<VentaRow> {
  const perfil = await obtenerPerfilRolActual();
  if (perfil.rol !== 'admin') {
    throw new CatalogoError('Solo el admin puede registrar ventas administrativas.');
  }

  const listaId = validarId(form.lista_id, 'ID de lista');
  const reventaId = form.reventa_id ? validarId(form.reventa_id, 'ID de reventa') : null;
  const lineasForm = validarLineasVenta(form.lineas);

  // Validar stock según el origen de la venta.
  const lineasStock = lineasForm.map((l) => ({
    variante_id: l.variante_id,
    cantidad: l.cantidad,
  }));
  if (reventaId) {
    await verificarStockConsignado(reventaId, lineasStock);
  } else {
    await verificarStockCentral(lineasStock);
  }

  const [lista, tc] = await Promise.all([obtenerLista(listaId), obtenerTipoCambioVigente()]);

  let totalArs = 0;
  const lineasInsert: (VentaLineaInsert & { total_linea_ars?: number })[] = [];

  for (const linea of lineasForm) {
    const variante = await obtenerVariante(linea.variante_id);
    let precioUnitArs: number;
    let precioManual: boolean;

    if (linea.precio_unit_ars !== undefined) {
      precioUnitArs = linea.precio_unit_ars;
      precioManual = linea.precio_manual ?? true;
    } else {
      const precio = await obtenerPrecioAplicado(variante, lista, tc);
      precioUnitArs = precio.precio_ars;
      precioManual = precio.es_manual;
    }

    const totalLinea = redondearPrecio(precioUnitArs * linea.cantidad);
    totalArs = redondearPrecio(totalArs + totalLinea);

    lineasInsert.push({
      venta_id: '', // se completa en insertarVentaYLineas
      variante_id: linea.variante_id,
      cantidad: linea.cantidad,
      precio_unit_ars: precioUnitArs,
      precio_manual: precioManual,
      total_linea_ars: totalLinea,
    });
  }

  const totalUsd = redondearPrecio(totalArs / tc);

  const ventaInsert: VentaInsert = {
    usuario_id: perfil.id,
    reventa_id: reventaId,
    lista_id: lista.id,
    total_ars: totalArs,
    tc_usado: tc,
    total_usd: totalUsd,
    estado_cobro: 'pendiente',
    anulada: false,
  };

  return insertarVentaYLineas(ventaInsert, lineasInsert);
}

/**
 * Registra una venta de una reventa desde su propio stock consignado.
 * Usa la lista "Reventa" por defecto, a menos que el form indique otra.
 * Si se indica método y monto pagado, registra el pago automáticamente.
 */
export async function registrarVentaReventa(
  form: RegistrarVentaReventaForm
): Promise<VentaRow> {
  const perfil = await obtenerPerfilRolActual();
  if (perfil.rol !== 'reventa') {
    throw new CatalogoError('Solo una reventa puede registrar sus propias ventas.');
  }

  const varianteId = validarId(form.variante_id, 'ID de variante');
  const cantidad = validarCantidadPositivaEntera(form.cantidad, 'Cantidad');
  await verificarStockConsignado(perfil.id, [{ variante_id: varianteId, cantidad }]);

  const listaPromise = form.lista_id
    ? obtenerLista(validarId(form.lista_id, 'ID de lista'))
    : obtenerListaReventa();

  const [lista, tc] = await Promise.all([listaPromise, obtenerTipoCambioVigente()]);

  const variante = await obtenerVariante(varianteId);
  const { precio_ars: precioUnitArs, es_manual: precioManual } = await obtenerPrecioAplicado(
    variante,
    lista,
    tc
  );

  const totalArs = redondearPrecio(precioUnitArs * cantidad);
  const totalUsd = redondearPrecio(totalArs / tc);

  const ventaInsert: VentaInsert = {
    usuario_id: perfil.id,
    reventa_id: perfil.id,
    lista_id: lista.id,
    total_ars: totalArs,
    tc_usado: tc,
    total_usd: totalUsd,
    estado_cobro: 'pendiente',
    anulada: false,
  };

  const lineasInsert: (VentaLineaInsert & { total_linea_ars?: number })[] = [
    {
      venta_id: '',
      variante_id: varianteId,
      cantidad,
      precio_unit_ars: precioUnitArs,
      precio_manual: precioManual,
      total_linea_ars: totalArs,
    },
  ];

  const venta = await insertarVentaYLineas(ventaInsert, lineasInsert);

  // Registrar pago inmediato si la reventa abona en el momento.
  if (form.metodo_pago && form.monto_pagado_ars && form.monto_pagado_ars > 0) {
    await crearPago({
      venta_id: venta.id,
      monto_ars: form.monto_pagado_ars,
      metodo: form.metodo_pago,
    });
  }

  return venta;
}

/**
 * Registra una venta directa del admin de una sola línea.
 * Mantiene la firma original para compatibilidad.
 */
export async function registrarVentaDirecta(
  form: SimularVentaForm
): Promise<VentaRow> {
  return registrarVentaAdmin({
    lista_id: form.lista_id,
    lineas: [{ variante_id: form.variante_id, cantidad: form.cantidad }],
  });
}

/**
 * Devuelve el resumen de deuda de la reventa autenticada.
 */
export async function obtenerMiDeuda(): Promise<DetalleDeudaReventa> {
  const perfil = await obtenerPerfilRolActual();
  if (perfil.rol !== 'reventa') {
    throw new CatalogoError('Solo las reventas pueden consultar su deuda.');
  }

  const { data: perfilCompleto, error: perfilError } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', perfil.id)
    .single();

  if (perfilError) handleSupabaseError(perfilError);
  if (!perfilCompleto) throw new CatalogoError('No se encontró el perfil de la reventa.');

  const { data, error } = await supabase
    .from('ventas')
    .select('*, pagos(*)')
    .eq('reventa_id', perfil.id)
    .eq('anulada', false)
    .order('fecha', { ascending: false })
    .returns<(VentaRow & { pagos: PagoRow[] })[]>();

  if (error) handleSupabaseError(error);

  const ventas = (data ?? []).map((venta) => {
    const pagado = venta.pagos.reduce((suma, pago) => suma + pago.monto_ars, 0);
    return { ...venta, deuda: Math.max(0, venta.total_ars - pagado) };
  });

  const totalArs = ventas.reduce((suma, v) => suma + v.total_ars, 0);
  const pagadoArs = ventas.reduce((suma, v) => suma + v.total_ars - v.deuda, 0);
  const deudaArs = totalArs - pagadoArs;

  return {
    reventa: perfilCompleto,
    total_ars: totalArs,
    pagado_ars: pagadoArs,
    deuda_ars: deudaArs,
    ventas,
  };
}

// ------------------------------------------------------------------
// Listado y consulta
// ------------------------------------------------------------------

/**
 * Lista ventas con filtros.
 * Admin ve todas; reventa solo ve las propias por RLS.
 */
export async function listarVentas(
  filtros: FiltrosVenta = {}
): Promise<VentaConDetalle[]> {
  let query = supabase
    .from('ventas')
    .select(
      '*, reventa:reventa_id(*), perfiles:reventa_id(*), usuario:usuario_id(*), lineas:venta_lineas(*, variante:variante_id(*, productos(*))), pagos(*)'
    )
    .order('fecha', { ascending: false });

  if (filtros.reventa_id) {
    query = query.eq('reventa_id', validarId(filtros.reventa_id, 'ID de reventa'));
  }

  if (filtros.estado_cobro) {
    query = query.eq('estado_cobro', filtros.estado_cobro);
  }

  if (typeof filtros.anulada === 'boolean') {
    query = query.eq('anulada', filtros.anulada);
  }

  if (filtros.fecha_desde) {
    query = query.gte('fecha', filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    query = query.lte('fecha', filtros.fecha_hasta);
  }

  const { data, error } = await query.returns<VentaConDetalle[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Obtiene una venta con sus líneas y pagos.
 */
export async function obtenerVenta(id: string): Promise<VentaConDetalle> {
  const idLimpio = validarId(id, 'ID de venta');
  return obtenerVentaConDetalle(idLimpio);
}

// ------------------------------------------------------------------
// Anulación
// ------------------------------------------------------------------

/**
 * Anula una venta delegando la reversión de stock, caja y pagos
 * a la función RPC `anular_venta`.
 */
export async function anularVenta(id: string, motivo: string): Promise<void> {
  const idLimpio = validarId(id, 'ID de venta');
  const motivoLimpio = validarNombre(motivo, 'Motivo de anulación');
  const usuarioId = await obtenerUsuarioActual();

  const { error } = await supabase.rpc('anular_venta', {
    p_venta_id: idLimpio,
    p_motivo: motivoLimpio,
    p_usuario_id: usuarioId,
  });

  if (error) handleSupabaseError(error);
}
