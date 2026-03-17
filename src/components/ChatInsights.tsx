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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 text-slate-500 glass-panel border border-slate-800/50 rounded-2xl">
        <Activity className="w-12 h-12 text-slate-700 opacity-50" />
        <p className="text-sm">Select a chat to view live AI insights and lead scoring.</p>
      </div>
    );
  }

  // Mock data - In a real app this would come from Supabase or AI analysis
  const sentiment = 85; // 0 to 100
  const intent = "Commercial Inquiry";
  const score = "4.8/5.0";
  const urgency = "Medium";
  const conversionProb = 72;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activityData = [40, 65, 45, 90, 85, 30, 20];

  return (
    <div className="h-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500 overflow-y-auto pr-2 custom-scrollbar">
      <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
        <Activity className="text-primary w-5 h-5" /> Chat Insights
      </h2>

      {/* Sentiment Card */}
      <div className="glass-panel p-5 border-slate-800/50 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sentiment Analysis</span>
          <Smile className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute inset-0 border-[10px] border-slate-800 rounded-t-full" />
                <div 
                    className="absolute inset-0 border-[10px] border-emerald-500 rounded-t-full origin-bottom" 
                    style={{ transform: `rotate(${ (sentiment / 100) * 180 - 180 }deg)` }} 
                />
            </div>
            <div className="text-center">
                <p className="text-2xl font-black text-white">Positive</p>
                <p className="text-[10px] text-slate-500 font-medium">Highly cooperative customer</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* User Intent */}
        <div className="glass-panel p-4 border-slate-800/50 rounded-2xl space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">User Intent</span>
            <p className="text-lg font-bold text-white leading-tight">Inquiry</p>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-4/5" />
            </div>
        </div>
        {/* CSAT Score */}
        <div className="glass-panel p-4 border-slate-800/50 rounded-2xl space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">CSAT Score</span>
            <div className="flex items-end gap-1">
                <p className="text-lg font-bold text-white">{score}</p>
                <Star className="w-3 h-3 text-amber-500 mb-1" />
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[96%]" />
            </div>
        </div>
      </div>

      {/* Response Dynamics */}
      <div className="glass-panel p-5 border-slate-800/50 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Response Dynamics</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">LIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - 0.96)} />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">96%</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold mt-2">Accuracy</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-rose-500" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - 0.05)} />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">5%</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold mt-2">Urgency</span>
                </div>
            </div>
      </div>

      {/* Weekly Activity */}
      <div className="glass-panel p-5 border-slate-800/50 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weekly Activity</span>
          <button className="text-[10px] text-primary hover:underline font-bold">Download</button>
        </div>
        <div className="h-32 flex items-end justify-between gap-1 px-2">
          {activityData.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-2 group/bar cursor-help">
              <div 
                className={`w-4 rounded-t-sm transition-all duration-500 ${i === activityData.length - 1 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 group-hover/bar:bg-primary/50'}`}
                style={{ height: `${val}%` }}
              />
              <span className="text-[8px] text-slate-500 font-bold">{days[i][0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
