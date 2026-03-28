'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  MessageSquare, 
  Settings2, 
  LayoutDashboard,
  Zap,
  ShoppingCart,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/conversations', label: 'Chats en Vivo', icon: MessageSquare },
  { href: '/recuperador', label: 'Recuperador de Carritos', icon: ShoppingCart },
  { href: '/analytics', label: 'Analíticas', icon: BarChart3 },
  { href: '/settings', label: 'Ajustes del Agente', icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="w-72 h-screen sidebar-gradient border-right border-slate-800/50 flex flex-col p-6 hidden md:flex">
      <div className="flex items-center gap-3 px-4 mb-12">
        <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center shadow-lg shadow-primary/20 animate-float">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        <span className="text-2xl font-black text-white tracking-tighter uppercase italic">Alpha</span>
      </div>

      <div className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}`} />
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#3b82f6]" />}
              {!isActive && <ChevronRight className="w-4 h-4 text-slate-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto space-y-4">
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all group border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-bold tracking-tight">Cerrar Sesión</span>
        </button>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-slate-800/40 relative overflow-hidden group/profile">
          <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover/profile:translate-y-0 transition-transform duration-500" />
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 relative z-10">
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 rounded-full" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <p className="text-xs font-bold text-white truncate uppercase tracking-tight">Administrador</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sistema Activo</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
