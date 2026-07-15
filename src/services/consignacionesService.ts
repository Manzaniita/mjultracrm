import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError, ValidationError } from '../utils/errors';
import {
  validarId,
  validarCantidadPositivaEntera,
  validarNombre,
} from '../utils/validators';
import type {
  ConsignacionRow,
  ConsignacionLineaRow,
  StockConsignadoRow,
  MovimientoStockRow,
  PerfilRow,
  VarianteRow,
  ProductoRow,
  EstadoConsignacion,
  TipoMovimientoStock,
  TipoReferenciaCaja,
} from '../types/database.types';

// ------------------------------------------------------------------
// Tipos de entrada
// ------------------------------------------------------------------

export interface LineaConsignacionForm {
  variante_id: string;
  cantidad: number;
}

export interface CrearConsignacionForm {
  reventa_id: string;
  pedido_reposicion_id?: string | null;
  lineas: LineaConsignacionForm[];
}

export interface DevolucionConsignacionForm {
  reventa_id: string;
  variante_id: string;
  cantidad: number;
  motivo?: string | null;
}

export interface FiltrosConsignacion {
  reventa_id?: string;
  estado?: EstadoConsignacion;
}

export interface FiltrosMovimientoStock {
  variante_id?: string;
  reventa_id?: string;
  tipo?: TipoMovimientoStock;
}

// ------------------------------------------------------------------
// Tipos de salida compuestos
// ------------------------------------------------------------------

export interface ConsignacionConDetalle extends ConsignacionRow {
  perfiles: PerfilRow | null;
  consignacion_lineas: (ConsignacionLineaRow & {
    variantes: (VarianteRow & { productos: ProductoRow | null }) | null;
  })[];
}

export interface StockConsignadoConDetalle extends StockConsignadoRow {
  perfiles: PerfilRow | null;
  variantes: (VarianteRow & { productos: ProductoRow | null }) | null;
}

export type MovimientoStockConVariante = MovimientoStockRow & {
  variantes: (VarianteRow & { productos: ProductoRow | null }) | null;
};

// ------------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------------

async function obtenerUsuarioActual(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Debe haber un usuario autenticado para esta operación.');
  }

  return user.id;
}

function validarLineasConsignacion(
  lineas: CrearConsignacionForm['lineas']
): LineaConsignacionForm[] {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new ValidationError('La consignación debe tener al menos una línea.');
  }

  return lineas.map((linea, index) => {
    const varianteId = validarId(linea.variante_id, `ID de variante (línea ${index + 1})`);
    const cantidad = validarCantidadPositivaEntera(
      linea.cantidad,
      `Cantidad (línea ${index + 1})`
    );
    return { variante_id: varianteId, cantidad };
  });
}

// ------------------------------------------------------------------
// Consignaciones
// ------------------------------------------------------------------

/**
 * Crea una consignación delegando la lógica de stock y movimientos
 * a la función RPC `crear_consignacion` del backend.
 * Retorna el ID de la consignación generada.
 */
export async function crearConsignacion(form: CrearConsignacionForm): Promise<string> {
  const reventaId = validarId(form.reventa_id, 'ID de reventa');
  const pedidoReposicionId = form.pedido_reposicion_id
    ? validarId(form.pedido_reposicion_id, 'ID de pedido de reposición')
    : null;
  const lineas = validarLineasConsignacion(form.lineas);
  const usuarioId = await obtenerUsuarioActual();

  const { data, error } = await supabase.rpc('crear_consignacion', {
    p_reventa_id: reventaId,
    p_pedido_reposicion_id: pedidoReposicionId,
    p_lineas: JSON.stringify(lineas),
    p_usuario_id: usuarioId,
  });

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se pudo crear la consignación.');

  return data as string;
}

/**
 * Lista consignaciones con su reventa y líneas.
 * Admin ve todas; la reventa solo ve las propias por RLS.
 */
