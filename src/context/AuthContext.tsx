import * as React from 'react';
import {
  signIn as signInService,
  signOut as signOutService,
  getCurrentUserWithProfile,
  onAuthStateChange,
} from '@/services/authService';
import type { User } from '@supabase/supabase-js';
import type { Perfil } from '@/types';
import type { SignInCredentials } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [perfil, setPerfil] = React.useState<Perfil | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadUser = React.useCallback(async () => {
    try {
      const result = await getCurrentUserWithProfile();
      setUser(result?.user ?? null);
      setPerfil(result?.perfil ?? null);
    } catch (err) {
      setUser(null);
      setPerfil(null);
      setError(err instanceof Error ? err.message : 'Error al cargar la sesión.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUser();

    const { data: subscription } = onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUser(null);
        setPerfil(null);
        setLoading(false);
        return;
      }
      await loadUser();
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [loadUser]);

  const signIn = React.useCallback(async (credentials: SignInCredentials) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInService(credentials);
      setUser(result.user);
      setPerfil(result.perfil);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    setLoading(true);
    try {
      await signOutService();
      setUser(null);
      setPerfil(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar sesión.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPerfil = React.useCallback(async () => {
    if (!user) return;
    try {
      const result = await getCurrentUserWithProfile();
      setPerfil(result?.perfil ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el perfil.');
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, perfil, loading, error, signIn, signOut, refreshPerfil }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
}
