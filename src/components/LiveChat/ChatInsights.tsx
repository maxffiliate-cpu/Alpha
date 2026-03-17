'use client';

import React from 'react';
import { 
  BarChart, 
  Smile, 
  Target, 
  TrendingUp, 
  Activity, 
  Download,
  Frown,
  Meh,
  Zap,
  Star
} from 'lucide-react';

interface ChatInsightsProps {
  sessionId: string | null;
}

export default function ChatInsights({ sessionId }: ChatInsightsProps) {
  if (!sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6 text-slate-600 bg-[#030711]">
        <div className="p-8 rounded-full bg-slate-900/20 border border-slate-800/30">
          <Activity className="w-12 h-12 text-slate-800" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-slate-400">No Session Selected</p>
          <p className="text-xs max-w-[200px] leading-relaxed">Select a chat to view live AI insights and lead scoring analysis.</p>
        </div>
      </div>
    );
  }

  // Mock data
  const sentiment = 82;
  const score = "4.8/5.0";
  const activityData = [35, 60, 40, 85, 75, 45, 95];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="h-full flex flex-col bg-[#030711] animate-in slide-in-from-right-8 duration-700">
      <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-12">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Activity className="text-primary w-5 h-5 pulse-icon" /> Chat Insights
        </h2>

        {/* Sentiment Card */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Sentiment Analysis</span>
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Smile className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-24 overflow-hidden">
                <svg className="w-full h-full transform translate-y-2">
                    <path 
                        d="M 10 90 A 80 80 0 0 1 182 90" 
                        fill="none" 
                        stroke="#1e293b" 
                        strokeWidth="12" 
                        strokeLinecap="round" 
                    />
                    <path 
                        d="M 10 90 A 80 80 0 0 1 182 90" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="12" 
                        strokeLinecap="round"
                        strokeDasharray="270"
                        strokeDashoffset={270 * (1 - sentiment/100)}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
            </div>
            <div className="text-center">
                <p className="text-3xl font-black text-white tracking-tight uppercase italic underline-offset-4 decoration-primary/30">Positive</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">Highly cooperative customer</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-5">
          {/* User Intent */}
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">User Intent</span>
              <p className="text-xl font-bold text-white tracking-tight">Inquiry</p>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-primary w-4/5 rounded-full" />
              </div>
          </div>
          {/* CSAT Score */}
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">CSAT Score</span>
              <div className="flex items-end gap-1.5">
                  <p className="text-xl font-bold text-white tracking-tight">{score}</p>
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mb-1" />
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-primary w-[96%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
              </div>
          </div>
        </div>

        {/* Response Dynamics */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Response Dynamics</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold tracking-wider uppercase">LIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="4" />
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - 0.96)} className="transition-all duration-1000" />
                        </svg>
                        <span className="absolute text-xs font-black text-white">96%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Accuracy</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="4" />
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - 0.05)} className="transition-all duration-1000" />
                        </svg>
                        <span className="absolute text-xs font-black text-white">5%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Urgency</span>
                </div>
            </div>
        </section>

        {/* Weekly Activity */}
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Weekly Activity</span>
                <button className="text-[10px] text-primary hover:text-white font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                    Download <Download className="w-3 h-3" />
                </button>
            </div>
            <div className="h-32 flex items-end justify-between gap-1.5 px-1">
                {activityData.map((val, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 flex-1">
                        <div 
                            className={`w-full rounded-t-sm transition-all duration-1000 ease-out min-h-[4px] ${
                                i === activityData.length - 1 
                                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                                    : i === 3 ? 'bg-primary shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'bg-slate-800'
                            }`}
                            style={{ height: `${val}%` }}
                        />
                        <span className="text-[9px] text-slate-600 font-bold uppercase">{days[i][0]}</span>
                    </div>
                ))}
            </div>
        </section>
      </div>
    </div>
  );
}
