'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  TrendingUp,
  Users,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Trophy,
  ShieldCheck,
  ShoppingCart,
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

// ─── Tenant name registry ─────────────────────────────────────────────────────
// Fuente primaria: mapa hardcodeado con los tenants conocidos.
// Se enriquece dinámicamente con los datos de la tabla `tenants` en DB.

const KNOWN_TENANT_NAMES: Record<string, string> = {
  '1bf4cdbb-c845-4eb3-930e-2a2613e385bb': 'Premia2',
  'd568b898-9942-47cd-b31e-5f0b1f34ab01': 'Alpha Admin',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantRow {
  id: string;
  name: string;
}

interface TenantStats {
  tenantId:   string;
  name:       string;
  // Recuperador
  totalCarritos:   number;
  rescatados:      number;
  tasaRescate:     number;
  totalRecuperado: number;
  pendientes:      number;
  // IA
  totalInsights:   number;
  avgCsat:         number | null;
  avgAccuracy:     number | null;
  escalaciones:    number;
}

interface MacroMetrics {
  total_ingresos:    number;
  ranking_tenants:   Array<{ name: string; volumen_pedidos: number }>;
  health_status:     Array<{ name: string; errores_detectados: number }>;
  generated_at:      string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─── CopyID component ─────────────────────────────────────────────────────────

function CopyID({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title="Copiar tenant_id"
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all group/copy"
    >
      <span className="text-[10px] font-mono text-slate-500 group-hover/copy:text-slate-400 tracking-tight">
        {id.slice(0, 8)}…{id.slice(-4)}
      </span>
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3 text-slate-600 group-hover/copy:text-slate-400" />
      }
    </button>
  );
}

// ─── Per-Tenant Card ──────────────────────────────────────────────────────────

function TenantCard({ t, rank }: { t: TenantStats; rank: number }) {
  const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
  const rankColor  = rankColors[rank] ?? 'text-slate-500';

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/[0.03] hover:border-white/[0.07] transition-all space-y-5 group">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-sm font-black ${rankColor}`}>
            {rank + 1}
          </div>
          <div>
            <p className="text-base font-black text-white tracking-tight">{t.name}</p>
            <CopyID id={t.tenantId} />
          </div>
        </div>
        {t.escalaciones > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-400 uppercase tracking-widest shrink-0">
            <AlertTriangle className="w-3 h-3" />
            {t.escalaciones} escal.
          </span>
        )}
      </div>

      {/* Revenue KPI — prominent */}
      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dinero Recuperado</p>
        <p className="text-2xl font-black text-white tracking-tighter">{formatCLP(t.totalRecuperado)}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Recuperador */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/40">
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingCart className="w-3.5 h-3.5 text-violet-400" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recuperador</p>
          </div>
          <StatRow label="Carritos"    value={t.totalCarritos.toString()} />
          <StatRow label="Rescatados"  value={t.rescatados.toString()} accent="emerald" />
          <StatRow label="Tasa"        value={`${t.tasaRescate.toFixed(1)}%`} accent={t.tasaRescate >= 20 ? 'emerald' : 'amber'} />
          <StatRow label="Pendientes"  value={t.pendientes.toString()} accent={t.pendientes > 0 ? 'amber' : undefined} />
        </div>

        {/* IA */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800/40">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Motor IA</p>
          </div>
          <StatRow label="Sesiones"    value={t.totalInsights.toString()} />
          <StatRow label="CSAT"        value={t.avgCsat    !== null ? `${Math.round(t.avgCsat    * 100)}%` : '—'} accent="blue" />
          <StatRow label="Precisión"   value={t.avgAccuracy !== null ? `${Math.round(t.avgAccuracy * 100)}%` : '—'} accent={t.avgAccuracy !== null && t.avgAccuracy >= 0.75 ? 'emerald' : 'amber'} />
          <StatRow label="Escalaciones" value={t.escalaciones.toString()} accent={t.escalaciones > 0 ? 'rose' : undefined} />
        </div>
      </div>

      {/* Recovery bar */}
      {t.totalCarritos > 0 && (
        <div>
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
            <span>Tasa de rescate</span>
            <span className="text-white">{t.tasaRescate.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full primary-gradient rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(t.tasaRescate, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'amber' | 'blue' | 'rose' }) {
  const color =
    accent === 'emerald' ? 'text-emerald-400' :
    accent === 'amber'   ? 'text-amber-400'   :
    accent === 'blue'    ? 'text-cyan-400'     :
    accent === 'rose'    ? 'text-rose-400'     :
    'text-white';
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-600 font-medium">{label}</span>
      <span className={`text-[11px] font-black ${color}`}>{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStatsPage() {
  const [macro,        setMacro]        = useState<MacroMetrics | null>(null);
  const [tenantStats,  setTenantStats]  = useState<TenantStats[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAll() {
      try {
        // ── 1. RPC macro metrics (CEO-only) ─────────────────────────────────
        const { data: macroData, error: macroErr } = await supabase.rpc('get_admin_macro_metrics');
        if (macroErr) throw new Error(macroErr.message || 'Error de permisos en RPC');
        setMacro(macroData as MacroMetrics);

        // ── 2. Tenant name map: DB first, fallback to hardcoded registry ────
        const tenantNameMap: Record<string, string> = { ...KNOWN_TENANT_NAMES };

        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, name');

        if (tenantsData) {
          tenantsData.forEach((t: TenantRow) => {
            if (t.id && t.name) tenantNameMap[t.id] = t.name;
          });
        }

        // ── 3. Cross-tenant: no_completados (CEO RLS bypass) ────────────────
        const { data: carritosData } = await supabase
          .from('no_completados')
          .select('tenant_id, amount, status');

        // ── 4. Cross-tenant: conversation_insights (CEO RLS bypass) ─────────
        const { data: insightsData } = await supabase
          .from('conversation_insights')
          .select('tenant_id, csat_score, response_accuracy, escalation_required');

        // ── 5. Aggregate per tenant ─────────────────────────────────────────
        // Solo procesamos IDs con nombre confirmado en el mapa.
        // Cualquier UUID sin identidad verificada queda fuera de las cards
        // para evitar asignaciones incorrectas a clientes reales.
        const ADMIN_ID = 'd568b898-9942-47cd-b31e-5f0b1f34ab01';
        const confirmedIds = Object.keys(tenantNameMap).filter((id) => id !== ADMIN_ID);

        const stats: TenantStats[] = confirmedIds.map((tenantId) => {
          const carritos = (carritosData ?? []).filter((r: any) => r.tenant_id === tenantId);
          const insights = (insightsData  ?? []).filter((r: any) => r.tenant_id === tenantId);

          const recuperados = carritos.filter((r: any) => r.status === 'paid' || r.status === 'completed');
          const rescatados  = recuperados.length;
          const totalCarritos   = carritos.length;
          const totalRecuperado = recuperados.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
          const pendientes      = carritos.filter((r: any) => r.status === 'pending').length;
          const tasaRescate     = totalCarritos > 0 ? (rescatados / totalCarritos) * 100 : 0;

          const csatValues = insights.map((i: any) => i.csat_score).filter((v: any): v is number => v !== null);
          const accValues  = insights.map((i: any) => i.response_accuracy).filter((v: any): v is number => v !== null);

          return {
            tenantId,
            name:            tenantNameMap[tenantId], // siempre confirmado — nunca fallback genérico
            totalCarritos,
            rescatados,
            tasaRescate,
            totalRecuperado,
            pendientes,
            totalInsights:   insights.length,
            avgCsat:         avg(csatValues),
            avgAccuracy:     avg(accValues),
            escalaciones:    insights.filter((i: any) => i.escalation_required === true).length,
          };
        });

        // Sort by totalRecuperado descending
        stats.sort((a, b) => b.totalRecuperado - a.totalRecuperado);
        setTenantStats(stats);

      } catch (err: any) {
        console.error('Admin stats error:', err);
        setError(err.message || 'Error al cargar métricas de administrador');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Consultando métricas de todos los tenants…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 glass-panel border border-rose-500/20 text-center rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2 rounded-xl aurora-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (!macro) return null;

  // ── Totales globales ─────────────────────────────────────────────────────
  const globalCarritos    = tenantStats.reduce((a, t) => a + t.totalCarritos,    0);
  const globalRescatados  = tenantStats.reduce((a, t) => a + t.rescatados,       0);
  const globalRecuperado  = tenantStats.reduce((a, t) => a + t.totalRecuperado,  0);
  const globalInsights    = tenantStats.reduce((a, t) => a + t.totalInsights,    0);
  const globalEscalaciones = tenantStats.reduce((a, t) => a + t.escalaciones,   0);
  const tenantesActivos   = tenantStats.filter((t) => t.totalCarritos > 0).length;

  return (
    <div className="space-y-10 p-2 md:p-8 animate-in fade-in duration-700 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4" />
            Dashboard de Control CEO
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Alpha Macro Insights</h1>
          <p className="text-slate-400 mt-1 font-medium">Estado consolidado de <span className="text-white font-bold">{tenantStats.length}</span> clientes identificados en la plataforma.</p>
        </div>
        <div className="px-4 py-2 glass-panel border border-slate-800/50 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest rounded-xl">
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
          Actualizado: {new Date(macro.generated_at).toLocaleTimeString('es-CL')}
        </div>
      </div>

      {/* ── KPI Global Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <GlobalKPI
          icon={<TrendingUp className="w-5 h-5" />}
          title="Ingresos Consolidados"
          value={formatCLP(globalRecuperado || macro.total_ingresos)}
          sub={`${tenantesActivos} tenants con actividad`}
          accent="emerald"
        />
        <GlobalKPI
          icon={<Users className="w-5 h-5" />}
          title="Tenants Activos"
          value={tenantStats.length.toString()}
          sub={`${tenantesActivos} con carritos`}
          accent="purple"
        />
        <GlobalKPI
          icon={<ShoppingCart className="w-5 h-5" />}
          title="Carritos Totales"
          value={globalCarritos.toLocaleString('es-CL')}
          sub={`${globalRescatados} recuperados`}
          accent="blue"
        />
        <GlobalKPI
          icon={<Brain className="w-5 h-5" />}
          title="Sesiones IA"
          value={globalInsights.toLocaleString('es-CL')}
          sub={globalEscalaciones > 0 ? `${globalEscalaciones} escalaciones pendientes` : 'Sin escalaciones'}
          accent={globalEscalaciones > 0 ? 'rose' : 'amber'}
        />
      </div>

      {/* ── Per-Tenant Cards ── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Breakdown por Cliente</h2>
            <p className="text-[11px] text-slate-500">Ordenado por dinero recuperado · Haz clic en el ID para copiarlo</p>
          </div>
        </div>

        {tenantStats.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center border border-dashed border-slate-800/50">
            <p className="text-slate-600 font-medium">Sin datos de tenants disponibles todavía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tenantStats.map((t, i) => (
              <TenantCard key={t.tenantId} t={t} rank={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── Ranking de volumen (del RPC) + Salud del sistema ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ranking del RPC */}
        <div className="glass-panel p-8 lg:col-span-2 rounded-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ranking de Volumen</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pedidos procesados — fuente: RPC</p>
            </div>
          </div>
          <div className="space-y-4">
            {macro.ranking_tenants.map((tenant, idx) => (
              <div key={tenant.name} className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-600 bg-slate-800/50 w-5 h-5 flex items-center justify-center rounded-full">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{tenant.name}</span>
                  </div>
                  <span className="text-xs font-black text-primary">
                    {tenant.volumen_pedidos} <span className="text-slate-500 font-bold uppercase tracking-tighter text-[9px]">pedidos</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                  <div
                    className="h-full primary-gradient shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000 ease-out"
                    style={{
                      width: `${(tenant.volumen_pedidos / (macro.ranking_tenants[0]?.volumen_pedidos || 1)) * 100}%`,
                      transitionDelay: `${idx * 150}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
            {macro.ranking_tenants.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-6">El RPC no devolvió ranking de tenants.</p>
            )}
          </div>
        </div>

        {/* Salud + Macro Summary */}
        <div className="space-y-5">
          {/* Health status */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Salud Técnica</h3>
                {macro.health_status.length === 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-500 font-bold">Todos los sistemas OK</span>
                  </div>
                )}
              </div>
            </div>
            {macro.health_status.length > 0 ? (
              <div className="space-y-2">
                {macro.health_status.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-500/60" />
                      <span className="text-xs font-bold text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-rose-500">{item.errores_detectados}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center border-2 border-dashed border-slate-800/50 rounded-xl">
                <p className="text-slate-600 text-xs italic">No se detectaron errores críticos.</p>
              </div>
            )}
          </div>

          {/* Macro summary */}
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tasa Global</span>
              <span className="text-xl font-black text-white">
                {globalCarritos > 0 ? `${((globalRescatados / globalCarritos) * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">CSAT Promedio</span>
              <span className="text-xl font-black text-white">
                {(() => {
                  const allCsat = tenantStats.flatMap((t) => t.avgCsat !== null ? [t.avgCsat] : []);
                  return allCsat.length ? `${Math.round((allCsat.reduce((a, b) => a + b, 0) / allCsat.length) * 100)}%` : '—';
                })()}
              </span>
            </div>
            <button className="w-full py-3 rounded-xl aurora-gradient text-white font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              Exportar Reporte Global <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Global KPI card ──────────────────────────────────────────────────────────

function GlobalKPI({
  icon, title, value, sub, accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  accent: 'emerald' | 'purple' | 'blue' | 'amber' | 'rose';
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple:  'bg-violet-500/10  text-violet-400  border-violet-500/20',
    blue:    'bg-cyan-500/10    text-cyan-400    border-cyan-500/20',
    amber:   'bg-amber-500/10   text-amber-400   border-amber-500/20',
    rose:    'bg-rose-500/10    text-rose-400    border-rose-500/20',
  };
  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/[0.03] hover:border-white/[0.07] transition-all space-y-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[accent]}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="text-[11px] text-slate-600 font-medium">{sub}</p>
      </div>
    </div>
  );
}
