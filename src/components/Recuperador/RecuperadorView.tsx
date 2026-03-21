'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Mail,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  X,
  Check,
  FileText,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);


const IDIOMAS = [
  'Español (ES)',
  'Español (CHL)',
  'Español (ARG)',
  'Español (MEX)',
  'Inglés (EEUU)',
  'Inglés (UK)',
  'Portugués (BR)',
];

const IDIOMA_CODES: Record<string, string> = {
  'Español (ES)':   'es_ES',
  'Español (CHL)':  'es_CL',
  'Español (ARG)':  'es_AR',
  'Español (MEX)':  'es_MX',
  'Inglés (EEUU)':  'en_US',
  'Inglés (UK)':    'en_GB',
  'Portugués (BR)': 'pt_BR',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  idioma: string | null;
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

interface TableRow {
  commerce_order: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  amount: number | null;
  status: string | null;
  source: string | null;
  recipt_msj1: string | null;
  recipt_msj2: string | null;
  recipt_msj3: string | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Recuperado', cls: 'bg-emerald-500/10 text-emerald-400' },
  cancelled:  { label: 'Cancelado',  cls: 'bg-rose-500/10 text-rose-400' },
  abandoned:  { label: 'Abandonado', cls: 'bg-orange-500/10 text-orange-400' },
  pending:    { label: 'Pendiente',  cls: 'bg-blue-500/10 text-blue-400' },
};

function statusStyle(s: string | null) {
  return STATUS_MAP[s ?? ''] ?? { label: s ?? '—', cls: 'bg-slate-700/30 text-slate-400' };
}

function msgBadge(ts: string | null) {
  if (!ts) return <span className="text-[10px] text-slate-600 font-medium">—</span>;
  return (
    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
      ✓ Enviado
    </span>
  );
}


const SOURCE_MAP: Record<string, { label: string; cls: string }> = {
  web:    { label: 'Web Store', cls: 'bg-blue-500/10 text-blue-400' },
  mobile: { label: 'Mobile',    cls: 'bg-indigo-500/10 text-indigo-400' },
  ads:    { label: 'Facebook Ads', cls: 'bg-sky-500/10 text-sky-400' },
  manual: { label: 'Manual',    cls: 'bg-slate-700/30 text-slate-300' },
};

function sourceStyle(s: string | null) {
  const norm = s?.toLowerCase().trim() ?? '';
  return SOURCE_MAP[norm] ?? { label: s ?? '—', cls: 'bg-slate-700/30 text-slate-400' };
}



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
          {plantillas.map((p) => <option key={p.id} value={p.nombre}>{p.nombre.split('|')[0]}{p.idioma ? ` (${IDIOMA_CODES[p.idioma] ?? p.idioma})` : ''}</option>)}
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

  // KPIs from DB
  const [kpis, setKpis] = useState({ totalRecuperado: 0, rescatados: 0, perdidos: 0, tasa: 0, totalRows: 0 });
  // Table rows
  const [tableRows, setTableRows] = useState<TableRow[]>([]);


  // Modal "Crear Estrategia"
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [creating, setCreating]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Añadir Plantillas
  const [newPlantillaNombre, setNewPlantillaNombre] = useState('');
  const [newPlantillaIdioma, setNewPlantillaIdioma] = useState(IDIOMAS[0]);
  const [addingPlantilla, setAddingPlantilla]       = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: pData },
      { data: eData },
      { data: ncData },
      { data: tData },
    ] = await Promise.all([
      supabase.from('plantillas_recuperacion').select('id, nombre, descripcion, idioma').eq('activa', true).order('created_at'),
      supabase.from('estrategia_recuperacion').select('*').order('nombre', { nullsFirst: true }),
      // Single source of truth: all rows from no_completados
      supabase.from('no_completados').select('amount, status'),
      // Table display: 50 most recent
      supabase
        .from('no_completados')
        .select('commerce_order, buyer_name, buyer_phone, amount, status, source, recipt_msj1, recipt_msj2, recipt_msj3')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (pData) setPlantillas(pData);
    if (eData) {
      const fb = eData.find((e) => e.id === FALLBACK_ID) ?? null;
      const named = eData.filter((e) => e.id !== FALLBACK_ID && e.nombre !== null);
      setFallback(fb);
      setNamedStrategies(named);
      setEditorState(fb);
    }
    if (ncData) {
      const totalRows       = ncData.length;
      const rescatados      = ncData.filter((r) => r.status === 'completed').length;
      const perdidos        = totalRows; // ALL carts that entered the system
      const totalRecuperado = ncData
        .filter((r) => r.status === 'completed')
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      // Tasa = (completed / total rows) * 100  — as specified
      const tasa = totalRows > 0 ? (rescatados / totalRows) * 100 : 0;
      setKpis({ totalRecuperado, rescatados, perdidos, tasa, totalRows });
    }
    if (tData) setTableRows(tData);
    setLoading(false);
  }, []);



  useEffect(() => { loadData(); }, [loadData]);

  // ── Select a strategy card (also toggles is_active in DB) ─────────────────
  async function handleSelectStrategy(s: Estrategia) {
    if (estrategiaActiva?.id === s.id) {
      // Deselect → fallback becomes active
      setEstrategiaActiva(null);
      setEditorState(fallback);
      await supabase.from('estrategia_recuperacion').update({ is_active: false }).neq('id', FALLBACK_ID);
      await supabase.from('estrategia_recuperacion').update({ is_active: true }).eq('id', FALLBACK_ID);
    } else {
      setEstrategiaActiva(s);
      setEditorState(s);
      // Set all inactive, then activate selected
      await supabase.from('estrategia_recuperacion').update({ is_active: false }).neq('id', s.id);
      await supabase.from('estrategia_recuperacion').update({ is_active: true }).eq('id', s.id);
    }
    setSaved(false);
  }

  // ── Delete a named strategy ───────────────────────────────────────────────
  async function handleDelete(s: Estrategia, e: React.MouseEvent) {
    e.stopPropagation();
    const { error } = await supabase
      .from('estrategia_recuperacion')
      .delete()
      .eq('id', s.id);

    if (error) {
      console.error('Error al eliminar estrategia:', error.message);
      return; // Do not touch UI if DB rejected the operation
    }

    // Only update state after confirmed deletion
    setNamedStrategies((prev) => prev.filter((x) => x.id !== s.id));
    if (estrategiaActiva?.id === s.id) {
      setEstrategiaActiva(null);
      setEditorState(fallback);
      await supabase
        .from('estrategia_recuperacion')
        .update({ is_active: true })
        .eq('id', FALLBACK_ID);
    }
  }

  // ── Update editor field ──────────────────────────────────────────────────
  function update<K extends keyof Estrategia>(key: K, value: Estrategia[K]) {
    setEditorState((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  // ── Add a new plantilla ────────────────────────────────────────────────
  async function handleAddPlantilla() {
    const nombre = newPlantillaNombre.trim();
    if (!nombre) return;
    // Build the final name: nombre|locale_code  (e.g. "recordatorio_carrito|es_CL")
    const localeCode = IDIOMA_CODES[newPlantillaIdioma] ?? newPlantillaIdioma;
    const nombreFinal = `${nombre}|${localeCode}`;
    setAddingPlantilla(true);
    const { data, error } = await supabase
      .from('plantillas_recuperacion')
      .insert({ nombre: nombreFinal, idioma: newPlantillaIdioma, activa: true })
      .select('id, nombre, descripcion, idioma')
      .single();
    if (!error && data) {
      setPlantillas((prev) => [...prev, data]);
      setNewPlantillaNombre('');
    }
    setAddingPlantilla(false);
  }

  // ── Delete a plantilla ───────────────────────────────────────────────────
  async function handleDeletePlantilla(id: string) {
    const { error } = await supabase
      .from('plantillas_recuperacion')
      .delete()
      .eq('id', id);
    if (!error) setPlantillas((prev) => prev.filter((p) => p.id !== id));
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
      {(() => {
        const { totalRecuperado, rescatados, perdidos, tasa } = kpis;
        // Donut SVG math
        const R = 40;
        const circ = 2 * Math.PI * R;
        const filled = (tasa / 100) * circ;
        return (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* 1 — Dinero Recuperado */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group col-span-1 md:col-span-2 xl:col-span-1">
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-emerald-500/8 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-colors" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dinero Total Recuperado</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-4xl font-black text-emerald-400 tracking-tight leading-none mb-1">
                {formatCLP(totalRecuperado)}
              </p>
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span>Ventas recuperadas por el bot</span>
              </p>
            </div>

            {/* 2 — Carritos Rescatados */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-28 h-28 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Carritos Rescatados</span>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-white tracking-tight leading-none mb-1">{rescatados}</p>
              <p className="text-xs text-slate-500 mt-3">Ventas salvadas por el bot</p>
            </div>

            {/* 3 — Carritos Perdidos */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-28 h-28 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Carritos Perdidos</span>
                <TrendingDown className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-4xl font-black text-orange-400 tracking-tight leading-none mb-1">{perdidos}</p>
              <p className="text-xs text-slate-500 mt-3">Oportunidad de mejora</p>
            </div>

            {/* 4 — Tasa de Recuperación (Donut SVG) */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tasa de Recuperación</span>
              </div>
              <div className="flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {/* Track */}
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(71,85,105,0.4)" strokeWidth="12" />
                  {/* Fill */}
                  <circle
                    cx="50" cy="50" r={R}
                    fill="none"
                    stroke={tasa > 0 ? '#10b981' : 'rgba(71,85,105,0.2)'}
                    strokeWidth="12"
                    strokeDasharray={`${filled} ${circ}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                  <text x="50" y="54" textAnchor="middle" fontSize="14" fontWeight="800" fill="white">
                    {tasa.toFixed(1)}%
                  </text>
                </svg>
              </div>
              <p className="text-xs text-slate-500 text-center mt-1">de carritos convertidos</p>
            </div>

          </section>
        );
      })()}


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
              <div key={s.id} className="relative group/card flex-shrink-0">
                <button
                  onClick={() => handleSelectStrategy(s)}
                  className={`min-w-[160px] w-full flex flex-col gap-1 p-4 rounded-xl border transition-all text-left ${
                    estrategiaActiva?.id === s.id
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-slate-800/40 border-slate-700/30 text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <p className="text-[11px] font-bold truncate max-w-[130px]">{s.nombre}</p>
                  <p className="text-[9px] text-slate-500">
                    {[s.msg1_active && 'M1', s.msg2_active && 'M2', s.msg3_active && 'M3'].filter(Boolean).join(' · ')}
                  </p>
                  {estrategiaActiva?.id === s.id && (
                    <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">Activa</span>
                  )}
                </button>
                {/* Delete X button */}
                <button
                  onClick={(e) => handleDelete(s, e)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-rose-500/80 hover:text-white hover:border-rose-500 transition-all opacity-0 group-hover/card:opacity-100 scale-75 group-hover/card:scale-100"
                  title="Eliminar estrategia"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
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
        <div className="flex justify-center mb-10">
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

        {/* ── Añadir Plantillas ── */}
        <div className="border-t border-slate-800/50 pt-8">
          <div className="flex items-start gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Añadir Plantillas</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Copia y Pega el Nombre de la Plantilla APROBADA por Meta</p>
            </div>
          </div>

          {/* Input row */}
          <div className="flex gap-2 mt-5">
            <input
              value={newPlantillaNombre}
              onChange={(e) => setNewPlantillaNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlantilla()}
              placeholder="ej: recordatorio_carrito_es"
              className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
            <select
              value={newPlantillaIdioma}
              onChange={(e) => setNewPlantillaIdioma(e.target.value)}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/40 shrink-0"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.1em 1.1em', paddingRight: '2rem', appearance: 'none' }}
            >
              {IDIOMAS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
            <button
              onClick={handleAddPlantilla}
              disabled={addingPlantilla || !newPlantillaNombre.trim()}
              className="w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
              title="Añadir plantilla"
            >
              {addingPlantilla ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* Plantillas list */}
          {plantillas.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {plantillas.map((p) => (
                <div key={p.id} className="group/chip flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/40 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-all">
                  <span className="text-xs font-medium text-slate-300">{p.nombre.split('|')[0]}</span>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-700/50 rounded px-1.5 py-0.5">
                    {p.nombre.includes('|') ? p.nombre.split('|')[1] : (p.idioma ?? '')}
                  </span>
                  <button
                    onClick={() => handleDeletePlantilla(p.id)}
                    className="ml-1 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover/chip:opacity-100"
                    title="Eliminar plantilla"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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

        <div className="overflow-x-auto relative">
          <div className="max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <table className="text-left border-separate border-spacing-0" style={{ minWidth: '960px', width: '100%' }}>
              <thead className="sticky top-0 z-20 bg-[#0f172a]">
                <tr className="bg-slate-800/50">
                  {['Nombre', 'Teléfono', 'Monto', 'Estado', 'Fuente', 'Mensaje 1', 'Mensaje 2', 'Mensaje 3'].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] uppercase font-black text-slate-500 tracking-widest whitespace-nowrap border-b border-slate-800/60">{h}</th>
                  ))}
                </tr>
              </thead>

            <tbody className="divide-y divide-slate-800/40">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-600">Sin registros todavía</td>
                </tr>
              ) : tableRows.map((row) => {
                const st = statusStyle(row.status);
                const initials = (row.buyer_name ?? '??').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={row.commerce_order} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-slate-200 whitespace-nowrap">{row.buyer_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{row.buyer_phone ?? '—'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-white whitespace-nowrap">
                      {row.amount != null ? formatCLP(Number(row.amount)) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        const src = sourceStyle(row.source);
                        return (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${src.cls}`}>
                            {src.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4">{msgBadge(row.recipt_msj1)}</td>
                    <td className="px-5 py-4">{msgBadge(row.recipt_msj2)}</td>
                    <td className="px-5 py-4">{msgBadge(row.recipt_msj3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
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
