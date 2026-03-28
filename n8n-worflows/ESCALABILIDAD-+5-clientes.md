# 🚀 Guía de Escalabilidad para +5 Clientes — Alpha (POLARIS)

**📅 Creado:** 28 de Marzo de 2026
**👤 Contexto:** Actualmente Alpha opera con 4 tenants (Premia2, MyTeato, MeTime, Alpha-Admin).
**⚡ Trigger de implementación:** Aplicar cuando se incorpore el 5° cliente activo.

> **Estado actual (hasta 4 clientes): CORRECTO y no requiere cambios.**
> Esta guía es una hoja de ruta FUTURA, no una urgencia presente.

---

## 🧠 Principio Base

El bottleneck de escalar no está en la base de datos (el RLS + tenant_id ya lo maneja automáticamente),
sino en el **mantenimiento de los flujos de n8n**: actualmente cada cliente tiene su propio flujo
de recuperador con la lógica de negocio duplicada. Con 4 clientes es manejable. Con 10+, un bug
en la lógica requiere editar 10 flujos.

---

## 📐 Arquitectura Objetivo (Post 5 clientes)

### Situación ACTUAL (correcta hasta 4 clientes):
```
recuperador_Premia2  → [Webhook] + [Lógica completa] + [WhatsApp Premia2]
recuperador_MyTeato  → [Webhook] + [Lógica completa] + [WhatsApp MyTeato]
recuperador_MeTime   → [Webhook] + [Lógica completa] + [WhatsApp MeTime]
Alpha_msj2           → [Cron único — ya es compartido ✅]
Alpha_msj3           → [Cron único — ya es compartido ✅]
```

### Situación OBJETIVO (para 5+ clientes):
```
recuperador_Premia2  → [Webhook + tenant_id] ──▶ Sub-workflow "Motor" ──▶ [WhatsApp Premia2]
recuperador_MyTeato  → [Webhook + tenant_id] ──▶ Sub-workflow "Motor" ──▶ [WhatsApp MyTeato]
recuperador_MeTime   → [Webhook + tenant_id] ──▶ Sub-workflow "Motor" ──▶ [WhatsApp MeTime]
recuperador_ClienteN → [Webhook + tenant_id] ──▶ Sub-workflow "Motor" ──▶ [WhatsApp ClienteN]

⭐ Sub-workflow "Motor Recuperador" (1 solo, compartido)
    → Formatea teléfono a estándar 569...
    → Verifica duplicados por commerce_order + tenant_id
    → Kill-switch de atribución (wsp_recup)
    → Escribe en Supabase con tenant_id dinámico
    → Aplica delays desde estrategia_recuperacion

Alpha_msj2  → [Cron único — sin cambios]
Alpha_msj3  → [Cron único — sin cambios]
```

**Lo que ahorras:** Un bug en la lógica de deduplicación = 1 edición en lugar de N.

---

## 🗄️ Cambios en Base de Datos (Supabase)

### 1. Añadir columna `config` a tabla `tenants`
```sql
ALTER TABLE public.tenants
ADD COLUMN config JSONB DEFAULT '{}';

-- Poblar para cada cliente:
UPDATE public.tenants SET config = '{
  "whatsapp_phone_id": "711342198729291",
  "whatsapp_credential_name": "WhatsApp Premia2_Bot",
  "logo_url": "https://i.postimg.cc/Cx9ZdP5F/Premia2Logo1.png",
  "brand_name": "Premia2",
  "currency": "CLP",
  "timezone": "America/Santiago",
  "bot_source_tag": "wsp_recup",
  "n8n_webhook_url": "https://n8n.srv.../webhook/premia2-recuperador"
}' WHERE slug = 'premia2';
```

### 2. Asegurar un registro de `agent_config` por tenant
```sql
-- Actualmente hay 1 solo registro global.
-- Con 5+ clientes, cada tenant necesita su propio system_prompt.
-- La tabla ya tiene tenant_id; solo hay que insertar un registro por cliente.

INSERT INTO public.agent_config (tenant_id, system_prompt, temperature)
VALUES ('NUEVO_TENANT_UUID', 'Eres el asistente de [Nombre Cliente]...', 0.7);
```

---

## 🔄 Cambios en n8n

### Paso 1: Crear Sub-workflow "Motor Recuperador Alpha"
Extraer de cualquiera de los flujos actuales todos los nodos **entre** el Webhook y el nodo WhatsApp:
- Edit Fields (normalización de teléfono)
- Get many rows1 (verificación duplicados)
- If2 (¿existe ya?)
- Pedidos / Completados / No Completados (escritura Supabase)
- If3, If4 (kill-switch atribución)
- Wait, Loop Over Items, Get many rows (estrategia)
- If, Wait1, Get a row, If1 (lógica de timing)

Este Sub-workflow recibe como input: `{ tenant_id, ticket_data }` y retorna el control al flujo padre.

### Paso 2: Simplificar cada flujo de cliente a 3 nodos:
```
[Webhook] ──▶ [Set: añadir tenant_id al payload] ──▶ [Execute Sub-workflow "Motor"] ──▶ [WhatsApp Cliente]
```

### Paso 3: Para onboarding de nuevo cliente (checklist):
- [ ] Insertar fila en `tenants` con `config` JSONB completo
- [ ] Insertar fila en `tenant_users` vinculando el usuario al tenant
- [ ] Insertar fila en `agent_config` con system prompt personalizado
- [ ] Crear flujo n8n simplificado (3 nodos) copiando el template
- [ ] Configurar webhook en el e-commerce del cliente apuntando a la nueva URL

---

## ✅ Lo que NO cambia (ya es correcto y escalable)

| Componente | Estado | Por qué no tocar |
|---|---|---|
| RLS en Supabase | ✅ Permanece igual | El tenant_id en JWT filtra automáticamente |
| `Alpha_msj2` y `Alpha_msj3` | ✅ Permanece igual | Ya son crons compartidos que filtran por tenant_id |
| `get_recovery_stats()` | ✅ Permanece igual | Ya usa auth.jwt() para filtrar |
| `match_informacion()` | ✅ Permanece igual | Ya acepta filtro JSONB por tenant_id |
| `match_documents()` | ✅ Permanece igual | Ya acepta filtro JSONB por tenant_id |
| Dashboard CEO `/admin/stats` | ✅ Permanece igual | Ya agrega métricas de todos los tenants |
| Frontend Alpha | ✅ Permanece igual | La arquitectura multi-tenant ya está implementada |

---

## ⏱️ Estimación de Implementación

| Tarea | Tiempo estimado |
|---|---|
| Crear Sub-workflow "Motor" en n8n | 2-3 horas |
| Añadir columna `config` a `tenants` y poblarla | 30 min |
| Simplificar flujos existentes (3 flujos × 15 min) | 45 min |
| Insertar `agent_config` por tenant | 30 min |
| Pruebas de integración | 1-2 horas |
| **Total** | **~5 horas** |

---

## 🎯 Señales de que llegó el momento de implementar

- [ ] Se incorpora el 5° cliente activo
- [ ] Se detecta el mismo bug en más de 2 flujos de recuperador simultáneamente
- [ ] El tiempo de onboarding de un nuevo cliente supera las 2 horas
- [ ] Se quiere ofrecer a los clientes su propio panel de configuración de bot

---

*Documento generado durante la sesión de arquitectura del 28/03/2026.*
*Referencia: Conversación "Securing Alpha Multi-tenant Architecture" — POLARIS/Antigravity.*
