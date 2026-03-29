'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  X,
  Check,
  Clock,
  ChevronRight,
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
  tenant_id?: string;
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
  tenant_id?: string;
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
  tenant_id?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Recuperado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  cancelled:  { label: 'Cancelado',  cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
  abandoned:  { label: 'Abandonado', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
  pending:    { label: 'Pendiente',  cls: 'bg-[#eef1f3] text-[#595c5e] dark:bg-violet-500/10 dark:text-violet-400' },
};

function statusStyle(s: string | null) {
  return STATUS_MAP[s ?? ''] ?? { label: s ?? '—', cls: 'bg-[#eef1f3] text-[#595c5e] dark:bg-slate-700/30 dark:text-slate-400' };
}

function msgBadge(ts: string | null) {
  if (!ts) return <span className="text-xs text-[#abadaf] dark:text-slate-600">—</span>;
  return (
    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
      ✓ Enviado
    </span>
  );
}

const SOURCE_MAP: Record<string, { label: string; cls: string }> = {
  web:    { label: 'Web Store',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' },
  mobile: { label: 'Mobile',      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' },
  ads:    { label: 'Facebook Ads', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  manual: { label: 'Manual',      cls: 'bg-[#eef1f3] text-[#595c5e] dark:bg-slate-700/30 dark:text-slate-400' },
};

function sourceStyle(s: string | null) {
  const norm = s?.toLowerCase().trim() ?? '';
  return SOURCE_MAP[norm] ?? { label: s ?? '—', cls: 'bg-[#eef1f3] text-[#595c5e] dark:bg-slate-700/30 dark:text-slate-400' };
}

// No FALLBACK_ID — the DB assigns real UUIDs via gen_random_uuid()

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" readOnly />
      <div className="w-11 h-6 bg-[#dfe3e6] dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]" />
    </label>
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
  const subtitles: Record<string, string> = {
    'Mensaje 1': 'Primer contacto',
    'Mensaje 2': 'Recordatorio intermedio',
    'Mensaje 3': 'Último intento',
  };
  return (
    <div className={`bg-white dark:bg-slate-900/60 rounded-xl p-8 border border-[#abadaf]/10 dark:border-slate-800/50 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] hover:border-[var(--primary)]/20 dark:hover:border-violet-500/30 transition-all ${!active ? 'opacity-60 grayscale-[0.3]' : ''}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-bold text-lg text-[#2c2f31] dark:text-white">{label}</h4>
          <span className="text-xs text-[#595c5e] dark:text-slate-400">{subtitles[label]}</span>
        </div>
        <Toggle checked={active} onChange={onToggle} />
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#595c5e] dark:text-slate-500 mb-2">Plantilla</label>
          <select
            value={template}
            onChange={(e) => onTemplateChange(e.target.value)}
            disabled={!active}
            className="w-full bg-[#eef1f3] dark:bg-slate-800/60 border-none dark:border dark:border-slate-700/50 rounded-lg text-sm px-4 py-2.5 text-[#2c2f31] dark:text-slate-200 focus:ring-2 focus:ring-[var(--primary)]/20 appearance-none cursor-pointer disabled:cursor-not-allowed"
          >
            {plantillas.map((p) => (
              <option key={p.id} value={p.nombre}>
                {p.nombre.split('|')[0]}{p.idioma ? ` (${IDIOMA_CODES[p.idioma] ?? p.idioma})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[#595c5e] dark:text-slate-500">Delay</label>
            <span className="text-sm font-bold text-[var(--primary)]">
              {delay < 60 ? `${delay} min` : `${Math.floor(delay / 60)}h ${delay % 60 > 0 ? `${delay % 60}m` : ''}`}
            </span>
          </div>
          <input
            type="range" min={1} max={maxDelay} value={delay} disabled={!active}
            onChange={(e) => onDelayChange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#e5e9eb] dark:bg-slate-700 rounded-lg appearance-none cursor-pointer stitch-slider disabled:cursor-not-allowed"
          />
        </div>
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

  const [tenantId, setTenantId] = useState<string | null>(null);
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
      { data: statsData }, // Use RPC result for metrics
      { data: tData },
    ] = await Promise.all([
      supabase.from('plantillas_recuperacion').select('id, nombre, descripcion, idioma').eq('activa', true).order('created_at'),
      supabase.from('estrategia_recuperacion').select('*').order('nombre', { nullsFirst: true }),
      supabase.rpc('get_recovery_stats'),
      // Table display: Recent history from ALL sources in no_completados
      supabase
        .from('no_completados')
        .select('commerce_order, buyer_name, buyer_phone, amount, status, source, recipt_msj1, recipt_msj2, recipt_msj3')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (pData) setPlantillas(pData);
      if (eData) {
        // fallback = la estrategia sin nombre (config base del tenant)
        const fb = eData.find((e) => e.nombre === null) ?? null;
        const named = eData.filter((e) => e.nombre !== null);
        setFallback(fb);
        setNamedStrategies(named);

        // Si no existe configuración previa (nuevo tenant), estado vacío sin ID falso.
        if (!fb && named.length === 0) {
          const initialState: Estrategia = {
            id: '',   // aún no guardado — la DB asignará UUID al hacer insert
            nombre: null,
            is_active: false,
            msg1_active: true,
            msg1_template: pData && pData.length > 0 ? pData[0].nombre : '',
            msg1_delay_min: 5,
            msg2_active: false,
            msg2_template: pData && pData.length > 0 ? pData[0].nombre : '',
            msg2_delay_min: 30,
            msg3_active: false,
            msg3_template: pData && pData.length > 0 ? pData[0].nombre : '',
            msg3_delay_min: 60,
          };
          setEditorState(initialState);
        } else {
          setEditorState(fb || named[0]);
        }
      }

    if (statsData) {
      // statsData[0] contains { rescatados_count, perdidos_count, total_dinero }
      const stats = statsData[0] || { rescatados_count: 0, perdidos_count: 0, total_dinero: 0 };
      const rescatados = Number(stats.rescatados_count);
      const perdidos = Number(stats.perdidos_count);
      const dinero = Number(stats.total_dinero);

      const tasa = perdidos > 0 ? (rescatados / perdidos) * 100 : 0;
      setKpis({
        totalRecuperado: dinero,
        rescatados: rescatados,
        perdidos: perdidos,
        tasa,
        totalRows: perdidos // Use perdidos as total rows context
      });
    }

    if (tData) setTableRows(tData);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setTenantId(user?.app_metadata?.tenant_id ?? null);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Realtime Monitoring ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('realtime_recuperador')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'no_completados' },
        () => { loadData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'completados' },
        () => { loadData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // ── Select a strategy card (solo carga en el editor, NO modifica DB) ────────
  function handleSelectStrategy(s: Estrategia) {
    if (estrategiaActiva?.id === s.id) {
      // Deseleccionar → volver a la config base en el editor
      setEstrategiaActiva(null);
      setEditorState(fallback);
    } else {
      setEstrategiaActiva(s);
      setEditorState(s);
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
      console.error('Supabase Error (delete strategy):', error);
      return;
    }

    setNamedStrategies((prev) => prev.filter((x) => x.id !== s.id));
    // Limpiar editor si estaba seleccionada
    if (estrategiaActiva?.id === s.id) {
      setEstrategiaActiva(null);
      setEditorState(fallback);
    }
    // Si la estrategia eliminada era la activa en DB → activar la config base automáticamente
    if (s.is_active && fallback?.id) {
      const { error: e2 } = await supabase
        .from('estrategia_recuperacion')
        .update({ is_active: true })
        .eq('id', fallback.id)
        .eq('tenant_id', tenantId);
      if (e2) console.error('Supabase Error (activate fallback after delete):', e2);
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

  // ── Save (update existing o insert nueva config base) ────────────────────
  async function handleSave() {
    if (!editorState || !tenantId) return;
    setSaving(true);

    // Si ninguna estrategia del tenant está activa (ni la actual ni otras), forzar is_active = true
    const hayOtraActiva = namedStrategies.some((s) => s.is_active && s.id !== (estrategiaActiva?.id || fallback?.id))
      || (fallback?.is_active && !estrategiaActiva);
    const effectiveIsActive = editorState.is_active || !hayOtraActiva;

    const payload = {
      nombre:         editorState.nombre,
      is_active:      effectiveIsActive,
      msg1_active:    editorState.msg1_active,
      msg1_template:  editorState.msg1_template,
      msg1_delay_min: editorState.msg1_delay_min,
      msg2_active:    editorState.msg2_active,
      msg2_template:  editorState.msg2_template,
      msg2_delay_min: editorState.msg2_delay_min,
      msg3_active:    editorState.msg3_active,
      msg3_template:  editorState.msg3_template,
      msg3_delay_min: editorState.msg3_delay_min,
      tenant_id:      tenantId,
    };

    // Si hay un ID real (estrategia existente en DB) → update; si no → insert nueva config base
    const targetId = estrategiaActiva?.id || fallback?.id;
    if (targetId) {
      // Exclusividad: si esta estrategia queda activa, desactivar todas las demás del tenant
      if (effectiveIsActive) {
        const { error: eExcl } = await supabase
          .from('estrategia_recuperacion')
          .update({ is_active: false })
          .neq('id', targetId)
          .eq('tenant_id', tenantId);
        if (eExcl) console.error('Supabase Error (exclusivity deactivate):', eExcl);
      }
      const { error } = await supabase
        .from('estrategia_recuperacion')
        .update(payload)
        .eq('id', targetId)
        .eq('tenant_id', tenantId);
      if (error) console.error('Supabase Error (save update):', error);
    } else {
      // Primer guardado del tenant: dejar que la DB genere el UUID
      const { error } = await supabase
        .from('estrategia_recuperacion')
        .insert({ ...payload, nombre: null });
      if (error) console.error('Supabase Error (save insert):', error);
    }

    await loadData();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Create new named strategy ────────────────────────────────────────────
  async function handleCreate() {
    const name = newName.trim();
    if (!name || !editorState || !tenantId) return;
    setCreating(true);

    // La nueva estrategia siempre nace activa → desactivar todas las existentes primero
    const { error: eExcl } = await supabase
      .from('estrategia_recuperacion')
      .update({ is_active: false })
      .eq('tenant_id', tenantId);
    if (eExcl) console.error('Supabase Error (exclusivity on create):', eExcl);

    const { data, error } = await supabase.from('estrategia_recuperacion').insert({
      nombre:         name,
      tenant_id:      tenantId,
      is_active:      true,
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

    if (error) {
      console.error('Supabase Error (create strategy):', error);
    } else if (data) {
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
    <div className="p-8 lg:p-12 space-y-10 animate-in fade-in duration-500">

      {/* 1. HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#2c2f31] dark:text-white mb-2">Recuperación de Carritos</h2>
          <p className="text-[#595c5e] dark:text-slate-400 max-w-2xl">Gestiona y automatiza la recuperación de ventas perdidas mediante estrategias personalizadas de contacto y recordatorios inteligentes.</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900/60 p-3 px-5 rounded-xl shadow-sm border border-[#eef1f3] dark:border-slate-800/50 shrink-0 ml-6">
          <div className="text-right">
            <p className="text-sm font-semibold text-[#595c5e] dark:text-slate-400">{editorState.is_active ? 'Estrategia Activa' : 'Estrategia Inactiva'}</p>
            <p className="text-[10px] text-[#abadaf] dark:text-slate-600">Guardar para aplicar</p>
          </div>
          <Toggle checked={editorState.is_active} onChange={() => update('is_active', !editorState.is_active)} />
        </div>
      </div>

      {/* 2. KPI GRID - 4 white cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Dinero Recuperado */}
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-[#abadaf]/10 dark:border-slate-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-12 h-12 text-emerald-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] dark:text-slate-500 mb-1">Dinero Total Recuperado</p>
          <h3 className="text-3xl font-extrabold text-[#2c2f31] dark:text-white">{formatCLP(kpis.totalRecuperado)}</h3>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span>Ventas recuperadas por el bot</span>
          </div>
        </div>
        {/* Card 2: Carritos Rescatados */}
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-[#abadaf]/10 dark:border-slate-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart className="w-12 h-12 text-[var(--primary)]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] dark:text-slate-500 mb-1">Carritos Rescatados</p>
          <h3 className="text-3xl font-extrabold text-[#2c2f31] dark:text-white">{kpis.rescatados}</h3>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Meta alcanzada</span>
          </div>
        </div>
        {/* Card 3: Carritos Perdidos */}
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-[#abadaf]/10 dark:border-slate-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="w-12 h-12 text-rose-500" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] dark:text-slate-500 mb-1">Carritos Perdidos</p>
          <h3 className="text-3xl font-extrabold text-[#2c2f31] dark:text-white">{kpis.perdidos}</h3>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <TrendingDown className="w-4 h-4" />
            <span>Requiere atención</span>
          </div>
        </div>
        {/* Card 4: Tasa Donut */}
        {(() => {
          const R = 48; const circ = 2 * Math.PI * R;
          const filled = (kpis.tasa / 100) * circ;
          return (
            <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-[#abadaf]/10 dark:border-slate-800/50 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] dark:text-slate-500 mb-4">Tasa de Recuperación</p>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r={R} fill="transparent" stroke="#eef1f3" strokeWidth="8" className="dark:stroke-slate-700" />
                    <circle cx="56" cy="56" r={R} fill="transparent" stroke="var(--primary)" strokeWidth="8" strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold text-[#2c2f31] dark:text-white">{kpis.tasa.toFixed(1)}%</span>
                    <span className="text-[10px] text-[#595c5e] dark:text-slate-400 font-semibold">GLOBAL</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. SEQUENCE SECTION */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-[#2c2f31] dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--primary)]" />
          Secuencia de Recuperación Automática
        </h3>

        {/* Strategy selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {namedStrategies.map((s) => (
            <div key={s.id} className="relative group/card flex-shrink-0">
              <button
                onClick={() => handleSelectStrategy(s)}
                className={`min-w-[140px] flex flex-col gap-0.5 px-4 py-3 rounded-xl border text-left transition-all ${
                  estrategiaActiva?.id === s.id
                    ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/30 text-[var(--primary)] dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400'
                    : 'bg-white dark:bg-slate-800/40 border-[#abadaf]/15 dark:border-slate-700/30 text-[#595c5e] dark:text-slate-300 hover:border-[var(--primary)]/20'
                }`}
              >
                <p className="text-xs font-bold truncate max-w-[120px]">{s.nombre}</p>
                <p className="text-[9px] opacity-60">{[s.msg1_active && 'M1', s.msg2_active && 'M2', s.msg3_active && 'M3'].filter(Boolean).join(' · ')}</p>
                {s.is_active && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400">● Activa</span>}
              </button>
              <button
                onClick={(e) => handleDelete(s, e)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-[#abadaf]/20 dark:border-slate-600 flex items-center justify-center text-[#595c5e] dark:text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 dark:hover:bg-rose-500/80 dark:hover:text-white dark:hover:border-rose-500 transition-all opacity-0 group-hover/card:opacity-100 shadow-sm"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {/* Create strategy button */}
          {!showCreate ? (
            <button
              onClick={() => { setShowCreate(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex-shrink-0 min-w-[140px] flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-dashed border-[#abadaf]/30 dark:border-slate-700 text-[#595c5e] dark:text-slate-500 hover:border-[var(--primary)]/30 hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] dark:hover:bg-violet-500/5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px] font-bold">Crear Estrategia</span>
            </button>
          ) : (
            <div className="flex-shrink-0 min-w-[200px] flex flex-col gap-3 p-4 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-subtle)] dark:border-violet-500/30 dark:bg-violet-500/5">
              <p className="text-[10px] font-bold text-[var(--primary)] dark:text-violet-400 uppercase tracking-widest">Nueva estrategia</p>
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setNewName(''); } }}
                placeholder="Nombre..."
                className="w-full bg-white dark:bg-slate-800/80 border border-[#abadaf]/20 dark:border-slate-700/50 rounded-lg px-3 py-2 text-xs text-[#2c2f31] dark:text-white placeholder-[#abadaf] dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 flex items-center justify-center gap-1 py-1.5 aurora-gradient hover:opacity-90 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50">
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Guardar
                </button>
                <button onClick={() => { setShowCreate(false); setNewName(''); }} className="w-8 flex items-center justify-center py-1.5 bg-white dark:bg-slate-800 hover:bg-[#eef1f3] dark:hover:bg-slate-700 text-[#595c5e] dark:text-slate-400 rounded-lg border border-[#abadaf]/20 dark:border-transparent transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3 Message Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Save button - right aligned, Stitch style */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all active:scale-[0.98] ${
              saved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                : 'aurora-gradient text-white shadow-[0_10px_20px_-5px_rgba(139,92,246,0.35)] hover:opacity-90 hover:scale-[1.02]'
            }`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : saved ? <><CheckCircle2 className="w-4 h-4" /> ¡Estrategia Guardada!</>
              : <><Save className="w-4 h-4" /> {estrategiaActiva ? `Guardar "${estrategiaActiva.nombre}"` : 'Guardar Configuración Base'}</>
            }
          </button>
        </div>
      </div>

      {/* 4. TEMPLATES SECTION - bg-[#eef1f3] container */}
      <div className="bg-[#eef1f3] dark:bg-slate-900/40 rounded-2xl p-8 border border-white/40 dark:border-slate-800/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h4 className="font-bold text-2xl text-[#2c2f31] dark:text-white">Añadir Plantillas</h4>
            <p className="text-[#595c5e] dark:text-slate-400 text-sm mt-1">Copia y pega el nombre de la plantilla APROBADA por Meta para tu flujo.</p>
          </div>
          {/* Search + idioma + add input */}
          <div className="flex gap-2 w-full md:w-auto">
            <input
              value={newPlantillaNombre}
              onChange={(e) => setNewPlantillaNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlantilla()}
              placeholder="ej: recordatorio_carrito"
              className="flex-1 md:w-52 pl-4 pr-4 py-3 bg-white dark:bg-slate-800/60 border-none dark:border dark:border-slate-700/50 rounded-xl text-sm text-[#2c2f31] dark:text-slate-200 placeholder-[#abadaf] dark:placeholder-slate-600 focus:ring-2 focus:ring-[var(--primary)]/20 shadow-sm"
            />
            <select
              value={newPlantillaIdioma}
              onChange={(e) => setNewPlantillaIdioma(e.target.value)}
              className="bg-white dark:bg-slate-800/60 border-none dark:border dark:border-slate-700/50 rounded-xl px-3 py-3 text-xs text-[#2c2f31] dark:text-slate-200 font-medium focus:ring-2 focus:ring-[var(--primary)]/20 shadow-sm shrink-0"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.1em 1.1em', paddingRight: '2rem', appearance: 'none' }}
            >
              {IDIOMAS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
            <button
              onClick={handleAddPlantilla}
              disabled={addingPlantilla || !newPlantillaNombre.trim()}
              className="aurora-gradient hover:opacity-90 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {addingPlantilla ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="hidden md:inline">Crear Nueva Plantilla</span>
            </button>
          </div>
        </div>

        {/* Existing plantillas as pill buttons */}
        {plantillas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {plantillas.map((p) => (
              <div key={p.id} className="group/chip flex items-center gap-2 bg-white dark:bg-slate-800/60 hover:bg-white rounded-full px-5 py-3 text-sm font-medium border border-transparent hover:border-[var(--primary)]/20 hover:shadow-md transition-all cursor-default">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] opacity-60 shrink-0" />
                <span className="text-[#595c5e] dark:text-slate-300 group-hover/chip:text-[var(--primary)]">{p.nombre.split('|')[0]}</span>
                {p.nombre.includes('|') && (
                  <span className="text-[9px] font-bold text-[#abadaf] dark:text-slate-500 bg-[#eef1f3] dark:bg-slate-700/50 rounded px-1.5 py-0.5">{p.nombre.split('|')[1]}</span>
                )}
                <button
                  onClick={() => handleDeletePlantilla(p.id)}
                  className="ml-1 text-[#abadaf] dark:text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover/chip:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. REAL-TIME TABLE */}
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl overflow-hidden shadow-[0px_10px_40px_rgba(0,0,0,0.02)] dark:shadow-none border border-[#abadaf]/10 dark:border-slate-800/50">
        <div className="px-8 py-6 border-b border-[#abadaf]/10 dark:border-slate-800/50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#2c2f31] dark:text-white">Registro en Tiempo Real</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-[#595c5e] dark:text-slate-400">Escaneando carritos...</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left" style={{ minWidth: '800px' }}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#eef1f3] dark:bg-slate-800/50">
                  {['Cliente', 'Teléfono', 'Monto', 'Estado', 'Fuente', 'Mensaje 1', 'Mensaje 2', 'Mensaje 3'].map((h) => (
                    <th key={h} className="px-6 py-4 text-[0.6875rem] font-bold uppercase tracking-wider text-[#595c5e] dark:text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#abadaf]/8 dark:divide-slate-800/40">
                {tableRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-[#abadaf] dark:text-slate-600">Sin registros todavía</td></tr>
                ) : tableRows.map((row) => {
                  const st = statusStyle(row.status);
                  const src = sourceStyle(row.source);
                  const initials = (row.buyer_name ?? '??').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <tr key={row.commerce_order} className="hover:bg-[#eef1f3]/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--primary-subtle)] dark:bg-slate-800 flex items-center justify-center text-[var(--primary)] dark:text-slate-300 text-xs font-bold shrink-0">{initials}</div>
                          <span className="font-medium text-sm text-[#2c2f31] dark:text-slate-200 whitespace-nowrap">{row.buyer_name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#595c5e] dark:text-slate-400 whitespace-nowrap">{row.buyer_phone ?? '—'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#2c2f31] dark:text-white whitespace-nowrap">{row.amount != null ? formatCLP(Number(row.amount)) : '—'}</td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${st.cls}`}>{st.label}</span></td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${src.cls}`}>{src.label}</span></td>
                      <td className="px-6 py-4">{msgBadge(row.recipt_msj1)}</td>
                      <td className="px-6 py-4">{msgBadge(row.recipt_msj2)}</td>
                      <td className="px-6 py-4">{msgBadge(row.recipt_msj3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-8 py-4 bg-[#eef1f3]/30 dark:bg-slate-800/20 border-t border-[#abadaf]/10 dark:border-slate-800/40 flex justify-center">
          <button className="text-sm font-bold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors flex items-center gap-1">
            Ver historial completo de transacciones
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
