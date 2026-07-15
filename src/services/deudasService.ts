import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError } from '../utils/errors';
import { validarId } from '../utils/validators';
import type { VentaRow, PagoRow, PerfilRow } from '../types/database.types';

// ------------------------------------------------------------------
// Tipos de salida
// ------------------------------------------------------------------

export interface DeudaPorVenta {
  venta: VentaRow;
  total_ars: number;
  total_pagado: number;
  deuda: number;
  pagos: PagoRow[];
}

export interface DeudaPorReventa {
  reventa: PerfilRow;
  deuda_total: number;
  ventas: DeudaPorVenta[];
}

/** Vista resumida de un deudor para el dashboard. */
export interface RankingDeudor {
  reventa: PerfilRow;
  deuda_ars: number;
  total_usd: number;
  cantidad_ventas: number;
}

export interface ResumenDeuda {
  reventa_id: string | null;
  deuda_total: number;
}

// ------------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------------

async function obtenerPerfilRolActual(): Promise<{ id: string; rol: 'admin' | 'reventa' }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Debe haber un usuario autenticado para consultar deudas.');
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

function calcularDeudaVenta(venta: VentaRow, pagos: PagoRow[]): DeudaPorVenta {
  const totalPagado = pagos.reduce((suma, pago) => suma + pago.monto_ars, 0);
  return {
    venta,
    total_ars: venta.total_ars,
    total_pagado: totalPagado,
    deuda: Math.max(0, venta.total_ars - totalPagado),
    pagos,
  };
}

type VentaConPagos = VentaRow & { pagos: PagoRow[] };

async function obtenerVentasConPagos(reventaId?: string): Promise<VentaConPagos[]> {
  const perfil = await obtenerPerfilRolActual();

  if (perfil.rol === 'reventa' && reventaId && reventaId !== perfil.id) {
    throw new CatalogoError('No podés consultar la deuda de otra reventa.');
  }

  let ventasQuery = supabase
    .from('ventas')
    .select('*, pagos(*)')
    .eq('anulada', false)
    .order('fecha', { ascending: false });

  if (perfil.rol === 'reventa') {
    ventasQuery = ventasQuery.eq('reventa_id', perfil.id);
  } else if (reventaId) {
    ventasQuery = ventasQuery.eq('reventa_id', validarId(reventaId, 'ID de reventa'));
  }

  const { data, error } = await ventasQuery.returns<VentaConPagos[]>();

  if (error) handleSupabaseError(error);
  return data ?? [];
}

async function obtenerDeudasInterno(
  reventaId?: string
): Promise<Map<string, DeudaPorReventa>> {
  const ventasConPagos = await obtenerVentasConPagos(reventaId);
  const mapa = new Map<string, DeudaPorReventa>();

  for (const fila of ventasConPagos) {
    const idReventa = fila.reventa_id ?? 'sin_reventa';

    if (!mapa.has(idReventa)) {
      let reventa: PerfilRow | null = null;
      if (idReventa !== 'sin_reventa') {
        const { data } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', idReventa)
          .maybeSingle();
        reventa = data ?? null;
      }

      mapa.set(idReventa, {
        reventa: reventa ?? ({
          id: idReventa,
          nombre: 'Venta directa',
          email: '',
          rol: 'reventa',
          activo: true,
          telefono: null,
          direccion: null,
          created_at: '',
          updated_at: '',
        } as PerfilRow),
        deuda_total: 0,
        ventas: [],
      });
    }

    const grupo = mapa.get(idReventa)!;
    const deudaVenta = calcularDeudaVenta(fila, fila.pagos);

    grupo.ventas.push(deudaVenta);
    grupo.deuda_total += deudaVenta.deuda;
  }

  return mapa;
}

// ------------------------------------------------------------------
// Deudas
// ------------------------------------------------------------------

/**
 * Calcula la deuda total de una reventa (o de todas las visibles).
 * Admin puede pasar un ID; la reventa solo consulta la propia.
 */
export async function calcularDeudaTotalPorReventa(
  reventaId?: string
): Promise<ResumenDeuda> {
  const perfil = await obtenerPerfilRolActual();
  const idConsulta = perfil.rol === 'reventa' ? perfil.id : reventaId ?? null;
  const ventasConPagos = await obtenerVentasConPagos(reventaId);

  const deudaTotal = ventasConPagos.reduce((total, venta) => {
    const pagado = venta.pagos.reduce((suma, pago) => suma + pago.monto_ars, 0);
    return total + Math.max(0, venta.total_ars - pagado);
  }, 0);

  return {
    reventa_id: idConsulta,
    deuda_total: deudaTotal,
  };
}

/**
 * Devuelve el ranking de deudores ordenado de mayor a menor deuda.
 * Cada entrada resume la deuda ARS, el total USD congelado y la cantidad de ventas.
 */
export async function obtenerRankingDeudores(): Promise<RankingDeudor[]> {
  const mapa = await obtenerDeudasInterno();

  return Array.from(mapa.values())
    .map((grupo) => ({
      reventa: grupo.reventa,
      deuda_ars: grupo.deuda_total,
      total_usd: grupo.ventas.reduce((suma, v) => suma + v.venta.total_usd, 0),
      cantidad_ventas: grupo.ventas.length,
    }))
    .filter((item) => item.deuda_ars > 0)
    .sort((a, b) => b.deuda_ars - a.deuda_ars);
}

/**
 * Devuelve el detalle de deuda agrupado por reventa y por venta.
 * Admin ve todas; la reventa solo ve su propio detalle.
 */
export async function detalleDeudaPorVenta(
  reventaId?: string
): Promise<DeudaPorReventa[]> {
  const mapa = await obtenerDeudasInterno(reventaId);
  return Array.from(mapa.values()).sort((a, b) => b.deuda_total - a.deuda_total);
}
