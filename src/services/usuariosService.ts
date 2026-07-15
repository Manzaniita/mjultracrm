import { supabase } from '../lib/supabase';
import { CatalogoError, handleSupabaseError, ValidationError } from '../utils/errors';
import { validarId, validarNombre } from '../utils/validators';
import type { PerfilRow, PerfilInsert } from '../types/database.types';

// ------------------------------------------------------------------
// Tipos de entrada
// ------------------------------------------------------------------

export interface CrearReventaForm {
  email: string;
  password: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
}

// ------------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------------

function validarEmail(email: unknown): string {
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new ValidationError('El email es obligatorio.');
  }
  const limpio = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(limpio)) {
    throw new ValidationError('El email no tiene un formato válido.');
  }
  return limpio;
}

function validarPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres.');
  }
  return password;
}

async function verificarUsuarioEsAdmin(): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CatalogoError('Debe haber un usuario autenticado para gestionar usuarios.');
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (error) handleSupabaseError(error);
  if (!data || data.rol !== 'admin') {
    throw new CatalogoError('Solo el admin puede gestionar usuarios.');
  }
}

// ------------------------------------------------------------------
// Usuarios / perfiles
// ------------------------------------------------------------------

/**
 * Lista todos los perfiles. Solo disponible para admin.
 */
export async function listarPerfiles(): Promise<PerfilRow[]> {
  await verificarUsuarioEsAdmin();

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .order('nombre');

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Crea una nueva reventa en el sistema.
 * Usa `supabase.auth.signUp` desde el cliente (no se puede usar admin.createUser)
 * y luego actualiza el perfil con rol 'reventa'.
 *
 * Nota: si el proyecto tiene confirmación de email habilitada, signUp no inicia
 * sesión automáticamente y el admin mantiene su sesión. Si no la tiene, signUp
 * iniciará sesión con el nuevo usuario; en ese caso se cierra y se vuelve a la
 * sesión anterior no es posible sin credenciales, por lo que el admin deberá
 * volver a iniciar sesión.
 */
export async function crearReventa(form: CrearReventaForm): Promise<PerfilRow> {
  await verificarUsuarioEsAdmin();

  const email = validarEmail(form.email);
  const password = validarPassword(form.password);
  const nombre = validarNombre(form.nombre, 'Nombre de reventa');

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre },
    },
  });

  if (signUpError) handleSupabaseError(signUpError);
  if (!signUpData.user) {
    throw new CatalogoError('No se pudo crear el usuario de la reventa.');
  }

  // Si por configuración signUp inició sesión con la nueva cuenta, cerrarla
  // para evitar dejar al admin logueado como la reventa creada.
  if (signUpData.session) {
    await supabase.auth.signOut();
  }

  const perfilInsert: PerfilInsert = {
    id: signUpData.user.id,
    nombre,
    email,
    rol: 'reventa',
    activo: true,
    telefono: form.telefono ?? null,
    direccion: form.direccion ?? null,
  };

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .upsert(perfilInsert)
    .select()
    .single();

  if (perfilError) handleSupabaseError(perfilError);
  if (!perfil) throw new CatalogoError('No se pudo crear el perfil de la reventa.');

  return perfil;
}

/**
 * Activa un perfil de usuario.
 */
export async function activarPerfil(id: string): Promise<PerfilRow> {
  await verificarUsuarioEsAdmin();
  const idLimpio = validarId(id, 'ID de perfil');

  const { data, error } = await supabase
    .from('perfiles')
    .update({ activo: true })
    .eq('id', idLimpio)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el perfil para activar.');

  return data;
}

/**
 * Desactiva un perfil de usuario.
 */
export async function desactivarPerfil(id: string): Promise<PerfilRow> {
  await verificarUsuarioEsAdmin();
  const idLimpio = validarId(id, 'ID de perfil');

  const { data, error } = await supabase
    .from('perfiles')
    .update({ activo: false })
    .eq('id', idLimpio)
    .select()
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new CatalogoError('No se encontró el perfil para desactivar.');

  return data;
}
