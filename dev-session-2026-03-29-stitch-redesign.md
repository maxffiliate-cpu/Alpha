# Dev Session — 2026-03-29: Stitch Redesign & Multi-tenancy Fixes

## Resumen ejecutivo
Sesión de desarrollo enfocada en tres áreas: (1) aplicar el sistema de diseño "Luminous Executive" (Stitch) al módulo live-chat, (2) correcciones de color en AgentSettings, (3) ajustes de modo predeterminado a light mode, y (4) auditoría de multi-tenancy con corrección de Golden Rule.

---

## 1. Cambios realizados

### Live-chat — Stitch Desktop Layout
**Archivos modificados:**
- `src/app/(dashboard)/conversations/page.tsx`
- `src/features/live-chat/ChatWindow.tsx`
- `src/features/live-chat/ChatInsights.tsx`

**Qué cambió:**
- Eliminado el wrapper `PhoneMockup` por completo.
- Layout de 3 columnas flat (sidebar izquierdo + chat central + insights derecho).
- Toda la UI oscura hardcodeada (`bg-[#030711]`, `border-slate-800`) reemplazada por tokens CSS (`var(--background)`, `var(--surface)`, `var(--border)`).
- Sidebar izquierdo: `bg-[var(--surface)]` con acento `border-l-4 border-primary` en ítem activo.
- Input de búsqueda: `bg-[#eef1f3]` (contenedor tonal Stitch).
- Centro: `ChatWindow` directo con fondo `bg-[#f5f7f9] dark:bg-[#030711]`.
- Panel derecho: `bg-[#eef1f3] dark:bg-[#030711]` con todas las tarjetas en `bg-white`.

**ChatWindow — nuevo diseño:**
- Header blanco (`bg-white dark:bg-slate-900/80`) con avatar, punto online, y botón Panic/Resume inline como pill.
- Banner rosa cuando `isManualMode === true`.
- Burbujas cliente: `bg-white rounded-tr-none shadow-sm`.
- Burbujas agente: `bg-violet-50 dark:bg-primary/10 rounded-tl-none`.
- Footer: deshabilitado con placeholder cuando IA controla; activo con input `bg-[#eef1f3]` + botón `aurora-gradient` cuando manual.
- Toda la lógica preservada: Supabase realtime, panic mode, feedback, n8n webhook.

**ChatInsights — nuevo diseño:**
- Todas las tarjetas: `bg-white rounded-2xl shadow-[0px_4px_20px_rgba(112,42,225,0.04)]`.
- Sentimiento: donut gauge SVG de círculo completo (reemplazó semicírculo).
- CSAT: estrellas `fill-amber-400`.
- Barras de progreso para Precisión IA (violeta) y Empatía (esmeralda).
- Tarjeta de estado Alpha: fondo `aurora-gradient` sólido.

---

### AgentSettings — colores de inputs
**Archivo:** `src/features/agent-settings/AgentSettings.tsx`

**Qué cambió:**
- Textarea: `bg-[#eef1f3] dark:bg-slate-900/40 border-0` (antes `bg-slate-800/50`).
- Contenedor del slider de temperatura: `bg-[#eef1f3] dark:bg-slate-900/30 border-0`.
- Select de modelo: `bg-[#eef1f3] dark:bg-slate-900/60 border-0`.
- Track del slider: clase `stitch-slider` con `bg-white dark:bg-slate-700`.

---

### AgentSettings — Golden Rule (multi-tenancy)
**Archivo:** `src/features/agent-settings/AgentSettings.tsx`

**Problema:** El upsert a `agent_config` no incluía `tenant_id`, dependiendo únicamente de RLS.

**Fix aplicado:**
```tsx
const handleSave = async () => {
  setSaving(true);
  setStatus('idle');
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id;
  const { error } = await supabase
    .from('agent_config')
    .upsert({
      id: config.id,
      system_prompt: config.system_prompt,
      temperature: config.temperature,
      tenant_id: tenantId   // ← Golden Rule aplicada
    });
  // ...
};
```

También se eliminó la variable `error` no usada del destructuring en `loadConfig`.

---

### Light mode como predeterminado
**Archivo:** `src/context/ThemeContext.tsx`

```tsx
// Antes:
const [theme, setTheme] = useState<Theme>('dark');
const initial = stored ?? 'dark';

// Después:
const [theme, setTheme] = useState<Theme>('light');
const initial = stored ?? 'light';
```

Usuarios con `'dark'` guardado en `localStorage` siguen viendo dark mode. Solo afecta a nuevos usuarios o quienes no tengan preferencia guardada.

**Archivo:** `src/app/login/page.tsx`

Reemplazados colores hardcodeados dark por tokens CSS:
- `bg-[#020617]` → `bg-[var(--background)]`
- `text-white` → `text-[var(--foreground)]`
- `text-slate-400` → `text-[var(--text-muted)]`
- Inputs: `bg-slate-900/50 border border-slate-800` → `bg-[#eef1f3] dark:bg-slate-900/50 border-0`
- `border-slate-800` → `border-[var(--border)]`

---

## 2. Auditoría de multi-tenancy (Premia2 vs MeTime)

### Resultado del frontend
✅ **Sin problemas en el frontend.** No hay nombres de tenant hardcodeados. Todos los queries usan `user.app_metadata.tenant_id` dinámicamente.

### Diagnóstico de MeTime
El problema es 100% en el backend de Supabase. Causas probables:
1. El usuario de MeTime no tiene `tenant_id` en `app_metadata`.
2. El `custom_access_token_hook` no está inyectando `tenant_id` en el JWT.
3. No existe fila en `agent_config` para el UUID de MeTime.

### SQL diagnóstico (ejecutar en Supabase SQL Editor)

```sql
-- 1. Verificar app_metadata de todos los usuarios
SELECT u.email,
       u.app_metadata->>'tenant_id' AS tenant_id,
       u.app_metadata->>'tenant_name' AS tenant_name
FROM auth.users u
ORDER BY u.created_at;

-- 2. Verificar rows en agent_config
SELECT * FROM agent_config;

-- 3. Verificar que el hook existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name ILIKE '%token%hook%';
```

---

## 3. Sistema de diseño — Referencia rápida Stitch

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#f5f7f9` (light) / `#020617` (dark) | Fondo de página |
| `--surface` | `#ffffff` (light) / `#0f172a` (dark) | Sidebar, panels |
| `--border` | `#e2e8f0` (light) / `rgba(255,255,255,0.06)` (dark) | Separadores sutiles |
| `bg-[#eef1f3]` | Fijo | Contenedores tonales (inputs, sliders) |
| `bg-white` | Fijo | Tarjetas sobre fondo tonal |
| `aurora-gradient` | `linear-gradient(135deg, #8B5CF6 → #6366f1 → #06b6d4)` | CTA buttons, send button |
| Shadow tintada | `0px 4px 20px rgba(112,42,225,0.04)` | Tarjetas flotantes |
| Active list item | `border-l-4 border-primary bg-primary/5` | Sidebar nav items |

**Regla "No-Line":** Nunca usar borders de 1px para seccionar. Usar transición tonal (`#ffffff` sobre `#eef1f3`).

---

## 4. Commit de referencia
- **Commit:** `d231c582`
- **Mensaje:** "fix(agent-settings): apply Golden Rule — add tenant_id to agent_config upsert"
- **Branch:** main

---

*Sesión documentada: 2026-03-29*
*Scope: Alpha (Multi-tenant SaaS)*