export async function listarConsignaciones(
  filtros: FiltrosConsignacion = {}
): Promise<ConsignacionConDetalle[]> {
  let query = supabase
    .from('consignaciones')
    .select(
      '*, perfiles:reventa_id(*), consignacion_lineas(*, variantes:variante_id(*, productos(*)))'
    )
    .order('fecha', { ascending: false });

  if (filtros.reventa_id) {
    query = query.eq('reventa_id', validarId(filtros.reventa_id, 'ID de reventa'));
  }

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado);
  }

  const { data, error } = await query.returns<ConsignacionConDetalle[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Obtiene una consignación por ID incluyendo reventa y líneas.
 */
export async function obtenerConsignacion(id: string): Promise<ConsignacionConDetalle> {
  const idLimpio = validarId(id, 'ID de consignación');

  const { data, error } = await supabase
    .from('consignaciones')
    .select(
      '*, perfiles:reventa_id(*), consignacion_lineas(*, variantes:variante_id(*, productos(*)))'
    )
    .eq('id', idLimpio)
    .single()
    .returns<ConsignacionConDetalle>();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la consignación solicitada.');

  return data;
}

/**
 * Anula una consignación activa guardando el motivo obligatorio.
 */
export async function anularConsignacion(
  id: string,
  motivoAnulacion: string
): Promise<void> {
  const idLimpio = validarId(id, 'ID de consignación');
  const motivo = validarNombre(motivoAnulacion, 'Motivo de anulación');

  const { error } = await supabase
    .from('consignaciones')
    .update({ estado: 'anulada', motivo_anulacion: motivo })
    .eq('id', idLimpio)
    .eq('estado', 'activa');

  if (error) handleSupabaseError(error);
}

/**
 * Registra una devolución de mercadería consignada de una reventa al depósito central.
 * Inserta el movimiento de stock y decrementa el stock consignado.
 */
export async function registrarDevolucion(
  form: DevolucionConsignacionForm
): Promise<void> {
  const reventaId = validarId(form.reventa_id, 'ID de reventa');
  const varianteId = validarId(form.variante_id, 'ID de variante');
  const cantidad = validarCantidadPositivaEntera(form.cantidad, 'Cantidad devuelta');
  const usuarioId = await obtenerUsuarioActual();

  // Verificar que exista stock consignado suficiente.
  const { data: stock, error: stockError } = await supabase
    .from('stock_consignado')
    .select('cantidad')
    .eq('variante_id', varianteId)
    .eq('reventa_id', reventaId)
    .single();

  if (stockError) handleSupabaseError(stockError);
  if (!stock || stock.cantidad < cantidad) {
    throw new CatalogoError('No hay suficiente stock consignado para registrar la devolución.');
  }

  // Registrar movimiento de stock de devolución.
  const movimiento = {
    tipo: 'devolucion_consignacion' as TipoMovimientoStock,
    variante_id: varianteId,
    cantidad,
    reventa_origen_id: reventaId,
    reventa_destino_id: null as string | null,
    referencia_tipo: 'consignacion' as TipoReferenciaCaja,
    motivo: form.motivo ?? null,
    usuario_id: usuarioId,
  };

  const { error: movError } = await supabase.from('movimientos_stock').insert(movimiento);
  if (movError) handleSupabaseError(movError);

  // Actualizar stock consignado.
  const nuevaCantidad = stock.cantidad - cantidad;
  const { error: updateError } = await supabase
    .from('stock_consignado')
    .update({ cantidad: nuevaCantidad })
    .eq('variante_id', varianteId)
    .eq('reventa_id', reventaId);

  if (updateError) handleSupabaseError(updateError);
}

// ------------------------------------------------------------------
// Stock consignado
// ------------------------------------------------------------------

/**
 * Devuelve el stock consignado de todas las reventas con el detalle de cada variante.
 */
export async function listarStockConsignado(): Promise<StockConsignadoConDetalle[]> {
  const { data, error } = await supabase
    .from('stock_consignado')
    .select('*, perfiles:reventa_id(*), variantes:variante_id(*, productos(*))')
    .gt('cantidad', 0)
    .order('cantidad', { ascending: false })
    .returns<StockConsignadoConDetalle[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Devuelve el stock consignado de una reventa específica.
 */
export async function listarStockPorReventa(
  reventaId: string
): Promise<StockConsignadoConDetalle[]> {
  const idLimpio = validarId(reventaId, 'ID de reventa');

  const { data, error } = await supabase
    .from('stock_consignado')
    .select('*, perfiles:reventa_id(*), variantes:variante_id(*, productos(*))')
    .eq('reventa_id', idLimpio)
    .gt('cantidad', 0)
    .order('cantidad', { ascending: false })
    .returns<StockConsignadoConDetalle[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Alias para que la reventa autenticada consulte su propio stock.
 */
export async function obtenerMiStock(): Promise<StockConsignadoConDetalle[]> {
  const usuarioId = await obtenerUsuarioActual();
  return listarStockPorReventa(usuarioId);
}

// ------------------------------------------------------------------
// Movimientos de stock
// ------------------------------------------------------------------

/**
 * Lista movimientos de stock con filtro opcional por variante, reventa o tipo.
 */
export async function listarMovimientosStock(
  filtros: FiltrosMovimientoStock = {}
): Promise<MovimientoStockConVariante[]> {
  let query = supabase
    .from('movimientos_stock')
    .select('*, variantes:variante_id(*, productos(*))')
    .order('created_at', { ascending: false });

  if (filtros.variante_id) {
    query = query.eq('variante_id', validarId(filtros.variante_id, 'ID de variante'));
  }

  if (filtros.reventa_id) {
    const idLimpio = validarId(filtros.reventa_id, 'ID de reventa');
    query = query.or(`reventa_origen_id.eq.${idLimpio},reventa_destino_id.eq.${idLimpio}`);
  }

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  const { data, error } = await query.returns<MovimientoStockConVariante[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}
