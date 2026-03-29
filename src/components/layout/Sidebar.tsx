'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  MessageSquare,
  Settings2,
  LayoutDashboard,
  Zap,
  ShoppingCart,
  ChevronRight,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ThemeToggle from '@/components/ui/ThemeToggle';

const navItems = [
  { href: '/',             label: 'Resumen',               icon: LayoutDashboard },
  { href: '/conversations',label: 'Chats en Vivo',          icon: MessageSquare   },
  { href: '/recuperador',  label: 'Recuperador de Carritos', icon: ShoppingCart    },
  { href: '/analytics',    label: 'Analíticas',             icon: BarChart3       },
  { href: '/settings',     label: 'Ajustes del Agente',     icon: Settings2       },
];

const ADMIN_TENANT_ID = 'd568b898-9942-47cd-b31e-5f0b1f34ab01';

// ─── Tooltip wrapper para modo comprimido ─────────────────────────────────────

function NavTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <div className="relative group/tip w-full">
      {children}
      <span className="
        pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-bold
        bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)]
        shadow-lg opacity-0 group-hover/tip:opacity-100
        transition-opacity duration-150
      ">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--border)]" />
      </span>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail,    setUserEmail]    = useState('Administrador');
  const [collapsed,    setCollapsed]    = useState(false);
  const [mounted,      setMounted]      = useState(false);

  // Restore persisted state — after mount to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.app_metadata?.tenant_id === ADMIN_TENANT_ID) setIsSuperAdmin(true);
        setUserEmail(user.email || 'Administrador');
      }
    }
    checkAuth();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Prevent width flash before localStorage is read
  if (!mounted) return (
    <nav className="w-72 h-screen sidebar-gradient border-r border-[var(--border)] hidden md:flex" />
  );

  return (
    <nav
      className={`
        h-screen sidebar-gradient border-r border-[var(--border)]
        flex-col hidden md:flex shrink-0
        transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-[72px]' : 'w-72'}
      `}
    >
      {/* ── Logo + toggle ──────────────────────────────────────────────────── */}
      <div className={`flex items-center pt-6 pb-10 px-4 ${collapsed ? 'flex-col gap-4' : 'justify-between'}`}>

        {/* Logo mark — always visible */}
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center shadow-lg shadow-[var(--primary-glow)] animate-float shrink-0">
            <Zap className="text-white w-6 h-6 fill-white" />
          </div>
          {!collapsed && (
            <span className="text-2xl font-black text-[var(--foreground)] tracking-tighter uppercase italic select-none">
              Alpha
            </span>
          )}
        </div>

        {/* Collapse / expand toggle */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir sidebar' : 'Comprimir sidebar'}
          className={`
            flex items-center justify-center rounded-lg
            text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
            border border-transparent hover:border-[var(--border)]
            transition-all duration-200 shrink-0
            ${collapsed ? 'w-10 h-10' : 'w-8 h-8'}
          `}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">

        {!collapsed && (
          <p className="px-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
            Menú Principal
          </p>
        )}

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <NavTooltip key={item.href} label={item.label} collapsed={collapsed}>
              <Link
                href={item.href}
                className={`
                  flex items-center py-3 rounded-xl transition-all group w-full
                  ${collapsed ? 'justify-center px-0' : 'justify-between px-3'}
                  ${isActive
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20 shadow-[0_0_15px_var(--primary-glow)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                  }
                `}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <item.icon className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--text-muted)] group-hover:text-[var(--foreground)]'
                  }`} />
                  {!collapsed && (
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                  )}
                </div>

                {/* Trailing indicators — only expanded */}
                {!collapsed && isActive  && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]" />}
                {!collapsed && !isActive && <ChevronRight className="w-4 h-4 text-[var(--border)] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />}
              </Link>
            </NavTooltip>
          );
        })}

        {/* Admin section */}
        {isSuperAdmin && (
          <div className={`pt-3 mt-3 border-t border-[var(--border)]`}>
            {!collapsed && (
              <p className="px-3 text-[10px] font-black text-[var(--primary)]/60 uppercase tracking-[0.2em] mb-3">
                Control CEO
              </p>
            )}
            <NavTooltip label="Macro Insights" collapsed={collapsed}>
              <Link
                href="/admin/stats"
                className={`
                  flex items-center py-3 rounded-xl transition-all group w-full
                  ${collapsed ? 'justify-center px-0' : 'justify-between px-3'}
                  ${pathname === '/admin/stats'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/5'
                  }
                `}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                  <ShieldCheck className={`w-5 h-5 shrink-0 transition-colors ${
                    pathname === '/admin/stats'
                      ? 'text-amber-500'
                      : 'text-[var(--text-muted)] group-hover:text-amber-500'
                  }`} />
                  {!collapsed && <span className="text-sm font-bold tracking-tight">Macro Insights</span>}
                </div>
                {!collapsed && pathname === '/admin/stats' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                )}
              </Link>
            </NavTooltip>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className={`mt-auto p-3 space-y-1`}>

        {/* Configuración — acceso directo al panel de cuenta */}
        <div className="pt-2 border-t border-[var(--border)] mb-1">
          <NavTooltip label="Configuración" collapsed={collapsed}>
            <Link
              href="/config"
              className={`
                flex items-center py-3 rounded-xl transition-all group w-full
                ${collapsed ? 'justify-center px-0' : 'justify-between px-3'}
                ${pathname === '/config' || pathname.startsWith('/config/')
                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                }
              `}
            >
              <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                <SlidersHorizontal className={`w-5 h-5 shrink-0 transition-colors ${
                  pathname === '/config' || pathname.startsWith('/config/')
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--foreground)]'
                }`} />
                {!collapsed && <span className="text-sm font-bold tracking-tight">Configuración</span>}
              </div>
              {!collapsed && !(pathname === '/config' || pathname.startsWith('/config/')) && (
                <ChevronRight className="w-4 h-4 text-[var(--border)] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
              )}
              {!collapsed && (pathname === '/config' || pathname.startsWith('/config/')) && (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]" />
              )}
            </Link>
          </NavTooltip>
        </div>

        {/* Sign out + theme toggle */}
        <div className={`flex items-center ${collapsed ? 'flex-col gap-1' : 'justify-between px-1'}`}>
          <NavTooltip label="Cerrar Sesión" collapsed={collapsed}>
            <button
              onClick={handleSignOut}
              className={`
                flex items-center gap-3 py-3 rounded-xl
                text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/5
                transition-all group border border-transparent hover:border-rose-500/20
                ${collapsed ? 'justify-center w-full px-0' : 'px-3 w-auto'}
              `}
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform shrink-0" />
              {!collapsed && <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>}
            </button>
          </NavTooltip>
          <ThemeToggle />
        </div>

        {/* Profile card */}
        <div className={`
          glass-panel rounded-2xl flex items-center relative overflow-hidden group/profile
          ${collapsed ? 'p-2 justify-center' : 'p-4 gap-4'}
        `}>
          <div className="absolute inset-0 bg-[var(--primary-subtle)] translate-y-full group-hover/profile:translate-y-0 transition-transform duration-500" />
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] relative z-10 flex items-center justify-center uppercase font-black text-[var(--text-muted)] text-xs shrink-0">
            {userEmail[0]}
          </div>
          {/* User info — hidden when collapsed */}
          {!collapsed && (
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-[10px] font-bold text-[var(--foreground)] truncate uppercase tracking-tight">
                {userEmail.split('@')[0]}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                  {isSuperAdmin ? 'Super Admin' : 'Operador'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
