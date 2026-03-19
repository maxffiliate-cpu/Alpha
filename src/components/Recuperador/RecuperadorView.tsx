'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Mail,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  X,
  Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface Estrategia {
  id: string;
  nombre: string | null;
  is_active: boolean;
  msg1_active: boolean;
  msg1_template: string;
  msg1_delay_min: number;
  msg2_active: boolean;
  msg2_template: string;
  msg2_delay_min: number;
  msg3_active: boolean;
  msg3_template: string;
  msg3_delay_min: number;
}

type CartEntry = {
  initials: string;
  name: string;
  phone: string;
  amount: string;
  time: string;
  status: 'Recuperado' | 'Pendiente' | 'Perdido';
};

const CART_ENTRIES: CartEntry[] = [
  { initials: 'JP', name: 'Juan P.',   phone: '+54 9 11 ***-9234', amount: '$12,450.00', time: 'Hoy, 14:20 PM', status: 'Recuperado' },
  { initials: 'ML', name: 'Maria L.',  phone: '+34 654 ***-112',   amount: '$3,200.50',  time: 'Hoy, 13:55 PM', status: 'Pendiente' },
  { initials: 'RK', name: 'Robert K.', phone: '+1 305 ***-8821',   amount: '$45,000.00', time: 'Hoy, 12:10 PM', status: 'Perdido' },
];

const STATUS_STYLES: Record<CartEntry['status'], string> = {
  Recuperado: 'bg-emerald-500/10 text-emerald-400',
  Pendiente:  'bg-blue-500/10 text-blue-400',
  Perdido:    'bg-rose-500/10 text-rose-400',
};

const FALLBACK_ID = '00000000-0000-0000-0000-000000000001';

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-blue-500' : 'bg-slate-700'}`}
      aria-label="toggle"
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

