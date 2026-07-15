import * as React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import {
  LayoutDashboard,
  Tags,
  DollarSign,
  Package,
  ClipboardList,
  ShoppingCart,
  CreditCard,
  Wallet,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/catalogo', label: 'Catálogo', icon: Tags },
  { to: '/admin/precios', label: 'Precios', icon: DollarSign },
  { to: '/admin/consignaciones', label: 'Consignaciones', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/admin/deudas', label: 'Deudas', icon: CreditCard },
  { to: '/admin/caja', label: 'Caja', icon: Wallet },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

export function AdminLayout() {
  const { perfil, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size="lg" color="violet" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#5b21b6]">
            <span className="text-sm font-bold text-white">MJ</span>
          </div>
          <span className="font-semibold text-textPrimary">MJUltraCRM</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-textMuted hover:bg-[#161619] hover:text-textPrimary',
                    ].join(' ')
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#161619] text-textMuted">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-textPrimary">
                {perfil?.nombre ?? 'Admin'}
              </p>
              <p className="truncate text-xs text-textMuted">Administrador</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Header móvil */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#5b21b6]">
              <span className="text-sm font-bold text-white">MJ</span>
            </div>
            <span className="font-semibold text-textPrimary">MJUltraCRM</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2 text-textMuted hover:bg-[#161619]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Menú móvil */}
        {mobileOpen && (
          <div className="border-b border-border bg-surface px-3 py-3 lg:hidden">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-textMuted hover:bg-[#161619] hover:text-textPrimary',
                      ].join(' ')
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-textMuted hover:bg-[#161619] hover:text-textPrimary"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
