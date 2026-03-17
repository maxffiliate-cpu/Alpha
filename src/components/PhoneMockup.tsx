'use client';

import React from 'react';

interface PhoneMockupProps {
  children: React.ReactNode;
}

export default function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto w-full max-w-[380px] aspect-[9/19.5] group animate-in fade-in zoom-in duration-700">
      {/* Outer Frame */}
      <div className="absolute inset-0 bg-slate-800 rounded-[3rem] border-4 border-slate-700/50 shadow-2xl p-3 flex flex-col overflow-hidden ring-1 ring-white/10">
        
        {/* Notch - Dynamic Island Style */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-3xl z-50 flex items-center justify-center gap-1.5 px-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <div className="flex-1" />
            <div className="w-4 h-1 rounded-full bg-slate-800" />
        </div>

        {/* Screen Container */}
        <div className="flex-1 rounded-[2.2rem] overflow-hidden bg-slate-950 relative border border-white/5 flex flex-col shadow-inner">
          {children}
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/10 rounded-full z-50" />
      </div>

      {/* Buttons Side (Visual only) */}
      <div className="absolute top-32 -left-1 w-1 h-12 bg-slate-700 rounded-l-md border-r border-slate-600" />
      <div className="absolute top-48 -left-1 w-1 h-12 bg-slate-700 rounded-l-md border-r border-slate-600" />
      <div className="absolute top-32 -right-1 w-1 h-20 bg-slate-700 rounded-r-md border-l border-slate-600" />

      {/* Glossy Reflect (Subtle) */}
      <div className="absolute inset-0 rounded-[3rem] pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-50 z-40" />
    </div>
  );
}
