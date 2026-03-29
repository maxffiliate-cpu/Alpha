'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  Zap,
  Loader2,
  AlertTriangle,
  Star,
  Target,
  MessageCircle,
} from 'lucide-react';

interface ChatInsightsProps {
  sessionId: string | null;
}

interface Insights {
  session_id: string;
  sentiment: string | null;
  sentiment_score: number | null;
  user_intent: string | null;
  csat_score: number | null;
  response_accuracy: number | null;
  response_urgency: string | null;
  escalation_required: boolean | null;
  actionable_insight: string | null;
  status: string;
}

function SentimentColor(sentiment: string | null): string {
  if (!sentiment) return '#a78bfa';
  const s = sentiment.toLowerCase();
  if (s.includes('excelente')) return '#10b981';
  if (s.includes('bueno')) return '#34d399';
  if (s.includes('malo')) return '#f43f5e';
  return '#f59e0b';
}

function DonutGauge({ value, color, label, center }: { value: number; color: string; label: string; center?: React.ReactNode }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f3" className="dark:stroke-slate-800" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, value)))}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {center}
        </div>
      </div>
      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">{label}</span>
    </div>
  );
}

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-semibold text-[var(--foreground)] opacity-70">{label}</span>
        <span className="text-[11px] font-bold text-[var(--foreground)]">{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full h-2 bg-[#eef1f3] dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`bg-[#eef1f3] dark:bg-slate-800/60 animate-pulse rounded-lg ${className}`} />;
}

function StarsRating({ score, max = 5 }: { score: number | null; max?: number }) {
  const filled = Math.round(score ?? 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < filled ? 'text-amber-400 fill-amber-400' : 'text-[#eef1f3] dark:text-slate-700 fill-[#eef1f3] dark:fill-slate-700'}`}
        />
      ))}
    </div>
  );
}

export default function ChatInsights({ sessionId }: ChatInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    if (!sessionId) { setInsights(null); return; }

    const phone = sessionId.split('@')[0];

    async function loadInsights() {
      const { data } = await supabase
        .from('conversation_insights')
        .select('*')
        .eq('session_id', phone)
        .single();
      if (data) setInsights(data);
    }
    loadInsights();

    const channel = supabase
      .channel(`insights:${phone}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_insights',
        filter: `session_id=eq.${phone}`
      }, (payload) => { setInsights(payload.new as Insights); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900/40 border border-[var(--border)] flex items-center justify-center shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
          <Activity className="w-7 h-7 text-primary opacity-30" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-[var(--foreground)]">Sin Sesión</p>
          <p className="text-xs text-[var(--text-muted)] max-w-[180px] leading-relaxed">
            Selecciona un chat para ver los insights de IA en vivo.
          </p>
        </div>
      </div>
    );
  }

  const isPending = !insights || insights.status !== 'analyzed';
  const sentimentColor = SentimentColor(insights?.sentiment ?? null);
  const sentimentScore = insights?.sentiment_score ?? 0;

  return (
    <div className="h-full flex flex-col overflow-y-auto animate-in slide-in-from-right-6 duration-500">
      <div className="p-5 space-y-4 pb-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Insights del Chat
          </h2>
          {isPending ? (
            <span className="flex items-center gap-1 text-[9px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-bold tracking-wider uppercase border border-amber-200 dark:border-amber-500/20">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Analizando
            </span>
          ) : (
            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full font-bold tracking-wider uppercase border border-emerald-200 dark:border-emerald-500/20">
              EN VIVO
            </span>
          )}
        </div>

        {/* ── Escalation Alert ── */}
        {!isPending && insights?.escalation_required && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-[11px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-widest">Atención Requerida</p>
              <p className="text-[10px] text-rose-500/80 dark:text-rose-400/70 font-medium mt-0.5 leading-relaxed">Situación que requiere intervención humana urgente.</p>
            </div>
          </div>
        )}

        {/* ── Sentiment Donut ── */}
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-5 space-y-4 shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.18em] block">Análisis de Sentimiento</span>
          <div className="flex flex-col items-center">
            {isPending ? (
              <div className="flex flex-col items-center gap-3">
                <SkeletonLine className="w-28 h-28 rounded-full" />
                <SkeletonLine className="w-24 h-5" />
              </div>
            ) : (
              <DonutGauge
                value={sentimentScore}
                color={sentimentColor}
                label={insights?.sentiment ?? '—'}
                center={
                  <span className="text-lg font-black text-[var(--foreground)]">
                    {Math.round(sentimentScore * 100)}%
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* ── Intent + CSAT ── */}
        <div className="grid grid-cols-1 gap-3">
          {/* Intent */}
          <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Intención</span>
            </div>
            {isPending ? (
              <SkeletonLine className="w-3/4 h-5" />
            ) : (
              <p className="text-sm font-bold text-[var(--foreground)] leading-snug">
                {insights?.user_intent ?? '—'}
              </p>
            )}
          </div>

          {/* CSAT */}
          <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Satisfacción</span>
            </div>
            {isPending ? (
              <SkeletonLine className="w-24 h-5" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-[var(--foreground)]">
                    {insights?.csat_score != null ? insights.csat_score.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">/ 5</span>
                </div>
                <StarsRating score={insights?.csat_score ?? null} />
              </div>
            )}
          </div>
        </div>

        {/* ── Response Dynamics ── */}
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-5 space-y-4 shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Dinámica</span>
            </div>
            {!isPending && insights?.response_urgency && (
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                insights.response_urgency === 'Muy Alta'
                  ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : insights.response_urgency === 'Alta'
                  ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'bg-violet-100 dark:bg-primary/10 text-violet-700 dark:text-violet-400'
              }`}>
                {insights.response_urgency}
              </span>
            )}
          </div>

          {isPending ? (
            <div className="space-y-3">
              <SkeletonLine className="w-full h-3" />
              <SkeletonLine className="w-full h-3" />
            </div>
          ) : (
            <div className="space-y-3">
              <ProgressBar value={insights?.response_accuracy ?? 0} color="#8B5CF6" label="Precisión IA" />
              <ProgressBar value={insights?.sentiment_score ?? 0} color="#10b981" label="Empatía" />
            </div>
          )}
        </div>

        {/* ── Actionable Insight ── */}
        {!isPending && insights?.actionable_insight && (
          <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 space-y-3 shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Recomendación BI</span>
            </div>
            <p className="text-[12px] text-[var(--foreground)] opacity-80 font-medium italic leading-relaxed">
              &ldquo;{insights.actionable_insight}&rdquo;
            </p>
          </div>
        )}

        {/* ── Alpha Status Card ── */}
        <div className="rounded-2xl p-5 aurora-gradient text-white space-y-2 shadow-[0_10px_20px_-5px_rgba(139,92,246,0.35)]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 opacity-80" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Control Alpha</span>
          </div>
          <p className="text-sm font-bold leading-snug">
            {isPending
              ? 'Esperando análisis de la conversación...'
              : insights?.escalation_required
              ? 'Requiere intervención humana'
              : 'Agente IA operando correctamente'}
          </p>
          <div className="flex items-center gap-1.5 opacity-70">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">En tiempo real</span>
          </div>
        </div>

      </div>
    </div>
  );
}
