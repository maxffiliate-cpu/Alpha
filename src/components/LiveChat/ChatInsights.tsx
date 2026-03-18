'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Smile, 
  Target, 
  Activity, 
  Frown,
  Meh,
  Star,
  Loader2,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface ChatInsightsProps {
  sessionId: string | null;
  conversationContext?: string;
}

interface Insights {
  session_id: string;
  sentiment: string | null;
  sentiment_score: number | null;
  user_intent: string | null;
  csat_score: number | null;
  response_accuracy: number | null;
  response_urgency: number | null;
  status: string;
}

const N8N_INSIGHTS_WEBHOOK = 'https://n8n.srv941923.hstgr.cloud/webhook/polaris-analisis-conversacion';

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <Meh className="w-3.5 h-3.5 text-slate-500" />;
  const s = sentiment.toLowerCase();
  if (s.includes('positiv')) return <Smile className="w-3.5 h-3.5 text-emerald-500" />;
  if (s.includes('negativ')) return <Frown className="w-3.5 h-3.5 text-rose-500" />;
  return <Meh className="w-3.5 h-3.5 text-amber-500" />;
}

function SentimentColor(sentiment: string | null) {
  if (!sentiment) return '#64748b';
  const s = sentiment.toLowerCase();
  if (s.includes('positiv')) return '#10b981';
  if (s.includes('negativ')) return '#f43f5e';
  return '#f59e0b';
}

function CircleGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value)}
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute text-xs font-black text-white">{Math.round(value * 100)}%</span>
      </div>
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">{label}</span>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-slate-800/60 animate-pulse rounded-lg ${className}`} />;
}

export default function ChatInsights({ sessionId, conversationContext }: ChatInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setInsights(null);
      return;
    }

    setLoading(true);

    // 1. Fetch current insights (or create pending row)
    async function initInsights() {
      const phone = sessionId!.split('@')[0];

      // Upsert to create the row if it doesn't exist
      const { data: existing } = await supabase
        .from('conversation_insights')
        .select('*')
        .eq('session_id', phone)
        .single();

      if (existing) {
        setInsights(existing);
        setLoading(false);
        // If pending/context changed, re-trigger analysis
        if (existing.status !== 'analyzed' && conversationContext) {
          triggerAnalysis(phone, conversationContext);
        }
      } else if (conversationContext) {
        // Insert pending row and trigger analysis
        await supabase.from('conversation_insights').insert({
          session_id: phone,
          conversation_context: conversationContext,
          status: 'pending'
        });
        setInsights({ session_id: phone, sentiment: null, sentiment_score: null, user_intent: null, csat_score: null, response_accuracy: null, response_urgency: null, status: 'pending' });
        setLoading(false);
        triggerAnalysis(phone, conversationContext);
      } else {
        setLoading(false);
      }
    }

    initInsights();

    // 2. Realtime subscription
    const phone = sessionId.split('@')[0];
    const channel = supabase
      .channel(`insights:${phone}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_insights',
        filter: `session_id=eq.${phone}`
      }, (payload) => {
        setInsights(payload.new as Insights);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Re-trigger when conversation context grows
  useEffect(() => {
    if (!sessionId || !conversationContext) return;
    const phone = sessionId.split('@')[0];
    triggerAnalysis(phone, conversationContext);
  }, [conversationContext]);

  async function triggerAnalysis(phone: string, context: string) {
    try {
      const contextJson = JSON.parse(context); // Parse to object for JSONB column

      // Update context in DB first
      await supabase.from('conversation_insights').upsert({
        session_id: phone,
        conversation_context: contextJson,
        status: 'pending'
      }, { onConflict: 'session_id' });

      // POST to n8n with structured JSON
      await fetch(N8N_INSIGHTS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: phone, conversation_context: contextJson })
      });
    } catch (e) {
      console.error('[Alpha] Error al enviar contexto al webhook de análisis:', e);
    }
  }

  if (!sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6 text-slate-600 bg-[#030711]">
        <div className="p-8 rounded-full bg-slate-900/20 border border-slate-800/30">
          <Activity className="w-12 h-12 text-slate-800" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-slate-400">Sin Sesión Seleccionada</p>
          <p className="text-xs max-w-[200px] leading-relaxed">Selecciona un chat para ver insights de IA en vivo y análisis de la conversación.</p>
        </div>
      </div>
    );
  }

  const isPending = !insights || insights.status !== 'analyzed';
  const sentimentColor = SentimentColor(insights?.sentiment ?? null);
  const sentimentScore = insights?.sentiment_score ?? 0;

  return (
    <div className="h-full flex flex-col bg-[#030711] animate-in slide-in-from-right-8 duration-700">
      <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="text-primary w-5 h-5" /> Insights del Chat
          </h2>
          {isPending && (
            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold tracking-wider uppercase flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Analizando
            </span>
          )}
          {!isPending && (
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold tracking-wider uppercase">
              EN VIVO
            </span>
          )}
        </div>

        {/* Sentiment Card */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Análisis de Sentimiento</span>
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <SentimentIcon sentiment={insights?.sentiment ?? null} />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-24 overflow-hidden">
              <svg className="w-full h-full transform translate-y-2">
                <path d="M 10 90 A 80 80 0 0 1 182 90" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                <path
                  d="M 10 90 A 80 80 0 0 1 182 90"
                  fill="none"
                  stroke={sentimentColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="270"
                  strokeDashoffset={270 * (1 - sentimentScore)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
            <div className="text-center">
              {isPending ? (
                <>
                  <SkeletonBlock className="w-28 h-8 mx-auto mb-2" />
                  <SkeletonBlock className="w-40 h-3 mx-auto" />
                </>
              ) : (
                <>
                  <p className="text-3xl font-black text-white tracking-tight uppercase italic">{insights?.sentiment ?? '—'}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Puntuación: {insights?.sentiment_score != null ? `${Math.round(insights.sentiment_score * 100)}%` : '—'}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Intent + CSAT */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-5 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Intención del Usuario</span>
            {isPending ? (
              <>
                <SkeletonBlock className="w-20 h-6" />
                <SkeletonBlock className="w-full h-1.5 rounded-full mt-2" />
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-white tracking-tight">{insights?.user_intent ?? '—'}</p>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '80%' }} />
                </div>
              </>
            )}
          </div>
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-5 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Puntuación CSAT</span>
            {isPending ? (
              <>
                <SkeletonBlock className="w-16 h-6" />
                <SkeletonBlock className="w-full h-1.5 rounded-full mt-2" />
              </>
            ) : (
              <>
                <div className="flex items-end gap-1.5">
                  <p className="text-xl font-bold text-white tracking-tight">
                    {insights?.csat_score != null ? `${insights.csat_score.toFixed(1)}/5.0` : '—'}
                  </p>
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mb-1" />
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-1000"
                    style={{ width: `${((insights?.csat_score ?? 0) / 5) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Response Dynamics */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Dinámica de Respuesta</span>
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            {isPending ? (
              <>
                <div className="flex flex-col items-center gap-3">
                  <SkeletonBlock className="w-16 h-16 rounded-full" />
                  <SkeletonBlock className="w-16 h-3" />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <SkeletonBlock className="w-16 h-16 rounded-full" />
                  <SkeletonBlock className="w-16 h-3" />
                </div>
              </>
            ) : (
              <>
                <CircleGauge value={insights?.response_accuracy ?? 0} color="#3b82f6" label="Precisión" />
                <CircleGauge value={insights?.response_urgency ?? 0} color="#f43f5e" label="Urgencia" />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
