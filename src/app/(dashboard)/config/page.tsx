'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Plug,
  Shield,
  BrainCircuit,
  Save,
  CheckCircle2,
  Loader2,
  Lock,
  ChevronRight,
  Globe,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Link2,
  AlertTriangle,
  Sparkles,
  MessageSquareCode,
} from 'lucide-react';
import { supabase as supabaseSingleton } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  email: string;
  tenantId: string;
  tenantName: string;
  role: string;
}

interface AgentConfig {
  id: string;
  system_prompt: string;
  temperature: number;
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'perfil',           label: 'Perfil del Negocio',  icon: Building2,        live: true  },
  { id: 'agente',           label: 'Agente IA',           icon: BrainCircuit,     live: true  },
  { id: 'notificaciones',   label: 'Notificaciones',      icon: Bell,             live: false },
  { id: 'integraciones',    label: 'Integraciones',       icon: Plug,             live: false },
  { id: 'facturacion',      label: 'Facturación',         icon: CreditCard,       live: false },
  { id: 'seguridad',        label: 'Seguridad',           icon: Shield,           live: true  },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--primary-subtle)] border border-[var(--primary)]/20 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-[var(--primary)]" />
      </div>
      <p className="text-base font-bold text-[var(--foreground)]">Próximamente</p>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
        Esta sección está en desarrollo. Estará disponible en la próxima actualización de Alpha.
      </p>
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-panel rounded-2xl p-6 space-y-5 ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">{children}</p>;
}

