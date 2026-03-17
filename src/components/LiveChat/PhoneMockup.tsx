'use client';

import React from 'react';

interface PhoneMockupProps {
  children: React.ReactNode;
}

export default function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto w-full max-w-[360px] aspect-[9/19] group animate-in fade-in zoom-in duration-700">
      {/* Outer Frame - Thinner lines */}
      <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] border-[1.5px] border-slate-700/80 shadow-2xl p-1.5 flex flex-col overflow-hidden ring-1 ring-white/5">
        
        {/* Notch - Smaller */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-3xl z-50 flex items-center justify-center gap-1.5 px-3">
            <div className="w-1 h-1 rounded-full bg-slate-800" />
            <div className="flex-1" />
            <div className="w-3 h-0.5 rounded-full bg-slate-800" />
        </div>

        {/* Screen Container */}
        <div className="flex-1 rounded-[2.1rem] overflow-hidden bg-slate-950 relative border border-white/5 flex flex-col">
          {children}
        </div>
        
        {/* Home Indicator - Thinner */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/10 rounded-full z-50" />
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
