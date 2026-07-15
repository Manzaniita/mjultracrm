import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError, ValidationError } from '../utils/errors';
import { validarId, validarMontoPositivo } from '../utils/validators';
import type {
  PagoRow,
  PagoInsert,
  VentaRow,
  MetodoPago,
} from '../types/database.types';

// ------------------------------------------------------------------
// Tipos de entrada
// ------------------------------------------------------------------

export interface CrearPagoForm {
  venta_id: string;
  monto_ars: number;
  metodo: MetodoPago;
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
    throw new CatalogoError('Debe haber un usuario autenticado para registrar el pago.');
  }

  return user.id;
}

async function obtenerVenta(ventaId: string): Promise<VentaRow> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .eq('id', ventaId)
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró la venta asociada al pago.');

  return data;
}

async function calcularTotalPagado(ventaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('pagos')
    .select('monto_ars')
    .eq('venta_id', ventaId);

  if (error) handleSupabaseError(error);

  return (data ?? []).reduce((suma, pago) => suma + pago.monto_ars, 0);
}

function validarMetodoPago(metodo: unknown): MetodoPago {
  if (metodo !== 'efectivo' && metodo !== 'transferencia') {
    throw new ValidationError('El método de pago debe ser efectivo o transferencia.');
  }
  return metodo;
}

// ------------------------------------------------------------------
// Pagos
// ------------------------------------------------------------------

/**
 * Registra un pago para una venta y genera automáticamente el ingreso en caja.
 * Actualiza el estado de cobro de la venta.
 */
export async function crearPago(form: CrearPagoForm): Promise<PagoRow> {
  const ventaId = validarId(form.venta_id, 'ID de venta');
  const monto = validarMontoPositivo(form.monto_ars, 'Monto del pago');
  const metodo = validarMetodoPago(form.metodo);
  const usuarioId = await obtenerUsuarioActual();

  const venta = await obtenerVenta(ventaId);

  if (venta.anulada) {
    throw new CatalogoError('No se pueden registrar pagos sobre una venta anulada.');
  }

  const totalPagadoActual = await calcularTotalPagado(ventaId);
  if (totalPagadoActual + monto > venta.total_ars) {
    throw new CatalogoError(
      'El pago excede el total de la venta. Verificá los montos registrados.'
    );
  }

  const pagoInsert: PagoInsert = {
    venta_id: ventaId,
    monto_ars: monto,
    metodo,
    usuario_id: usuarioId,
  };

  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .insert(pagoInsert)
    .select()
    .single();

  if (pagoError) handleSupabaseError(pagoError);
  if (!pago) throw new CatalogoError('No se pudo registrar el pago.');

  // Los triggers de base de datos se encargan de:
  // - actualizar el estado de cobro de la venta.
  // - generar el movimiento de caja tipo 'ingreso'.

  return pago;
}

/**
 * Lista todos los pagos de una venta ordenados por fecha descendente.
 */
export async function listarPagosPorVenta(ventaId: string): Promise<PagoRow[]> {
  const idLimpio = validarId(ventaId, 'ID de venta');

  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('venta_id', idLimpio)
    .order('fecha', { ascending: false });

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Sube un comprobante de pago al bucket `comprobantes` y actualiza la URL en el pago.
 * El archivo se guarda en la carpeta de la reventa dueña de la venta para respetar RLS.
 */
export async function subirComprobante(
  pagoId: string,
  archivo: File
): Promise<string> {
  const idLimpio = validarId(pagoId, 'ID de pago');

  if (!(archivo instanceof File)) {
    throw new ValidationError('El archivo no es válido.');
  }

  const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  if (!tiposPermitidos.includes(archivo.type)) {
    throw new ValidationError(
      'El comprobante debe ser una imagen (JPEG, PNG, WebP) o un PDF.'
    );
  }

  if (archivo.size > 10 * 1024 * 1024) {
    throw new ValidationError('El comprobante no puede superar los 10 MB.');
  }

  // Obtener la venta asociada para determinar la reventa dueña.
  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .select('venta_id')
    .eq('id', idLimpio)
    .single();

  if (pagoError) handleSupabaseError(pagoError);
  if (!pago) throw new CatalogoError('No se encontró el pago.');

  const { data: venta, error: ventaError } = await supabase
    .from('ventas')
    .select('reventa_id')
    .eq('id', pago.venta_id)
    .single();

  if (ventaError) handleSupabaseError(ventaError);
  if (!venta) throw new CatalogoError('No se encontró la venta asociada al pago.');

  const reventaId = venta.reventa_id ?? 'admin';
  const extension = archivo.name.split('.').pop() ?? '';
  const nombreArchivo = `${Date.now()}.${extension}`;
  const path = `reventas/${reventaId}/${idLimpio}/${nombreArchivo}`;

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(path, archivo, {
      cacheControl: '3600',
      upsert: true,
      contentType: archivo.type,
    });

  if (uploadError) handleSupabaseError(uploadError);

  const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('pagos')
    .update({ comprobante_url: publicUrl.publicUrl })
    .eq('id', idLimpio);

  if (updateError) handleSupabaseError(updateError);

  return publicUrl.publicUrl;
}
