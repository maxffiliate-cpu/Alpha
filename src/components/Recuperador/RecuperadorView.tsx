'use client';

import { ShoppingCart, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export default function RecuperadorView() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Recuperador de Carritos
          </h1>
        </div>
        <p className="text-slate-400">
          Monitoreo y recuperación automatizada de carritos abandonados.
        </p>
      </header>

      {/* Stats placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlaceholderStat
          icon={<ShoppingCart className="w-5 h-5" />}
          label="Carritos Abandonados"
          value="—"
        />
        <PlaceholderStat
          icon={<Clock className="w-5 h-5" />}
          label="Tiempo Promedio Abandono"
          value="—"
        />
        <PlaceholderStat
          icon={<TrendingUp className="w-5 h-5" />}
          label="Tasa de Recuperación"
          value="—"
        />
      </div>

      {/* Empty state */}
      <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center border border-dashed border-slate-700">
        <div className="p-4 rounded-2xl bg-slate-800/50">
          <AlertCircle className="w-8 h-8 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-300">
            Módulo en construcción
          </h2>
          <p className="text-sm text-slate-500 max-w-sm">
            El motor de recuperación de carritos está siendo configurado.
            Pronto podrás ver y gestionar los carritos abandonados desde aquí.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaceholderStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
      <div className="p-2 rounded-lg bg-slate-800/50 text-slate-400">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-600">{value}</p>
      </div>
    </div>
  );
}
