import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from '@/components/ui/Loader';
import type { Rol } from '@/types';

interface ProtectedRouteProps {
  allowedRoles: Rol | Rol[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { perfil, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size="lg" color="violet" />
      </div>
    );
  }

  if (!perfil) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(perfil.rol)) {
    // Redirigir al panel correspondiente si el rol no coincide.
    return <Navigate to={perfil.rol === 'admin' ? '/admin' : '/reventa'} replace />;
  }

  return <>{children}</>;
}
