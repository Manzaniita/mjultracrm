import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from '@/components/ui/Loader';

export function AuthLayout() {
  const { perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size="lg" color="violet" />
      </div>
    );
  }

  if (perfil) {
    return <Navigate to={perfil.rol === 'admin' ? '/admin' : '/reventa'} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-[#5b21b6] shadow-lg shadow-accent/20">
            <span className="text-2xl font-bold text-white">MJ</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-textPrimary">
            MJUltraCRM
          </h1>
          <p className="mt-1 text-sm text-textMuted">
            Gestión de stock, consignaciones y ventas
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
