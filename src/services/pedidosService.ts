import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError, ValidationError } from '../utils/errors';
import {
  validarId,
  validarCantidadPositivaEntera,
  validarNombre,
} from '../utils/validators';
import type {
  PedidoReposicionRow,
  PedidoReposicionLineaRow,
  PerfilRow,
  VarianteRow,
  ProductoRow,
  EstadoPedidoReposicion,
} from '../types/database.types';

// ------------------------------------------------------------------
// Tipos de entrada
// ------------------------------------------------------------------

export interface LineaPedidoForm {
  variante_id: string;
  cantidad_solicitada: number;
}

export interface CrearPedidoForm {
  /** Si no se indica, el pedido se crea para el usuario autenticado (reventa). */
  reventa_id?: string;
  lineas: LineaPedidoForm[];
}

export interface AprobarPedidoForm {
  lineas: { linea_id: string; cantidad_aprobada: number }[];
}

export interface FiltrosPedido {
  reventa_id?: string;
  estado?: EstadoPedidoReposicion;
}

// ------------------------------------------------------------------
// Tipos de salida compuestos
// ------------------------------------------------------------------

export interface PedidoConDetalle extends PedidoReposicionRow {
  perfiles: PerfilRow | null;
  pedido_reposicion_lineas: (PedidoReposicionLineaRow & {
    variantes: (VarianteRow & { productos: ProductoRow | null }) | null;
  })[];
}

// ------------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------------

async function obtenerUsuarioActual(): Promise<{ id: string; rol: 'admin' | 'reventa' }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Debe haber un usuario autenticado para esta operación.');
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, rol')
    .eq('id', user.id)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el perfil del usuario autenticado.');

  return data as { id: string; rol: 'admin' | 'reventa' };
}

function validarLineasPedido(lineas: LineaPedidoForm[]): LineaPedidoForm[] {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new ValidationError('El pedido debe tener al menos una línea.');
  }

  return lineas.map((linea, index) => {
    const varianteId = validarId(linea.variante_id, `ID de variante (línea ${index + 1})`);
    const cantidad = validarCantidadPositivaEntera(
      linea.cantidad_solicitada,
      `Cantidad solicitada (línea ${index + 1})`
    );
    return { variante_id: varianteId, cantidad_solicitada: cantidad };
  });
}

// ------------------------------------------------------------------
// Pedidos de reposición
// ------------------------------------------------------------------

/**
 * Lista todos los pedidos de reposición (admin) o los propios (reventa).
 */
