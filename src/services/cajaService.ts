import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError, ValidationError } from '../utils/errors';
import {
  validarId,
  validarMontoPositivo,
  validarNombre,
} from '../utils/validators';
import type {
  CajaMovimientoRow,
  CajaMovimientoInsert,
  ArqueoRow,
  ArqueoSaldoRow,
  ArqueoSaldoInsert,
  MetodoPago,
  TipoCajaMovimiento,
  TipoReferenciaCaja,
} from '../types/database.types';

// ------------------------------------------------------------------
// Tipos de entrada
// ------------------------------------------------------------------

export interface CrearMovimientoManualForm {
  tipo: TipoCajaMovimiento;
  monto_ars: number;
  metodo: MetodoPago;
  motivo: string;
}

export interface FiltrosMovimientoCaja {
  tipo?: TipoCajaMovimiento;
  metodo?: MetodoPago;
  fecha_desde?: string;
  fecha_hasta?: string;
  usuario_id?: string;
}

export interface ArqueoSaldoInput {
  metodo: MetodoPago;
  saldo_real: number;
}

export interface CrearArqueoForm {
  observaciones?: string | null;
  saldos: ArqueoSaldoInput[];
}

export interface SaldosPorMetodo {
  efectivo: number;
  transferencia: number;
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
    throw new CatalogoError('Debe haber un usuario autenticado para operar la caja.');
  }

  return user.id;
}

function validarTipoCajaMovimiento(tipo: unknown): TipoCajaMovimiento {
  if (tipo !== 'ingreso' && tipo !== 'egreso' && tipo !== 'gasto') {
    throw new ValidationError('El tipo de movimiento debe ser ingreso, egreso o gasto.');
  }
  return tipo;
}

function validarMetodoPago(metodo: unknown): MetodoPago {
  if (metodo !== 'efectivo' && metodo !== 'transferencia') {
    throw new ValidationError('El método de pago debe ser efectivo o transferencia.');
  }
  return metodo;
}

// ------------------------------------------------------------------
// Movimientos manuales
// ------------------------------------------------------------------

/**
 * Crea un movimiento manual de caja (egreso o gasto).
 * Los ingresos se generan automáticamente al registrar pagos.
 */
export async function crearMovimientoManual(
  form: CrearMovimientoManualForm
): Promise<CajaMovimientoRow> {
  const tipo = validarTipoCajaMovimiento(form.tipo);
  const monto = validarMontoPositivo(form.monto_ars, 'Monto del movimiento');
  const metodo = validarMetodoPago(form.metodo);
  const motivo = validarNombre(form.motivo, 'Motivo del movimiento');
  const usuarioId = await obtenerUsuarioActual();

  if (tipo === 'ingreso') {
    throw new ValidationError(
      'Los ingresos se registran automáticamente con los pagos. Usá egreso o gasto.'
    );
  }

  const insertData: CajaMovimientoInsert = {
    tipo,
    monto_ars: monto,
    metodo,
    motivo,
    usuario_id: usuarioId,
    referencia_tipo: 'manual' as TipoReferenciaCaja,
  };

  const { data, error } = await supabase
    .from('caja_movimientos')
    .insert(insertData)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se pudo crear el movimiento de caja.');

  return data;
}

/**
 * Lista movimientos de caja con filtros opcionales.
 */
