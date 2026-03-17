'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  MessageSquare, 
  Settings2, 
  LayoutDashboard,
  Zap,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/conversations', label: 'Live Chats', icon: MessageSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Agent Settings', icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-72 h-screen sidebar-gradient border-right border-slate-800/50 flex flex-col p-6 hidden md:flex">
      <div className="flex items-center gap-3 px-4 mb-12">
        <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center shadow-lg shadow-primary/20 animate-float">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        <span className="text-2xl font-black text-white tracking-tighter uppercase italic">Alpha</span>
      </div>

      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              {!isActive && <ChevronRight className="w-4 h-4 text-slate-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-slate-800/40">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
            <div className="w-full h-full bg-slate-700 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">Administrator</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active System</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