export async function listarPedidosReposicion(
  filtros: FiltrosPedido = {}
): Promise<PedidoConDetalle[]> {
  const perfil = await obtenerUsuarioActual();

  let query = supabase
    .from('pedidos_reposicion')
    .select(
      '*, perfiles:reventa_id(*), pedido_reposicion_lineas(*, variantes:variante_id(*, productos(*)))'
    )
    .order('created_at', { ascending: false });

  if (perfil.rol === 'reventa') {
    query = query.eq('reventa_id', perfil.id);
  } else if (filtros.reventa_id) {
    query = query.eq('reventa_id', validarId(filtros.reventa_id, 'ID de reventa'));
  }

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado);
  }

  const { data, error } = await query.returns<PedidoConDetalle[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Lista los pedidos de reposición de la reventa autenticada.
 */
export async function listarMisPedidosReposicion(): Promise<PedidoConDetalle[]> {
  const perfil = await obtenerUsuarioActual();
  if (perfil.rol !== 'reventa') {
    throw new CatalogoError('Solo las reventas pueden consultar sus propios pedidos.');
  }
  return listarPedidosReposicion({ reventa_id: perfil.id });
}

/**
 * Obtiene un pedido de reposición con sus líneas.
 */
export async function obtenerPedido(id: string): Promise<PedidoConDetalle> {
  const idLimpio = validarId(id, 'ID de pedido de reposición');

  const { data, error } = await supabase
    .from('pedidos_reposicion')
    .select(
      '*, perfiles:reventa_id(*), pedido_reposicion_lineas(*, variantes:variante_id(*, productos(*)))'
    )
    .eq('id', idLimpio)
    .single()
    .returns<PedidoConDetalle>();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el pedido de reposición.');

  return data;
}

/**
 * Crea un pedido de reposición en estado `pendiente` con sus líneas.
 * La reventa solo puede crear pedidos para sí misma; el admin puede crear para cualquiera.
 */
export async function crearPedidoReposicion(
  form: CrearPedidoForm
): Promise<PedidoReposicionRow> {
  const perfil = await obtenerUsuarioActual();
  const lineas = validarLineasPedido(form.lineas);

  let reventaId: string;
  if (form.reventa_id) {
    reventaId = validarId(form.reventa_id, 'ID de reventa');
    if (perfil.rol === 'reventa' && reventaId !== perfil.id) {
      throw new CatalogoError('No podés crear pedidos para otra reventa.');
    }
  } else {
    if (perfil.rol !== 'reventa') {
      throw new CatalogoError('El admin debe indicar la reventa para la que crea el pedido.');
    }
    reventaId = perfil.id;
  }

  const { data: pedido, error } = await supabase
    .from('pedidos_reposicion')
    .insert({
      reventa_id: reventaId,
      usuario_id: perfil.id,
      estado: 'pendiente',
    })
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!pedido) throw new CatalogoError('No se pudo crear el pedido de reposición.');

  const lineasInsert = lineas.map((linea) => ({
    pedido_id: pedido.id,
    variante_id: linea.variante_id,
    cantidad_solicitada: linea.cantidad_solicitada,
    cantidad_aprobada: null as number | null,
  }));

  const { error: lineasError } = await supabase
    .from('pedido_reposicion_lineas')
    .insert(lineasInsert);

  if (lineasError) {
    // Rollback manual: eliminar el pedido cabecera si fallan las líneas.
    await supabase.from('pedidos_reposicion').delete().eq('id', pedido.id);
    handleSupabaseError(lineasError);
  }

  return pedido;
}

/**
 * Aprueba un pedido de reposición delegando la creación de la consignación
 * y el movimiento de stock a la función RPC `aprobar_pedido_reposicion`.
 * Retorna el ID de la consignación generada.
 */
export async function aprobarPedidoReposicion(
  pedidoId: string,
  form: AprobarPedidoForm
): Promise<string> {
  const idLimpio = validarId(pedidoId, 'ID de pedido de reposición');
  const usuarioId = (await obtenerUsuarioActual()).id;

  if (!Array.isArray(form.lineas) || form.lineas.length === 0) {
    throw new ValidationError('Debe indicar al menos una línea con cantidad aprobada.');
  }

  const lineasAprobadas = form.lineas.map((linea, index) => {
    const lineaId = validarId(linea.linea_id, `ID de línea ${index + 1}`);
    const cantidad = validarCantidadPositivaEntera(
      linea.cantidad_aprobada,
      `Cantidad aprobada (línea ${index + 1})`
    );
    return { id: lineaId, cantidad_aprobada: cantidad };
  });

  // Persistir las cantidades aprobadas antes de delegar a la RPC.
  for (const linea of lineasAprobadas) {
    const { error: updateLineaError } = await supabase
      .from('pedido_reposicion_lineas')
      .update({ cantidad_aprobada: linea.cantidad_aprobada })
      .eq('id', linea.id);

    if (updateLineaError) handleSupabaseError(updateLineaError);
  }

  const { data, error } = await supabase.rpc('aprobar_pedido_reposicion', {
    p_pedido_id: idLimpio,
    p_usuario_id: usuarioId,
  });

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se pudo aprobar el pedido de reposición.');

  return data as string;
}

/**
 * Rechaza un pedido de reposición guardando el motivo obligatorio.
 */
export async function rechazarPedidoReposicion(
  pedidoId: string,
  motivo: string
): Promise<void> {
  const idLimpio = validarId(pedidoId, 'ID de pedido de reposición');
  const motivoLimpio = validarNombre(motivo, 'Motivo de rechazo');

  const { error } = await supabase
    .from('pedidos_reposicion')
    .update({ estado: 'rechazado', motivo_rechazo: motivoLimpio })
    .eq('id', idLimpio)
    .eq('estado', 'pendiente');

  if (error) handleSupabaseError(error);
}