export async function listarMovimientos(
  filtros: FiltrosMovimientoCaja = {}
): Promise<CajaMovimientoRow[]> {
  let query = supabase
    .from('caja_movimientos')
    .select('*')
    .order('created_at', { ascending: false });

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  if (filtros.metodo) {
    query = query.eq('metodo', filtros.metodo);
  }

  if (filtros.fecha_desde) {
    query = query.gte('created_at', filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    query = query.lte('created_at', filtros.fecha_hasta);
  }

  if (filtros.usuario_id) {
    query = query.eq('usuario_id', validarId(filtros.usuario_id, 'ID de usuario'));
  }

  const { data, error } = await query;

  if (error) handleSupabaseError(error);
  return data ?? [];
}

// ------------------------------------------------------------------
// Saldos
// ------------------------------------------------------------------

/**
 * Calcula el saldo teórico por método de pago a partir de todos los movimientos.
 */
export async function calcularSaldosPorMetodo(): Promise<SaldosPorMetodo> {
  const { data, error } = await supabase.from('caja_movimientos').select('tipo, metodo, monto_ars');

  if (error) handleSupabaseError(error);

  const saldos: SaldosPorMetodo = { efectivo: 0, transferencia: 0 };

  for (const mov of data ?? []) {
    if (mov.metodo !== 'efectivo' && mov.metodo !== 'transferencia') continue;

    if (mov.tipo === 'ingreso') {
      saldos[mov.metodo] += mov.monto_ars;
    } else if (mov.tipo === 'egreso' || mov.tipo === 'gasto') {
      saldos[mov.metodo] -= mov.monto_ars;
    }
  }

  return {
    efectivo: Number(saldos.efectivo.toFixed(2)),
    transferencia: Number(saldos.transferencia.toFixed(2)),
  };
}

// ------------------------------------------------------------------
// Arqueo
// ------------------------------------------------------------------

/**
 * Crea un arqueo comparando los saldos teóricos contra los reales ingresados.
 * Genera un movimiento de ajuste por la diferencia de cada método.
 */
export async function crearArqueo(
  form: CrearArqueoForm
): Promise<ArqueoRow & { saldos: ArqueoSaldoRow[] }> {
  const usuarioId = await obtenerUsuarioActual();
  const saldosTeoricos = await calcularSaldosPorMetodo();

  if (!Array.isArray(form.saldos) || form.saldos.length === 0) {
    throw new ValidationError('Debe indicar al menos un saldo real para el arqueo.');
  }

  const saldosProcesados: ArqueoSaldoInput[] = form.saldos.map((saldo, _index) => {
    const metodo = validarMetodoPago(saldo.metodo);
    const real = validarMontoPositivo(saldo.saldo_real, `Saldo real (${metodo})`);
    return { metodo, saldo_real: real };
  });

  // Evitar métodos duplicados.
  const metodos = new Set(saldosProcesados.map((s) => s.metodo));
  if (metodos.size !== saldosProcesados.length) {
    throw new ValidationError('No puede haber dos saldos para el mismo método.');
  }

  const arqueoInsert = {
    usuario_id: usuarioId,
    observaciones: form.observaciones ?? null,
  };

  const { data: arqueo, error: arqueoError } = await supabase
    .from('arqueos')
    .insert(arqueoInsert)
    .select()
    .single();

  if (arqueoError) handleSupabaseError(arqueoError);
  if (!arqueo) throw new CatalogoError('No se pudo crear el arqueo.');

  const saldosInsert: ArqueoSaldoInsert[] = saldosProcesados.map((saldo) => {
    const teorico = saldo.metodo === 'efectivo' ? saldosTeoricos.efectivo : saldosTeoricos.transferencia;
    const diferencia = Number((saldo.saldo_real - teorico).toFixed(2));
    return {
      arqueo_id: arqueo.id,
      metodo: saldo.metodo,
      saldo_teorico: teorico,
      saldo_real: saldo.saldo_real,
      diferencia,
    };
  });

  const { data: saldosCreados, error: saldosError } = await supabase
    .from('arqueo_saldos')
    .insert(saldosInsert)
    .select();

  if (saldosError) {
    // Rollback manual del arqueo si fallan los saldos.
    await supabase.from('arqueos').delete().eq('id', arqueo.id);
    handleSupabaseError(saldosError);
  }

  // Generar movimientos de ajuste por diferencia.
  for (const saldo of saldosInsert) {
    if (saldo.diferencia === 0) continue;

    const tipo: TipoCajaMovimiento = saldo.diferencia > 0 ? 'ingreso' : 'egreso';
    const movimiento: CajaMovimientoInsert = {
      tipo,
      monto_ars: Math.abs(saldo.diferencia),
      metodo: saldo.metodo,
      motivo: `Ajuste por arqueo ${arqueo.id}: diferencia ${saldo.diferencia}`,
      usuario_id: usuarioId,
      referencia_tipo: 'arqueo' as TipoReferenciaCaja,
      referencia_id: arqueo.id,
    };

    const { error: movError } = await supabase.from('caja_movimientos').insert(movimiento);

    if (movError) handleSupabaseError(movError);
  }

  return { ...arqueo, saldos: saldosCreados ?? [] };
}
