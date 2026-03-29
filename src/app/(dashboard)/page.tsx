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
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalRecuperado: number;
  rescatados: number;
  totalCarritos: number;
  tasaConversion: number;
  pendientes: number;
  ultimosCarritos: RecentCart[];
}

interface RecentCart {
  commerce_order: string;
  buyer_name: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  paid:       { label: 'Recuperado',  color: 'text-emerald-400', dot: 'bg-emerald-500' },
  completed:  { label: 'Recuperado',  color: 'text-emerald-400', dot: 'bg-emerald-500' },
  pending:    { label: 'Pendiente',   color: 'text-amber-400',   dot: 'bg-amber-500'   },
  abandoned:  { label: 'Abandonado',  color: 'text-rose-400',    dot: 'bg-rose-500'    },
  cancelled:  { label: 'Cancelado',   color: 'text-slate-500',   dot: 'bg-slate-600'   },
};

function getStatus(s: string | null) {
  return STATUS_CONFIG[s ?? ''] ?? { label: s ?? '—', color: 'text-slate-400', dot: 'bg-slate-600' };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRecuperado: 0,
    rescatados: 0,
    totalCarritos: 0,
    tasaConversion: 0,
    pendientes: 0,
    ultimosCarritos: [],
  });
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient();

      // 1. Obtener tenant_id del JWT — fuente de verdad del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.app_metadata?.tenant_id as string | undefined;
      setTenantName(user?.app_metadata?.tenant_name || user?.email?.split('@')[0] || '');

      if (!tenantId) {
        setLoading(false);
        return;
      }

      // 2. Fetch de no_completados filtrado EXCLUSIVAMENTE por tenant_id
      //    El RLS también lo garantiza, pero el filtro explícito es la Regla de Oro.
      const { data, error } = await supabase
        .from('no_completados')
        .select('commerce_order, buyer_name, amount, status, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setLoading(false);
        return;
      }

      // 3. Calcular métricas en cliente (datos ya filtrados por tenant)
      const totalCarritos = data.length;

      const recuperados = data.filter(
        (r) => r.status === 'paid' || r.status === 'completed'
      );
      const rescatados = recuperados.length;

      const totalRecuperado = recuperados.reduce(
        (acc, r) => acc + (Number(r.amount) || 0),
        0
      );

      const pendientes = data.filter((r) => r.status === 'pending').length;

      const tasaConversion =
        totalCarritos > 0 ? (rescatados / totalCarritos) * 100 : 0;

      const ultimosCarritos: RecentCart[] = data.slice(0, 7);

      setStats({
        totalRecuperado,
        rescatados,
        totalCarritos,
        tasaConversion,
        pendientes,
        ultimosCarritos,
      });
      setLoading(false);
    }

    fetchDashboard();
  }, []);

  return (
    <div className="p-8 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* ── Header ── */}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Panel de Control
        </h1>
        <p className="text-slate-400 font-medium">
          {loading ? 'Cargando métricas...' : `Resumen de actividad${tenantName ? ` · ${tenantName}` : ''}`}
        </p>
      </header>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Dinero Recuperado"
          value={formatCLP(stats.totalRecuperado)}
          sub="Suma de carritos pagados"
          icon={<DollarSign className="w-5 h-5" />}
          accent="emerald"
          loading={loading}
        />
        <StatCard
          title="Carritos Rescatados"
          value={stats.rescatados.toString()}
          sub={`de ${stats.totalCarritos} carritos totales`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="blue"
          loading={loading}
        />
        <StatCard
          title="Tasa de Conversión"
          value={`${stats.tasaConversion.toFixed(1)}%`}
          sub="Rescatados / Total"
          icon={<TrendingUp className="w-5 h-5" />}
          accent="purple"
          loading={loading}
        />
        <StatCard
          title="Pendientes de Seguimiento"
          value={stats.pendientes.toString()}
          sub="En proceso del bot"
          icon={<Clock className="w-5 h-5" />}
          accent="amber"
          loading={loading}
        />
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimos Carritos */}
        <section className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border border-white/[0.03]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Últimos Carritos
              </h2>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              En tiempo real
            </span>
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
                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot} shadow-[0_0_6px_rgba(255,255,255,0.2)]`} />
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

        {/* Panel derecho */}
        <div className="space-y-5">
          {/* Resumen del motor */}
          <section className="glass-panel rounded-2xl p-6 border border-white/[0.03] space-y-5">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-white tracking-tight">Estado del Motor</h2>
            </div>
            <div className="space-y-3">
              <MotorRow label="Total de Carritos" value={loading ? '—' : stats.totalCarritos.toString()} />
              <MotorRow label="Carritos Recuperados" value={loading ? '—' : stats.rescatados.toString()} accent="emerald" />
              <MotorRow label="Pendientes Activos" value={loading ? '—' : stats.pendientes.toString()} accent="amber" />
              <MotorRow
                label="Tasa de Éxito"
                value={loading ? '—' : `${stats.tasaConversion.toFixed(1)}%`}
                accent={stats.tasaConversion >= 20 ? 'emerald' : 'amber'}
              />
            </div>
          </section>

          {/* Acciones rápidas */}
          <section className="glass-panel rounded-2xl p-6 border border-white/[0.03] space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight">Acciones Rápidas</h2>
            <div className="space-y-2.5">
              <QuickAction label="Ver Recuperador de Carritos" href="/recuperador" />
              <QuickAction label="Gestionar Chats en Vivo" href="/conversations" />
              <QuickAction label="Ajustes del Agente IA" href="/settings" />
            </div>
          </section>

          {/* Alerta si hay pendientes */}
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
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/[0.03] hover:border-white/[0.07] transition-all group space-y-4">
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
  accent?: 'emerald' | 'amber';
}) {
  const valueColor = accent === 'emerald'
    ? 'text-emerald-400'
    : accent === 'amber'
    ? 'text-amber-400'
    : 'text-white';

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
