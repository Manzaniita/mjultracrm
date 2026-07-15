import type { User, Session } from '@supabase/supabase-js';
import type { Perfil } from './catalogo';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  session: Session | null;
  perfil: Perfil;
}

export type AuthState =
  | { estado: 'cargando' }
  | { estado: 'autenticado'; user: User; perfil: Perfil }
  | { estado: 'no_autenticado' }
  | { estado: 'error'; mensaje: string };
