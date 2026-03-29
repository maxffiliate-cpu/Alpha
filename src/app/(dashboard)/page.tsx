'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Skeleton from '@/components/ui/Skeleton';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  MessageSquare,
  Zap,
  Target,
  Star,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function moda(arr: string[]): string | null {
  if (!arr.length) return null;
  const freq: Record<string, number> = {};
  arr.forEach((v) => { freq[v] = (freq[v] ?? 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function truncate(text: string, words = 15): string {
  const parts = text.trim().split(/\s+/);
  return parts.length <= words ? text : parts.slice(0, words).join(' ') + '…';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  // Recuperador
  totalRecuperado: number;
  rescatados: number;
  totalCarritos: number;
  tasaRescate: number;
  pendientes: number;
  ultimosCarritos: RecentCart[];
  // IA
  avgCsat: number | null;
  avgAccuracy: number | null;
  totalInsights: number;
  escalaciones: number;
  sentimientoPredominante: string | null;
  ultimosInsights: string[];
  mensajesProcesados: number;
}

interface RecentCart {
  commerce_order: string;
  buyer_name: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  paid:      { label: 'Recuperado', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  completed: { label: 'Recuperado', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  pending:   { label: 'Pendiente',  color: 'text-amber-400',   dot: 'bg-amber-500'   },
  abandoned: { label: 'Abandonado', color: 'text-rose-400',    dot: 'bg-rose-500'    },
  cancelled: { label: 'Cancelado',  color: 'text-slate-500',   dot: 'bg-slate-600'   },
};

function getStatus(s: string | null) {
  return STATUS_CONFIG[s ?? ''] ?? { label: s ?? '—', color: 'text-slate-400', dot: 'bg-slate-600' };
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  excelente: { label: 'Excelente',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  bueno:     { label: 'Bueno',      color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20'     },
  neutral:   { label: 'Neutral',    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'     },
  malo:      { label: 'Negativo',   color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20'       },
};

function getSentiment(s: string | null) {
  const key = Object.keys(SENTIMENT_CONFIG).find((k) => s?.toLowerCase().includes(k)) ?? 'neutral';
  return SENTIMENT_CONFIG[key];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRecuperado: 0, rescatados: 0, totalCarritos: 0,
    tasaRescate: 0, pendientes: 0, ultimosCarritos: [],
    avgCsat: null, avgAccuracy: null, totalInsights: 0,
    escalaciones: 0, sentimientoPredominante: null,
    ultimosInsights: [], mensajesProcesados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id as string | undefined;
      setTenantName(user?.app_metadata?.tenant_name || user?.email?.split('@')[0] || '');

      if (!tenantId) { setLoading(false); return; }

      // ── Fetches paralelos ───────────────────────────────────────────────────
      const [
        { data: carritosData },
        { data: insightsData },
        { count: mensajesCount },
      ] = await Promise.all([
        supabase
          .from('no_completados')
          .select('commerce_order, buyer_name, amount, status, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversation_insights')
          .select('csat_score, response_accuracy, sentiment, escalation_required, actionable_insight, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('n8n_chat_clientes_historial')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
      ]);

      // ── Métricas Recuperador ────────────────────────────────────────────────
      const carritos = carritosData ?? [];
      const totalCarritos = carritos.length;
      const recuperados = carritos.filter((r) => r.status === 'paid' || r.status === 'completed');
      const rescatados = recuperados.length;
      const totalRecuperado = recuperados.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      const pendientes = carritos.filter((r) => r.status === 'pending').length;
      const tasaRescate = totalCarritos > 0 ? (rescatados / totalCarritos) * 100 : 0;
      const ultimosCarritos: RecentCart[] = carritos.slice(0, 8);

      // ── Métricas IA ─────────────────────────────────────────────────────────
      const insights = insightsData ?? [];
      const totalInsights = insights.length;

      const csatValues = insights.map((i) => i.csat_score).filter((v): v is number => v !== null);
      const avgCsat = csatValues.length > 0
        ? csatValues.reduce((a, b) => a + b, 0) / csatValues.length
        : null;

      const accValues = insights.map((i) => i.response_accuracy).filter((v): v is number => v !== null);
      const avgAccuracy = accValues.length > 0
        ? accValues.reduce((a, b) => a + b, 0) / accValues.length
        : null;

      const sentimientos = insights.map((i) => i.sentiment).filter((v): v is string => !!v);
      const sentimientoPredominante = moda(sentimientos);

      const escalaciones = insights.filter((i) => i.escalation_required === true).length;

      const ultimosInsights = insights
        .map((i) => i.actionable_insight)
        .filter((v): v is string => !!v && v.trim().length > 0)
        .slice(0, 3)
        .map((t) => truncate(t, 15));

      setStats({
        totalRecuperado, rescatados, totalCarritos, tasaRescate,
        pendientes, ultimosCarritos, avgCsat, avgAccuracy,
        totalInsights, escalaciones, sentimientoPredominante,
        ultimosInsights, mensajesProcesados: mensajesCount ?? 0,
      });
      setLoading(false);
    }

    fetchDashboard();
  }, []);

  const sentStyle = getSentiment(stats.sentimientoPredominante);

  return (
    <div className="p-8 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">

      {/* ── Header ── */}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-black tracking-tight text-white">Panel de Control</h1>
        <p className="text-slate-400 font-medium">
          {loading ? 'Cargando métricas...' : `Resumen de actividad${tenantName ? ` · ${tenantName}` : ''}`}
        </p>
      </header>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Dinero Recuperado"
          value={formatCLP(stats.totalRecuperado)}
          sub={`${stats.rescatados} carritos pagados`}
          icon={<DollarSign className="w-5 h-5" />}
          accent="emerald"
          loading={loading}
        />
        <StatCard
          title="Tasa de Rescate"
          value={`${stats.tasaRescate.toFixed(1)}%`}
          sub={`de ${stats.totalCarritos} carritos totales`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="purple"
          loading={loading}
        />
        <StatCard
          title="Satisfacción IA (CSAT)"
          value={stats.avgCsat !== null ? `${Math.round(stats.avgCsat * 100)}%` : '—'}
          sub={`sobre ${stats.totalInsights} conversaciones`}
          icon={<Star className="w-5 h-5" />}
          accent="blue"
          loading={loading}
        />
        <StatCard
          title="Precisión de IA"
          value={stats.avgAccuracy !== null ? `${Math.round(stats.avgAccuracy * 100)}%` : '—'}
          sub="Exactitud de respuestas"
          icon={<Target className="w-5 h-5" />}
          accent="amber"
          loading={loading}
        />
      </div>

      {/* ── Panel BI ── */}
      <section className="glass-panel rounded-2xl border border-white/[0.03] overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.04]">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-white tracking-tight">Inteligencia de Negocio</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
          {/* Sentimiento */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sentimiento Predominante</p>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : stats.sentimientoPredominante ? (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${sentStyle.bg} ${sentStyle.color}`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                {sentStyle.label}
              </span>
            ) : (
              <span className="text-sm text-slate-600 font-medium">Sin datos aún</span>
            )}
            <p className="text-[11px] text-slate-600">Basado en {stats.totalInsights} sesiones analizadas</p>
          </div>

          {/* Escalaciones */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alertas de Escalamiento</p>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-black ${stats.escalaciones > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {stats.escalaciones}
                </span>
                <span className="text-xs text-slate-500 mb-1 font-medium">
                  {stats.escalaciones === 1 ? 'sesión requiere atención' : 'sesiones requieren atención'}
                </span>
              </div>
            )}
            {!loading && stats.escalaciones > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-400/70 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Revisar en Conversaciones
              </div>
            )}
          </div>

          {/* Últimos Insights */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Últimos Insights Accionables</p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : stats.ultimosInsights.length === 0 ? (
              <p className="text-sm text-slate-600 font-medium">Sin insights disponibles</p>
            ) : (
              <ul className="space-y-2">
                {stats.ultimosInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Content Grid: 60/40 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Últimos Carritos — 60% */}
        <section className="lg:col-span-3 glass-panel rounded-2xl overflow-hidden border border-white/[0.03]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-white tracking-tight">Últimos Carritos</h2>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tiempo real</span>
          </div>

          <div className="divide-y divide-white/[0.03]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))
            ) : stats.ultimosCarritos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
                <ShoppingCart className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Sin carritos registrados aún</p>
                <p className="text-xs opacity-70">Los datos aparecerán cuando el bot reciba pedidos</p>
              </div>
            ) : (
              stats.ultimosCarritos.map((cart, i) => {
                const st = getStatus(cart.status);
                return (
                  <div
                    key={`${cart.commerce_order}-${i}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {cart.buyer_name || 'Cliente Anónimo'}
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider truncate">
                        #{cart.commerce_order}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">
                        {cart.amount ? formatCLP(Number(cart.amount)) : '—'}
                      </p>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium shrink-0 min-w-[48px] text-right">
                      {timeAgo(cart.created_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Estado del Motor IA — 40% */}
        <div className="lg:col-span-2 space-y-5">

          {/* Motor IA */}
          <section className="glass-panel rounded-2xl p-6 border border-white/[0.03] space-y-4">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-white tracking-tight">Estado del Motor IA</h2>
            </div>
            <div className="space-y-1">
              <MotorRow label="Mensajes procesados"   value={loading ? '—' : stats.mensajesProcesados.toLocaleString('es-CL')} />
              <MotorRow label="Conversaciones analizadas" value={loading ? '—' : stats.totalInsights.toString()} />
              <MotorRow label="CSAT promedio"         value={loading ? '—' : stats.avgCsat !== null ? `${Math.round(stats.avgCsat * 100)}%` : '—'} accent="blue" />
              <MotorRow label="Precisión promedio"    value={loading ? '—' : stats.avgAccuracy !== null ? `${Math.round(stats.avgAccuracy * 100)}%` : '—'} accent={stats.avgAccuracy !== null && stats.avgAccuracy >= 0.75 ? 'emerald' : 'amber'} />
              <MotorRow label="Escalaciones activas"  value={loading ? '—' : stats.escalaciones.toString()} accent={stats.escalaciones > 0 ? 'rose' : undefined} />
            </div>
          </section>

          {/* Recuperador */}
          <section className="glass-panel rounded-2xl p-6 border border-white/[0.03] space-y-4">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-white tracking-tight">Estado del Recuperador</h2>
            </div>
            <div className="space-y-1">
              <MotorRow label="Total de carritos"     value={loading ? '—' : stats.totalCarritos.toString()} />
              <MotorRow label="Carritos recuperados"  value={loading ? '—' : stats.rescatados.toString()} accent="emerald" />
              <MotorRow label="Pendientes activos"    value={loading ? '—' : stats.pendientes.toString()} accent="amber" />
              <MotorRow label="Tasa de rescate"       value={loading ? '—' : `${stats.tasaRescate.toFixed(1)}%`} accent={stats.tasaRescate >= 20 ? 'emerald' : 'amber'} />
            </div>
          </section>

          {/* Acciones rápidas */}
          <section className="glass-panel rounded-2xl p-6 border border-white/[0.03] space-y-3">
            <h2 className="text-base font-bold text-white tracking-tight">Acciones Rápidas</h2>
            <div className="space-y-2">
              <QuickAction label="Ver Recuperador de Carritos" href="/recuperador" />
              <QuickAction label="Gestionar Chats en Vivo"     href="/conversations" />
              <QuickAction label="Ajustes del Agente IA"       href="/settings" />
            </div>
          </section>

          {/* Alerta escalaciones */}
          {!loading && stats.escalaciones > 0 && (
            <div className="rounded-2xl p-4 bg-rose-500/5 border border-rose-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-rose-400 uppercase tracking-widest">
                  {stats.escalaciones} sesión{stats.escalaciones > 1 ? 'es' : ''} sin resolver
                </p>
                <p className="text-[10px] text-rose-400/60 font-medium mt-0.5">
                  El agente requiere intervención humana.
                </p>
              </div>
            </div>
          )}

          {/* Alerta carritos pendientes */}
          {!loading && stats.pendientes > 0 && (
            <div className="rounded-2xl p-4 bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                  {stats.pendientes} carrito{stats.pendientes > 1 ? 's' : ''} en seguimiento
                </p>
                <p className="text-[10px] text-amber-400/60 font-medium mt-0.5">
                  El bot está procesando estos carritos activamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon, accent, loading,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: 'emerald' | 'blue' | 'purple' | 'amber';
  loading?: boolean;
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    purple:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/[0.03] hover:border-white/[0.07] transition-all space-y-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[accent]}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-28 mt-1" />
        ) : (
          <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        )}
        <p className="text-[11px] text-slate-600 font-medium">{sub}</p>
      </div>
    </div>
  );
}

function MotorRow({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'amber' | 'blue' | 'rose';
}) {
  const valueColor =
    accent === 'emerald' ? 'text-emerald-400' :
    accent === 'amber'   ? 'text-amber-400'   :
    accent === 'blue'    ? 'text-cyan-400'     :
    accent === 'rose'    ? 'text-rose-400'     :
    'text-white';

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={`text-sm font-black ${valueColor}`}>{value}</span>
    </div>
  );
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-white/[0.04] hover:border-white/[0.08] text-slate-300 hover:text-white transition-all group"
    >
      <span className="text-xs font-semibold">{label}</span>
      <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
    </a>
  );
}
