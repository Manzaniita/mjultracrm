import { supabase } from '../lib/supabase';
import { AuthError, handleSupabaseError } from '../utils/errors';
import type { SignInCredentials, AuthResult } from '../types/auth';
import type { Perfil } from '../types/catalogo';

/**
 * Inicia sesión con email y contraseña y recupera el perfil asociado.
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new AuthError('Email o contraseña incorrectos.', 'INVALID_CREDENTIALS');
    }
    throw new AuthError(error.message, error.name, error.status);
  }

  if (!data.user) {
    throw new AuthError('No se pudo obtener el usuario autenticado.');
  }

  const perfil = await obtenerPerfil(data.user.id);

  if (!perfil.activo) {
    await supabase.auth.signOut();
    throw new AuthError('El usuario está desactivado. Contactá al administrador.');
  }

  return { user: data.user, session: data.session, perfil };
}

/**
 * Cierra la sesión actual.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthError(error.message, error.name, error.status);
  }
}

/**
 * Obtiene la sesión activa desde el cliente de Supabase.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new AuthError(error.message, error.name, error.status);
  }
  return data.session;
}

/**
 * Recupera el perfil de un usuario por su ID de auth.
 */
export async function obtenerPerfil(userId: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  if (!data) {
    throw new AuthError('No existe un perfil asociado a este usuario.');
  }

  return data;
}

/**
 * Devuelve el usuario autenticado junto con su perfil.
 */
export async function getCurrentUserWithProfile(): Promise<AuthResult | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new AuthError(error.message, error.name, error.status);
  }

  if (!data.user) {
    return null;
  }

  const perfil = await obtenerPerfil(data.user.id);
  return { user: data.user, session: await getCurrentSession(), perfil };
}

/**
 * Lista las reventas activas para selects de consignaciones.
 * Admin ve todas; la reventa no debería usar esta función (RLS restringe).
 */
export async function listarReventas(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'reventa')
    .eq('activo', true)
    .order('nombre');

  if (error) handleSupabaseError(error);
  return data ?? [];
}

/**
 * Suscripción a cambios de estado de autenticación.
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