function MessageCard({
  label, active, template, delay, maxDelay, plantillas,
  onToggle, onDelayChange, onTemplateChange,
}: {
  label: string; active: boolean; template: string; delay: number;
  maxDelay: number; plantillas: Plantilla[];
  onToggle: () => void; onDelayChange: (v: number) => void; onTemplateChange: (v: string) => void;
}) {
  return (
    <div className={`glass-panel p-6 rounded-2xl flex flex-col gap-6 transition-opacity duration-300 ${!active ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-white">{label}</h4>
        <Toggle checked={active} onChange={onToggle} />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Plantilla</label>
        <select
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
          disabled={!active}
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:ring-1 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed"
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', appearance: 'none' }}
        >
          {plantillas.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
          <span>Delay</span>
          <span className="text-blue-400">{delay} min</span>
        </div>
        <input type="range" min={1} max={maxDelay} value={delay} disabled={!active}
          onChange={(e) => onDelayChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecuperadorView() {
  const [plantillas, setPlantillas]           = useState<Plantilla[]>([]);
  const [fallback, setFallback]               = useState<Estrategia | null>(null);
  const [namedStrategies, setNamedStrategies] = useState<Estrategia[]>([]);
  // estrategiaActiva = null → usando fallback; si tiene valor → estrategia seleccionada
  const [estrategiaActiva, setEstrategiaActiva] = useState<Estrategia | null>(null);
  // editorState = lo que muestran los sliders/toggles/selects en este momento
  const [editorState, setEditorState]         = useState<Estrategia | null>(null);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // Modal "Crear Estrategia"
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [creating, setCreating]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: pData }, { data: eData }] = await Promise.all([
      supabase.from('plantillas_recuperacion').select('id, nombre, descripcion').eq('activa', true).order('created_at'),
      supabase.from('estrategia_recuperacion').select('*').order('nombre', { nullsFirst: true }),
    ]);

    if (pData) setPlantillas(pData);
    if (eData) {
      const fb = eData.find((e) => e.id === FALLBACK_ID) ?? null;
      const named = eData.filter((e) => e.id !== FALLBACK_ID && e.nombre !== null);
      setFallback(fb);
      setNamedStrategies(named);
      // Editor arranca con el fallback
      setEditorState(fb);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Select a strategy card ───────────────────────────────────────────────
  function handleSelectStrategy(s: Estrategia) {
    if (estrategiaActiva?.id === s.id) {
      // Deselect → volver a fallback
      setEstrategiaActiva(null);
      setEditorState(fallback);
    } else {
      setEstrategiaActiva(s);
      setEditorState(s);
    }
    setSaved(false);
  }

  // ── Update editor field ──────────────────────────────────────────────────
  function update<K extends keyof Estrategia>(key: K, value: Estrategia[K]) {
    setEditorState((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  // ── Save (upsert to the active strategy or fallback) ─────────────────────
  async function handleSave() {
    if (!editorState) return;
    setSaving(true);
    const targetId = estrategiaActiva?.id ?? FALLBACK_ID;
    await supabase.from('estrategia_recuperacion').upsert({
      id:             targetId,
      nombre:         editorState.nombre,
      is_active:      editorState.is_active,
      msg1_active:    editorState.msg1_active,
      msg1_template:  editorState.msg1_template,
      msg1_delay_min: editorState.msg1_delay_min,
      msg2_active:    editorState.msg2_active,
      msg2_template:  editorState.msg2_template,
      msg2_delay_min: editorState.msg2_delay_min,
      msg3_active:    editorState.msg3_active,
      msg3_template:  editorState.msg3_template,
      msg3_delay_min: editorState.msg3_delay_min,
    });
    // Refresh named strategies list
    await loadData();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Create new named strategy ────────────────────────────────────────────
  async function handleCreate() {
    const name = newName.trim();
    if (!name || !editorState) return;
    setCreating(true);
    const { data } = await supabase.from('estrategia_recuperacion').insert({
      nombre:         name,
      is_active:      editorState.is_active,
      msg1_active:    editorState.msg1_active,
      msg1_template:  editorState.msg1_template,
      msg1_delay_min: editorState.msg1_delay_min,
      msg2_active:    editorState.msg2_active,
      msg2_template:  editorState.msg2_template,
      msg2_delay_min: editorState.msg2_delay_min,
      msg3_active:    editorState.msg3_active,
      msg3_template:  editorState.msg3_template,
      msg3_delay_min: editorState.msg3_delay_min,
    }).select().single();

    if (data) {
      setNamedStrategies((prev) => [...prev, data]);
      setEstrategiaActiva(data);
      setEditorState(data);
    }
    setCreating(false);
    setShowCreate(false);
    setNewName('');
  }

  if (loading || !editorState) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Recuperación de Carritos</h1>
          </div>
          <p className="text-slate-400 text-base leading-relaxed">
            Convierte el abandono en ingresos automáticos vía WhatsApp con inteligencia predictiva.
          </p>
        </div>
        <div className="glass-panel flex items-center gap-5 px-6 py-4 rounded-2xl shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Estado del Sistema</span>
            <span className={`text-sm font-semibold ${editorState.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
              {editorState.is_active ? 'Motor Activo' : 'Motor Inactivo'}
            </span>
          </div>
          <Toggle checked={editorState.is_active} onChange={() => update('is_active', !editorState.is_active)} />
        </div>
      </section>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ingresos Rescatados</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 tracking-tight">$1,450,000</p>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12.4% vs mes anterior</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tasa de Recuperación</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white tracking-tight">24.5%</p>
          <div className="mt-4 h-12 w-full flex items-end gap-1">
            {[33, 50, 66, 75, 50, 85, 100].map((h, i) => (
              <div key={i} className="rounded-t-sm w-full" style={{ height: `${h}%`, backgroundColor: `rgba(59,130,246,${0.2 + i * 0.12})`, boxShadow: i === 6 ? '0 0 10px rgba(59,130,246,0.3)' : undefined }} />
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Carritos Procesados</span>
            <ShoppingCart className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-3xl font-black text-white tracking-tight">142</p>
          <p className="text-xs text-slate-500 mt-2">Actividad registrada esta semana</p>
          <div className="flex -space-x-2 mt-4">
            {['JP', 'ML', 'RK'].map((init) => (
              <div key={init} className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-300">{init}</div>
            ))}
            <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-400">+12</div>
          </div>
        </div>
      </section>

      {/* ── Gestionar Mensajes ────────────────────────────── */}
      <section className="bg-slate-900/60 border border-slate-800/50 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Gestionar Mensajes</h2>
            {estrategiaActiva && (
              <p className="text-xs text-blue-400 font-medium mt-0.5">
                Editando: <span className="font-bold">{estrategiaActiva.nombre}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Estrategias Predeterminadas ── */}
        <div className="mb-8">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">
            Estrategias Predeterminadas
          </span>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {/* Strategy cards (only if named strategies exist) */}
            {namedStrategies.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectStrategy(s)}
                className={`flex-shrink-0 min-w-[160px] flex flex-col gap-1 p-4 rounded-xl border transition-all text-left ${
                  estrategiaActiva?.id === s.id
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <p className="text-[11px] font-bold truncate max-w-[140px]">{s.nombre}</p>
                <p className="text-[9px] text-slate-500">
                  {[s.msg1_active && 'M1', s.msg2_active && 'M2', s.msg3_active && 'M3'].filter(Boolean).join(' · ')}
                </p>
                {estrategiaActiva?.id === s.id && (
                  <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">Activa</span>
                )}
              </button>
            ))}

            {/* Botón "Crear Estrategia" — siempre al final */}
            {!showCreate ? (
              <button
                onClick={() => { setShowCreate(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex-shrink-0 min-w-[160px] flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[11px] font-bold">Crear Estrategia</span>
              </button>
            ) : (
              /* Inline create form */
              <div className="flex-shrink-0 min-w-[200px] flex flex-col gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Nueva estrategia</p>
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setNewName(''); } }}
                  placeholder="Nombre..."
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Guardar
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewName(''); }}
                    className="w-8 flex items-center justify-center py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Message Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <MessageCard label="Mensaje 1" active={editorState.msg1_active} template={editorState.msg1_template} delay={editorState.msg1_delay_min} maxDelay={60} plantillas={plantillas}
            onToggle={() => update('msg1_active', !editorState.msg1_active)}
            onDelayChange={(v) => update('msg1_delay_min', v)}
            onTemplateChange={(v) => update('msg1_template', v)}
          />
          <MessageCard label="Mensaje 2" active={editorState.msg2_active} template={editorState.msg2_template} delay={editorState.msg2_delay_min} maxDelay={120} plantillas={plantillas}
            onToggle={() => update('msg2_active', !editorState.msg2_active)}
            onDelayChange={(v) => update('msg2_delay_min', v)}
            onTemplateChange={(v) => update('msg2_template', v)}
          />
          <MessageCard label="Mensaje 3" active={editorState.msg3_active} template={editorState.msg3_template} delay={editorState.msg3_delay_min} maxDelay={240} plantillas={plantillas}
            onToggle={() => update('msg3_active', !editorState.msg3_active)}
            onDelayChange={(v) => update('msg3_delay_min', v)}
            onTemplateChange={(v) => update('msg3_template', v)}
          />
        </div>

        {/* ── Save Button ── */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full max-w-md py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/20 hover:shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500'
            }`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : saved ? <><CheckCircle2 className="w-4 h-4" /> ¡Estrategia Guardada!</>
              : <><Save className="w-4 h-4" /> {estrategiaActiva ? `Guardar "${estrategiaActiva.nombre}"` : 'Guardar Configuración Base'}</>
            }
          </button>
        </div>
      </section>

      {/* ── Tabla en Tiempo Real ──────────────────────────── */}
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
                  <th key={h} className={`px-6 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest ${h === 'Status' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {CART_ENTRIES.map((entry) => (
                <tr key={entry.initials} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">{entry.initials}</div>
                      <span className="text-sm font-medium text-slate-200">{entry.name} <span className="text-slate-500 text-xs ml-1">{entry.phone}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{entry.amount}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{entry.time}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[entry.status]}`}>{entry.status}</span>
                  </td>
                </tr>
              ))}
              <tr className="opacity-25">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-slate-700" /><div className="h-4 w-32 bg-slate-700 rounded" /></div></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-700 rounded" /></td>
                <td className="px-6 py-4"><div className="h-3 w-20 bg-slate-700 rounded" /></td>
                <td className="px-6 py-4 text-right"><div className="inline-block h-5 w-20 bg-slate-700 rounded-full" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-800/20 text-center border-t border-slate-800/40">
          <button className="text-xs font-bold text-blue-400 hover:underline transition-all">Ver historial completo de transacciones</button>
        </div>
      </section>

      {/* Decorative bleed */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-64 -z-10 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
