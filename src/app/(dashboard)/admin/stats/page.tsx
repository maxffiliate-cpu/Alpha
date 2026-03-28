'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  AlertTriangle, 
  Database,
  ArrowUpRight,
  Loader2,
  Trophy,
  ShieldCheck
} from 'lucide-react';

interface MacroMetrics {
  total_ingresos: number;
  ranking_tenants: Array<{ name: string; volumen_pedidos: number }>;
  health_status: Array<{ name: string; errores_detectados: number }>;
  generated_at: string;
}

export default function AdminStatsPage() {
  const [metrics, setMetrics] = useState<MacroMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const { data, error } = await supabase.rpc('get_admin_macro_metrics');
        if (error) {
          console.error('Supabase RPC Error:', error);
          throw new Error(error.message || 'Error de permisos o ejecución en el servidor');
        }
        setMetrics(data as MacroMetrics);
      } catch (err: any) {
        console.error('Error fetching admin metrics:', err);
        setError(err.message || 'Error al cargar métricas de administrador');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Consultando métricas macro de Alpha...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 glass-panel border-rose-500/20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-6 py-2 rounded-xl primary-gradient text-white font-bold text-sm shadow-lg shadow-primary/20"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-10 p-2 md:p-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4" />
            Dashboard de Control CEO
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Alpha Macro Insights</h1>
          <p className="text-slate-400 mt-1 font-medium">Estado consolidado de todos los inquilinos y salud del sistema.</p>
        </div>
        <div className="px-4 py-2 glass-panel border-slate-800/50 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <Activity className="w-3 h-3 text-emerald-500" />
          Actualizado: {new Date(metrics.generated_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KPI: Ingresos Consolidados */}
        <div className="glass-panel p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/20 transition-colors duration-700" />
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <TrendingUp className="text-primary w-6 h-6" />
          </div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Ingresos Consolidados</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-black text-white tracking-tighter">
              ${new Intl.NumberFormat().format(metrics.total_ingresos)}
            </h2>
            <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> MoM
            </span>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>PROMEDIO POR CLIENTE</span>
              <span className="text-white">${new Intl.NumberFormat().format(Math.round(metrics.total_ingresos / (metrics.ranking_tenants.length || 1)))}</span>
            </div>
          </div>
        </div>

        {/* Top Tenants Card */}
        <div className="glass-panel p-8 col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Trophy className="text-amber-500 w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Top Clientes (Volumen)</h3>
            </div>
          </div>
          
          <div className="space-y-4 flex-1">
            {metrics.ranking_tenants.map((tenant, idx) => (
              <div key={tenant.name} className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-600 bg-slate-800/50 w-5 h-5 flex items-center justify-center rounded-full">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{tenant.name}</span>
                  </div>
                  <span className="text-xs font-black text-primary">{tenant.volumen_pedidos} <span className="text-slate-500 font-bold uppercase tracking-tighter text-[9px]">pedidos</span></span>
                </div>
                <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                  <div 
                    className="h-full primary-gradient shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${(tenant.volumen_pedidos / (metrics.ranking_tenants[0]?.volumen_pedidos || 1)) * 100}%`,
                      transitionDelay: `${idx * 150}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Error Watch Card */}
        <div className="glass-panel p-8 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertTriangle className="text-rose-500 w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Estado de Salud Técnica</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Alertas Críticas por Cliente</p>
              </div>
            </div>
            {metrics.health_status.length === 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-500 font-black uppercase">Sistema Saludable</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.health_status.length > 0 ? (
              metrics.health_status.map((item) => (
                <div key={item.name} className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30 flex items-center justify-between group hover:border-rose-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/5 flex items-center justify-center border border-rose-500/10 group-hover:bg-rose-500/15 transition-colors">
                      <Database className="text-rose-500/50 w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-300">{item.name}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-black text-rose-500 leading-none">{item.errores_detectados}</span>
                    <span className="block text-[8px] text-slate-600 font-black uppercase mt-0.5">Errores</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                <p className="text-slate-600 text-sm font-medium italic">No se han detectado errores críticos en la infraestructura de bots recientemente.</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Overview Card */}
        <div className="glass-panel p-8 bg-gradient-to-br from-slate-900/50 to-primary/5 border-primary/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Users className="text-primary w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Macro Actividad</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">TENANTS TOTALES</span>
              <span className="text-2xl font-black text-white">{metrics.ranking_tenants.length}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">TRANSACCIONES TOTALES</span>
              <span className="text-2xl font-black text-white">
                {new Intl.NumberFormat().format(metrics.ranking_tenants.reduce((a, b) => a + b.volumen_pedidos, 0))}
              </span>
            </div>
            <button 
              className="w-full py-4 rounded-xl primary-gradient text-white font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              Exportar Reporte Global <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
