import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ReventaLayout } from '@/components/layout/ReventaLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { PreciosPage } from '@/pages/admin/PreciosPage';
import { CatalogoPage } from '@/pages/admin/CatalogoPage';
import { ConsignacionesPage } from '@/pages/admin/ConsignacionesPage';
import { PedidosPage as AdminPedidosPage } from '@/pages/admin/PedidosPage';
import { VentasPage } from '@/pages/admin/VentasPage';
import { DeudasPage } from '@/pages/admin/DeudasPage';
import { CajaPage } from '@/pages/admin/CajaPage';
import { UsuariosPage } from '@/pages/admin/UsuariosPage';
import { MiStockPage } from '@/pages/reventa/MiStockPage';
import { RegistrarVentaPage } from '@/pages/reventa/RegistrarVentaPage';
import { PedidosPage as ReventaPedidosPage } from '@/pages/reventa/PedidosPage';
import { MiDeudaPage } from '@/pages/reventa/MiDeudaPage';

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="catalogo" element={<CatalogoPage />} />
        <Route path="precios" element={<PreciosPage />} />
        <Route path="consignaciones" element={<ConsignacionesPage />} />
        <Route path="pedidos" element={<AdminPedidosPage />} />
        <Route path="ventas" element={<VentasPage />} />
        <Route path="deudas" element={<DeudasPage />} />
        <Route path="caja" element={<CajaPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Route>

      {/* Reventa */}
      <Route
        path="/reventa"
        element={
          <ProtectedRoute allowedRoles="reventa">
            <ReventaLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MiStockPage />} />
        <Route path="venta" element={<RegistrarVentaPage />} />
        <Route path="pedidos" element={<ReventaPedidosPage />} />
        <Route path="deuda" element={<MiDeudaPage />} />
      </Route>

      {/* Redirecciones raíz */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function RootRedirect() {
  // Este componente se renderiza sin contexto de auth; el ProtectedRoute
  // de cada layout ya se encarga de la protección. Redirigimos a login
  // para que el flujo de auth decida el destino final.
  return <Navigate to="/login" replace />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold text-textPrimary">404</h1>
      <p className="mt-2 text-textMuted">Página no encontrada</p>
      <a href="/" className="mt-4 text-accent hover:underline">
        Volver al inicio
      </a>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background font-sans text-textPrimary antialiased">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;
