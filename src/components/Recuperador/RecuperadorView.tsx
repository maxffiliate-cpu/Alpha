'use client';

import { useState } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Mail,
  Power,
  Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageConfig = {
  id: number;
  label: string;
  template: string;
  delay: number;
  maxDelay: number;
  enabled: boolean;
};

type CartEntry = {
  initials: string;
  name: string;
  phone: string;
  amount: string;
  time: string;
  status: 'Recuperado' | 'Pendiente' | 'Perdido';
};

// ─── Static Data ─────────────────────────────────────────────────────────────

const STRATEGIES = [
  { id: 1, name: 'Conversión A', desc: 'Optimizado Ventas' },
  { id: 2, name: 'Fidelidad B', desc: 'Enfoque Soporte' },
  { id: 3, name: 'Urgencia C', desc: 'Liquidación Stock' },
  { id: 4, name: 'Retención D', desc: 'Seguimiento VIP' },
];

const TEMPLATES_1 = ['Recordatorio Estándar', 'Bienvenida E-commerce', 'Urgencia + Descuento'];
const TEMPLATES_2 = ['Urgencia + Descuento', 'Recordatorio Estándar', 'Respuesta de Soporte'];
const TEMPLATES_3 = ['Seguimiento Final', 'Recordatorio de Cita', 'Especial VIP'];

const INITIAL_MESSAGES: MessageConfig[] = [
  { id: 1, label: 'Mensaje 1', template: TEMPLATES_1[0], delay: 5,   maxDelay: 60,  enabled: true  },
  { id: 2, label: 'Mensaje 2', template: TEMPLATES_2[0], delay: 30,  maxDelay: 120, enabled: true  },
  { id: 3, label: 'Mensaje 3', template: TEMPLATES_3[0], delay: 120, maxDelay: 240, enabled: false },
];

const CART_ENTRIES: CartEntry[] = [
  { initials: 'JP', name: 'Juan P.',    phone: '+54 9 11 ***-9234', amount: '$12,450.00', time: 'Hoy, 14:20 PM', status: 'Recuperado' },
  { initials: 'ML', name: 'Maria L.',   phone: '+34 654 ***-112',   amount: '$3,200.50',  time: 'Hoy, 13:55 PM', status: 'Pendiente'  },
  { initials: 'RK', name: 'Robert K.',  phone: '+1 305 ***-8821',   amount: '$45,000.00', time: 'Hoy, 12:10 PM', status: 'Perdido'    },
];

