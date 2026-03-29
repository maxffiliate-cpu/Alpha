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
  ShieldCheck
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ThemeToggle from '@/components/ui/ThemeToggle';

const navItems = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/conversations', label: 'Chats en Vivo', icon: MessageSquare },
  { href: '/recuperador', label: 'Recuperador de Carritos', icon: ShoppingCart },
  { href: '/analytics', label: 'Analíticas', icon: BarChart3 },
  { href: '/settings', label: 'Ajustes del Agente', icon: Settings2 },
];

const ADMIN_TENANT_ID = 'd568b898-9942-47cd-b31e-5f0b1f34ab01';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('Administrador');

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tenant_id = user.app_metadata?.tenant_id;
        if (tenant_id === ADMIN_TENANT_ID) {
          setIsSuperAdmin(true);
        }
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

  return (
    <nav className="w-72 h-screen sidebar-gradient border-r border-[var(--border)] flex flex-col p-6 hidden md:flex">
      <div className="flex items-center gap-3 px-4 mb-12">
        <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center shadow-lg shadow-[var(--primary-glow)] animate-float">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        <span className="text-2xl font-black text-[var(--foreground)] tracking-tighter uppercase italic">Alpha</span>
      </div>

      <div className="flex-1 space-y-6">
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">Menú Principal</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20 shadow-[0_0_15px_var(--primary-glow)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--foreground)] transition-colors'}`} />
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]" />}
                {!isActive && <ChevronRight className="w-4 h-4 text-[var(--border)] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />}
              </Link>
            );
          })}
        </div>

        {isSuperAdmin && (
          <div className="space-y-2 pt-4 border-t border-[var(--border)]">
            <p className="px-4 text-[10px] font-black text-[var(--primary)]/60 uppercase tracking-[0.2em] mb-4">Control CEO</p>
            <Link
              href="/admin/stats"
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                pathname === '/admin/stats'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-5 h-5 ${pathname === '/admin/stats' ? 'text-amber-500' : 'text-[var(--text-muted)] group-hover:text-amber-500 transition-colors'}`} />
                <span className="text-sm font-bold tracking-tight">Macro Insights</span>
              </div>
              {pathname === '/admin/stats' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/5 transition-all group border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>
          </button>
          <ThemeToggle />
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden group/profile">
          <div className="absolute inset-0 bg-[var(--primary-subtle)] translate-y-full group-hover/profile:translate-y-0 transition-transform duration-500" />
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] relative z-10 flex items-center justify-center uppercase font-black text-[var(--text-muted)] text-xs">
            {userEmail[0]}
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-[var(--foreground)] truncate uppercase tracking-tight">{userEmail.split('@')[0]}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{isSuperAdmin ? 'Super Admin' : 'Operador'}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
