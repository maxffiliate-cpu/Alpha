# Contexto de Backend y Orquestación: Flujos n8n (Proyecto Alpha)

**📍 Ubicación de este directorio:** `/Alpha/n8n-worflows/`
**🎯 Propósito del Documento:** Este archivo provee el contexto técnico y lógico exclusivo para los archivos `.json` ubicados en esta carpeta, los cuales representan la infraestructura backend exportada desde n8n. No contiene lógica de frontend (React/Next.js).

## 1. Visión General del Ecosistema Local
Los archivos JSON en este directorio componen los dos motores principales de Alpha:
1. **Smart Cart Recovery (Recuperador):** Secuencias asíncronas para carritos abandonados.
2. **AI Virtual Assistant & QA:** Soporte omnicanal y auditoría de calidad de atención.

**Interacciones Externas desde este directorio:**
* **Escucha:** Recibe webhooks desde el frontend (Lovable) para iniciar flujos.
* **Lee/Escribe:** Se conecta directamente a Supabase (PostgreSQL + pgvector).
* **Comunica:** Envía mensajes a través de la API de WhatsApp Cloud.

---

## 2. Arquitectura de Base de Datos (Supabase)
El sistema opera bajo una arquitectura **Multi-Tenant estricta**. Todos los flujos y consultas deben incluir o filtrar por `tenant_id` para garantizar el aislamiento de datos entre clientes. 
* *Nota actual:* En la fase Beta, se está utilizando un hardcode temporal del `tenant_id` (`1bf4cdbb-c845-4eb3-930e-2a2613e385bb`) correspondiente al cliente "Premia2".

**Tablas Principales:**
* `pedidos`: Registro maestro de todas las intenciones de compra.
* `completados`: Registro de ventas exitosas.
* `no_completados`: Motor del dashboard analítico. Almacena carritos abandonados. Si se recuperan, su `status` cambia a `completed`.
* `estrategia_recuperacion`: Configuración del tenant (tiempos de delay, plantillas de WhatsApp, booleanos de activación).
* `n8n_chat_clientes_historial`: Memoria de PostgreSQL para el agente de IA. Almacena roles (`human`, `ai`, `human_manual`).
* `ai_feedback` y `conversation_insights`: Tablas de auditoría y QA.
* Tablas Vectoriales: `información` (datos del negocio) y `knowledge_base_feedback` (reglas de auto-corrección).

---

## 3. MOTOR 1: Smart Cart Recovery (Flujos n8n)

### 3.1. WF1: `recuperador_ALPHA` (Webhook Principal)
* **Trigger:** Webhook desde pasarela/Lovable.
* **Lógica:** 1. Limpia y formatea el teléfono a estándar (`569...`).
  2. Verifica duplicados usando `commerce_order`.
  3. **Kill Switch Inteligente (Atribución):** Si entra un pedido `completed`, revisa si proviene del bot (`source = wsp_recup`). De ser así, busca el carrito abandonado previo en `no_completados` y actualiza su estado a `completed` para detener cobros futuros y sumar al dashboard de dinero recuperado.
  4. Si es abandono nuevo, espera el delay configurado, re-verifica el estado para evitar spam, y envía el **Mensaje 1** por WhatsApp.

### 3.2. WF2: `Alpha_msj2` (Schedule - 15 min)
* **Trigger:** Cron job cada 15 minutos.
* **Lógica:** Busca en `no_completados` carritos `cancelled` que excedan el `msg2_delay_min` y cuyo `recipt_msj2` sea `NULL`. Envía el **Mensaje 2** y marca el campo con 'Enviado'.

### 3.3. WF3: `Alpha_msj3` (Schedule - 20 min)
* **Trigger:** Cron job cada 20 minutos.
* **Lógica (El Diamante de Bypass):** Evalúa si el cliente activó o desactivó el Mensaje 2 en `estrategia_recuperacion`.
  * *Ruta Estricta (`msg2_active = true`):* Exige el candado `recipt_msj2 = 'Enviado'` para disparar el Mensaje 3.
  * *Ruta Libre (`msg2_active = false`):* Ignora el candado del Mensaje 2 y dispara el Mensaje 3 basado solo en el tiempo límite.

---

## 4. MOTOR 2: AI Virtual Assistant & QA (Flujos n8n)

### 4.1. WF4: `Asistente Virtual - Clientes v4.0` (Agente Omnicanal)
* **Capacidades:** Procesa Texto, Audio (OpenAI Whisper) e Imágenes (GPT-4o Vision).
* **Buffer:** Usa Redis (`Push`/`Get`/`Delete`) para agrupar múltiples mensajes rápidos del usuario antes de procesarlos.
* **Clasificador de Intenciones:** LLM categoriza el mensaje (FAQ, Estado Pedido, Fake, Promo, Problema) y lo registra asíncronamente en Google Sheets.
* **Herramientas del Agente (LangChain):** 1. `knowledge_base_feedback` (Tool obligatoria de prioridad 1 para evitar errores repetidos).
  2. `información` (Tool secundaria para contexto del negocio).

### 4.2. WF5: `Intervención Manual` (Botón de Pánico)
* Permite a un humano tomar control de la sesión desde el dashboard. Envía el mensaje por WhatsApp y lo inyecta en la memoria SQL del agente con el flag `is_panic_intervention: true` y rol `human_manual` para dar contexto a la IA.

### 4.3. WF6: `ai_feedback` (Sistema de Aprendizaje Continuo)
* **Trigger:** Webhook accionado cuando un cliente califica negativo (`rating = -1`) una respuesta.
* **Lógica:** Un LLM compara la pregunta del usuario vs la respuesta de la IA. Si determina que hay un error real (y no un "Falso Negativo"), redacta una "Corrección Maestra" directa y la inyecta como un nuevo vector en Supabase (`knowledge_base_feedback`) para que el Agente la consuma obligatoriamente en el futuro.

### 4.4. WF7: `Chat Insights` (Auditor de Calidad BI)
* **Lógica:** Extrae los últimos 15 mensajes ordenados cronológicamente de una sesión terminada. Un LLM (`Basic LLM Chain` + `Structured Output Parser`) audita la charla y devuelve un JSON tipado con: `sentiment_category`, `sentiment_score`, `user_intent`, `csat_score`, `response_accuracy`, `urgency_level`, `escalation_required` y `actionable_insight`. Esto alimenta las métricas de calidad en el frontend.

---

## 5. Directrices para el LLM (Asistente de Código)
Al analizar, refactorizar o sugerir cambios en este ecosistema:
1. **Respeta la arquitectura Multi-Tenant:** Ninguna consulta a Supabase puede omitir el filtro `tenant_id`.
2. **Preserva los Nodos de Lógica:** No elimines los nodos "No Operation" (do nothing), son intencionales para detener ramificaciones de manera segura.
3. **Restricción de Estado:** Recuerda que la métrica de éxito del bot de recuperación se mide exclusivamente contando/sumando filas en la tabla `no_completados` donde `status = 'completed'` y `source` contiene la etiqueta del bot.