function ReadonlyField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        {icon && <span className="text-[var(--text-muted)] shrink-0">{icon}</span>}
        <span className="text-sm font-semibold text-[var(--foreground)]">{value || '—'}</span>
      </div>
    </div>
  );
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
        saved
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'aurora-gradient text-white shadow-[0_8px_20px_-5px_rgba(139,92,246,0.35)] hover:opacity-90'
      }`}
    >
      {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
       : saved  ? <><CheckCircle2 className="w-4 h-4" /> Guardado</>
       :          <><Save className="w-4 h-4" /> Guardar cambios</>}
    </button>
  );
}

// ─── Tab: Perfil del Negocio ──────────────────────────────────────────────────

function PerfilTab({ profile }: { profile: UserProfile }) {
  const [tenantName, setTenantName] = useState(profile.tenantName);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    // Update tenant name in DB if tenants table exists
    const { error } = await supabase
      .from('tenants')
      .update({ name: tenantName.trim() })
      .eq('id', profile.tenantId);
    if (error) console.error('Supabase Error (update tenant name):', error);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Perfil del Negocio</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Información básica de tu cuenta en Alpha.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nombre del negocio — editable */}
        <SectionCard className="md:col-span-2">
          <div className="flex items-center gap-2 text-[var(--primary)] mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Identidad</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Nombre del negocio</FieldLabel>
              <input
                value={tenantName}
                onChange={(e) => { setTenantName(e.target.value); setSaved(false); }}
                placeholder="Ej: Premia2"
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/10 outline-none text-sm font-semibold text-[var(--foreground)] transition-all"
              />
            </div>
            <ReadonlyField
              label="Tenant ID"
              value={`${profile.tenantId.slice(0, 8)}…${profile.tenantId.slice(-6)}`}
              icon={<Lock className="w-3.5 h-3.5" />}
            />
          </div>
        </SectionCard>

        {/* Cuenta */}
        <SectionCard>
          <div className="flex items-center gap-2 text-[var(--primary)] mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Cuenta</span>
          </div>
          <ReadonlyField label="Email"  value={profile.email}  icon={<Mail className="w-3.5 h-3.5" />} />
          <ReadonlyField label="Rol"    value={profile.role}   icon={<Shield className="w-3.5 h-3.5" />} />
        </SectionCard>

        {/* Región */}
        <SectionCard>
          <div className="flex items-center gap-2 text-[var(--primary)] mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Región</span>
          </div>
          <ReadonlyField label="Zona horaria"  value="America/Santiago"  icon={<Clock className="w-3.5 h-3.5" />} />
          <ReadonlyField label="Moneda"        value="CLP — Peso Chileno" icon={<DollarSign className="w-3.5 h-3.5" />} />
          <p className="text-[10px] text-[var(--text-muted)] pt-1">
            Región gestionada por Polaris Infrastructure. Contacta a soporte para cambiarla.
          </p>
        </SectionCard>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Tab: Agente IA ───────────────────────────────────────────────────────────

function AgenteTab({ tenantId }: { tenantId: string }) {
  const [config, setConfig]   = useState<AgentConfig>({ id: '', system_prompt: '', temperature: 0.7 });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabaseSingleton
        .from('agent_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1);
      if (data?.[0]) setConfig({ id: data[0].id, system_prompt: data[0].system_prompt, temperature: data[0].temperature });
      setLoaded(true);
    }
    if (tenantId) load();
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabaseSingleton
      .from('agent_config')
      .upsert({ id: config.id, system_prompt: config.system_prompt, temperature: config.temperature, tenant_id: tenantId });
    if (error) console.error('Supabase Error (agent config):', error);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!loaded) return (
    <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Cargando configuración del agente…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Agente IA</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Personalidad y comportamiento de tu agente de recuperación y chat.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* System prompt */}
        <SectionCard className="lg:col-span-2">
          <div className="flex items-center gap-2 text-violet-400 mb-1">
            <BrainCircuit className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Instrucciones del Sistema</span>
          </div>
          <FieldLabel>System Prompt</FieldLabel>
          <textarea
            value={config.system_prompt}
            onChange={(e) => { setConfig({ ...config, system_prompt: e.target.value }); setSaved(false); }}
            rows={10}
            placeholder="Ej: Eres un asistente de ventas amigable para Premia2. Responde siempre en español…"
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/10 outline-none text-sm text-[var(--foreground)] resize-none transition-all leading-relaxed"
          />
        </SectionCard>

        {/* Temperatura + Modelo */}
        <div className="space-y-5">
          <SectionCard>
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Creatividad</span>
            </div>
            <FieldLabel>Temperatura</FieldLabel>
            <input
              type="range" min="0" max="1.5" step="0.1"
              value={config.temperature}
              onChange={(e) => { setConfig({ ...config, temperature: parseFloat(e.target.value) }); setSaved(false); }}
              className="stitch-slider w-full h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Preciso</span>
              <span className="px-3 py-1 rounded-full bg-[var(--primary-subtle)] border border-[var(--primary)]/20 text-[var(--primary)] text-sm font-black tabular-nums">
                {config.temperature.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Creativo</span>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <MessageSquareCode className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Modelo</span>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-sm font-bold text-[var(--foreground)]">Gemini 3 Flash</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Alpha Optimized · Polaris Infra</p>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">El modelo es gestionado por Polaris Infrastructure y no es modificable.</p>
          </SectionCard>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Tab: Seguridad ───────────────────────────────────────────────────────────

function SeguridadTab({ profile }: { profile: UserProfile }) {
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const supabase = createClient();

  const handlePasswordReset = async () => {
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    if (error) console.error('Password reset error:', error);
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Seguridad</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gestiona el acceso y la seguridad de tu cuenta.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sesión activa */}
        <SectionCard>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Sesión Activa</span>
          </div>
          <ReadonlyField label="Usuario autenticado" value={profile.email} icon={<Mail className="w-3.5 h-3.5" />} />
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">Sesión verificada y activa</span>
          </div>
        </SectionCard>

        {/* Contraseña */}
        <SectionCard>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Contraseña</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Te enviaremos un enlace de restablecimiento a <span className="font-bold text-[var(--foreground)]">{profile.email}</span>.
          </p>
          <button
            onClick={handlePasswordReset}
            disabled={sending || sent}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              sent
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/30'
            } disabled:opacity-60`}
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
             : sent   ? <><CheckCircle2 className="w-4 h-4" /> Enlace enviado a tu email</>
             :          <><Mail className="w-4 h-4" /> Enviar enlace de cambio</>}
          </button>
        </SectionCard>

        {/* Aviso de seguridad */}
        <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Autenticación Multi-Factor</p>
            <p className="text-xs text-amber-400/70 font-medium mt-0.5">
              MFA estará disponible próximamente. Por ahora, usa una contraseña segura y única para proteger tu cuenta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const appMeta   = user.app_metadata ?? {};
      const tenantId  = appMeta.tenant_id ?? '';
      let tenantName  = appMeta.tenant_name ?? '';

      // Enriquecer con tabla tenants si está disponible
      if (!tenantName && tenantId) {
        const { data } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
        if (data?.name) tenantName = data.name;
      }

      setProfile({
        email:      user.email ?? '',
        tenantId,
        tenantName: tenantName || 'Mi Negocio',
        role:       appMeta.role ?? 'Operador',
      });
      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Cargando configuración…</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-8 md:p-10 max-w-6xl mx-auto animate-in fade-in duration-500">

      {/* ── Header ── */}
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Configuración</h1>
        <p className="text-[var(--text-muted)] mt-1 font-medium">
          {profile.tenantName} · <span className="text-[var(--text-muted)]">{profile.email}</span>
        </p>
      </header>

      {/* ── Layout: tabs left + content right ── */}
      <div className="flex gap-6 items-start">

        {/* Tab sidebar */}
        <nav className="w-56 shrink-0 glass-panel rounded-2xl p-2 sticky top-6 space-y-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl
                  text-left transition-all group text-sm font-semibold
                  ${isActive
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]'
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--foreground)]'} transition-colors`} />
                  <span>{tab.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!tab.live && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />}
                  {!isActive && (
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'perfil'         && <PerfilTab    profile={profile} />}
          {activeTab === 'agente'         && <AgenteTab    tenantId={profile.tenantId} />}
          {activeTab === 'notificaciones' && <ComingSoon />}
          {activeTab === 'integraciones'  && <IntegracionesTab />}
          {activeTab === 'facturacion'    && <FacturacionTab />}
          {activeTab === 'seguridad'      && <SeguridadTab  profile={profile} />}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Integraciones (informativo) ─────────────────────────────────────────

function IntegracionesTab() {
  const integrations = [
    { name: 'WhatsApp Business API', status: 'Conectado', color: 'emerald', icon: Phone,   desc: 'Mensajería automatizada de recuperación y soporte.' },
    { name: 'n8n Workflows',          status: 'Conectado', color: 'emerald', icon: Link2,   desc: 'Automatización de flujos y orquestación del agente.' },
    { name: 'Gemini AI',              status: 'Activo',    color: 'violet',  icon: BrainCircuit, desc: 'Motor de IA para respuestas y análisis de conversaciones.' },
    { name: 'Slack Alerts',           status: 'Pendiente', color: 'amber',   icon: Bell,    desc: 'Notificaciones de escalamiento en tiempo real.' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    violet:  'bg-violet-500/10  border-violet-500/20  text-violet-400',
    amber:   'bg-amber-500/10   border-amber-500/20   text-amber-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Integraciones</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Servicios y plataformas conectadas a tu cuenta de Alpha.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((int) => (
          <SectionCard key={int.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colorMap[int.color]}`}>
                  <int.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{int.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{int.desc}</p>
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${colorMap[int.color]}`}>
                {int.status}
              </span>
            </div>
          </SectionCard>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center pt-2">
        La gestión de credenciales y configuración avanzada de integraciones se realiza a través de Polaris Infrastructure.
      </p>
    </div>
  );
}

// ─── Tab: Facturación (informativo) ──────────────────────────────────────────

function FacturacionTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">Facturación</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Plan activo y detalles de tu suscripción Alpha.</p>
      </div>

      {/* Plan card */}
      <div className="glass-panel rounded-2xl p-6 border border-[var(--primary)]/20 bg-[var(--primary-subtle)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--primary)]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">Plan Actual</p>
              <p className="text-2xl font-black text-[var(--foreground)]">Alpha Pro</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Multi-tenant SaaS · Recuperador + Live Chat IA</p>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest shrink-0">
              Activo
            </span>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Recuperador', value: '✓ Incluido' },
              { label: 'Live Chat IA', value: '✓ Incluido' },
              { label: 'Soporte',      value: 'Polaris Infra' },
            ].map((f) => (
              <div key={f.label} className="p-3 rounded-xl bg-[var(--surface)]/50 border border-[var(--border)]">
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{f.label}</p>
                <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <CreditCard className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-[var(--foreground)] uppercase tracking-widest">Portal de Facturación</p>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
            El historial de pagos, facturas y gestión de suscripción estarán disponibles próximamente. Para consultas, contacta a <span className="text-[var(--primary)]">soporte@polaris.ai</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
