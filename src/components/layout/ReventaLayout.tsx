import * as React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import {
  Package,
  PlusCircle,
  ClipboardList,
  CreditCard,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

const navItems = [
  { to: '/reventa', label: 'Mi Stock', icon: Package },
  { to: '/reventa/venta', label: 'Vender', icon: PlusCircle },
  { to: '/reventa/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/reventa/deuda', label: 'Mi Deuda', icon: CreditCard },
];

export function ReventaLayout() {
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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#5b21b6]">
            <span className="text-sm font-bold text-white">MJ</span>
          </div>
          <div>
            <p className="font-semibold text-textPrimary">MJUltraCRM</p>
            <p className="text-xs text-textMuted">Panel de reventa</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161619] text-textMuted">
              <User className="h-4 w-4" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-textPrimary">
                {perfil?.nombre ?? 'Reventa'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2 text-textMuted hover:bg-[#161619] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="border-b border-border bg-surface px-3 py-3 lg:hidden">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/reventa'}
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 flex-col border-r border-border bg-surface lg:flex">
          <nav className="flex-1 px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/reventa'}
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

        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Nav inferior móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface px-2 pb-safe pt-2 lg:hidden">
        <ul className="flex items-center justify-around">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/reventa'}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-textMuted',
                  ].join(' ')
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