const STATUS_STYLES: Record<CartEntry['status'], string> = {
  Recuperado: 'bg-emerald-500/10 text-emerald-400',
  Pendiente:  'bg-blue-500/10   text-blue-400',
  Perdido:    'bg-rose-500/10   text-rose-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
        checked ? 'bg-blue-500' : 'bg-slate-700'
      }`}
      aria-label="toggle"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function MessageCard({
  msg,
  templates,
  onToggle,
  onDelayChange,
  onTemplateChange,
}: {
  msg: MessageConfig;
  templates: string[];
  onToggle: () => void;
  onDelayChange: (v: number) => void;
  onTemplateChange: (v: string) => void;
}) {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-white">{msg.label}</h4>
        <Toggle checked={msg.enabled} onChange={onToggle} />
      </div>

      <div>
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">
          Plantilla
        </label>
        <select
          value={msg.template}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:ring-1 focus:ring-blue-500/40 focus:outline-none appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.2em 1.2em',
          }}
        >
          {templates.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
          <span>Delay</span>
          <span className="text-blue-400">{msg.delay} min</span>
        </div>
        <input
          type="range"
          min={1}
          max={msg.maxDelay}
          value={msg.delay}
          onChange={(e) => onDelayChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RecuperadorView() {
  const [motorActivo, setMotorActivo] = useState(true);
  const [messages, setMessages] = useState<MessageConfig[]>(INITIAL_MESSAGES);
  const [activeStrategy, setActiveStrategy] = useState<number | null>(null);

  function toggleMessage(id: number) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  }

  function setDelay(id: number, delay: number) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, delay } : m))
    );
  }

  function setTemplate(id: number, template: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, template } : m))
    );
  }

  const templateSets = [TEMPLATES_1, TEMPLATES_2, TEMPLATES_3];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Recuperación de Carritos
            </h1>
          </div>
          <p className="text-slate-400 text-base leading-relaxed">
            Convierte el abandono en ingresos automáticos vía WhatsApp con inteligencia predictiva.
          </p>
        </div>

        <div className="glass-panel flex items-center gap-5 px-6 py-4 rounded-2xl shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
              Estado del Sistema
            </span>
            <span className={`text-sm font-semibold ${motorActivo ? 'text-emerald-400' : 'text-slate-500'}`}>
              {motorActivo ? 'Motor Activo' : 'Motor Inactivo'}
            </span>
          </div>
          <Toggle checked={motorActivo} onChange={() => setMotorActivo(!motorActivo)} />
        </div>
      </section>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ingresos Rescatados */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Ingresos Rescatados
            </span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 tracking-tight">$1,450,000</p>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12.4% vs mes anterior
          </p>
        </div>

        {/* Tasa de Recuperación */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Tasa de Recuperación
            </span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white tracking-tight">24.5%</p>
          {/* Sparkline */}
          <div className="mt-4 h-12 w-full flex items-end gap-1">
            {[33, 50, 66, 75, 50, 85, 100].map((h, i) => (
              <div
                key={i}
                className="rounded-t-sm w-full transition-all"
                style={{
                  height: `${h}%`,
                  backgroundColor: `rgba(59,130,246,${0.2 + i * 0.12})`,
                  boxShadow: i === 6 ? '0 0 10px rgba(59,130,246,0.3)' : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* Carritos Procesados */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Carritos Procesados
            </span>
            <ShoppingCart className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-3xl font-black text-white tracking-tight">142</p>
          <p className="text-xs text-slate-500 mt-2">Actividad registrada esta semana</p>
          <div className="flex -space-x-2 mt-4">
            {['JP', 'ML', 'RK'].map((init) => (
              <div
                key={init}
                className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-300"
              >
                {init}
              </div>
            ))}
            <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-400">
              +12
            </div>
          </div>
        </div>
      </section>

      {/* ── Gestionar Mensajes ───────────────────────────── */}
      <section className="bg-slate-900/60 border border-slate-800/50 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Gestionar Mensajes</h2>
        </div>

        {/* Estrategias */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Estrategias Predeterminadas
            </span>
            <button className="text-[10px] font-black text-blue-400 uppercase hover:underline">
              Ver todas
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveStrategy(s.id === activeStrategy ? null : s.id)}
                className={`flex-1 min-w-[160px] flex flex-col gap-1 p-4 rounded-xl border transition-all text-left group ${
                  activeStrategy === s.id
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <p className="text-[11px] font-bold">{s.name}</p>
                <p className="text-[9px] text-slate-500">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Message Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {messages.map((msg, i) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              templates={templateSets[i]}
              onToggle={() => toggleMessage(msg.id)}
              onDelayChange={(v) => setDelay(msg.id, v)}
              onTemplateChange={(v) => setTemplate(msg.id, v)}
            />
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button className="w-full max-w-md py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500 active:scale-[0.98] transition-all">
            Guardar Estrategia
          </button>
        </div>
      </section>

      {/* ── Tabla en Tiempo Real ─────────────────────────── */}
      <section className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Registro en Tiempo Real</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-400">Escaneando carritos...</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/30">
                {['Cliente', 'Monto', 'Fecha / Hora', 'Status'].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest ${
                      h === 'Status' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {CART_ENTRIES.map((entry) => (
                <tr key={entry.initials} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                        {entry.initials}
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {entry.name}{' '}
                        <span className="text-slate-500 text-xs ml-1">{entry.phone}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{entry.amount}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{entry.time}</td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        STATUS_STYLES[entry.status]
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Skeleton row */}
              <tr className="opacity-25">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700" />
                    <div className="h-4 w-32 bg-slate-700 rounded" />
                  </div>
                </td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-700 rounded" /></td>
                <td className="px-6 py-4"><div className="h-3 w-20 bg-slate-700 rounded" /></td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-block h-5 w-20 bg-slate-700 rounded-full" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-800/20 text-center border-t border-slate-800/40">
          <button className="text-xs font-bold text-blue-400 hover:underline transition-all">
            Ver historial completo de transacciones
          </button>
        </div>
      </section>

      {/* Decorative bleed */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-64 -z-10 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
