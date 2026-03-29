'use client';

import React from 'react';

interface PhoneMockupProps {
  children: React.ReactNode;
  isPanic?: boolean;
}

export default function PhoneMockup({ children, isPanic = false }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto w-full max-w-[340px] aspect-[9/19] group animate-in fade-in zoom-in duration-1000">
      {/* Outer Frame */}
      <div className={`absolute inset-0 bg-[#0a0c10] rounded-[3rem] border-[1px] p-1.5 flex flex-col overflow-hidden ring-1 transition-all duration-500 ${
        isPanic
          ? 'border-rose-500/60 shadow-[0_0_60px_rgba(244,63,94,0.35),0_0_120px_rgba(244,63,94,0.15)] ring-rose-500/20'
          : 'border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-white/5'
      }`}>
        
        {/* Notch - Micro notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-50 flex items-center justify-center gap-1.5 px-3">
            <div className="w-1 h-1 rounded-full bg-slate-900" />
            <div className="flex-1" />
            <div className="w-2 h-0.5 rounded-full bg-slate-900" />
        </div>

        {/* Screen Container */}
        <div className="flex-1 rounded-[2.8rem] overflow-hidden bg-[#030711] relative border border-white/5 flex flex-col">
          {children}
        </div>
        
        {/* Home Indicator - Ghostly line */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/[0.03] rounded-full z-50" />
      </div>

      {/* Subtle Depth Highlights */}
      <div className="absolute inset-0 rounded-[3rem] pointer-events-none ring-1 ring-inset ring-white/10 opacity-30 z-40" />
      
      {/* Glossy Reflect (Diagonal) */}
      <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[3rem] pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent z-40" />
    </div>
  );
}
