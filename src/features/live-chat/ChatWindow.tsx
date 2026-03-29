'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Send,
  Bot,
  User,
  AlertTriangle,
  Loader2,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  is_manual?: boolean;
}

const formatMessageContent = (content: string) => {
  if (!content) return '';
  let formatted = content.replace(/\[Used tools:[\s\S]+?\][}\]\s,.-]*/g, '');
  formatted = formatted.replace(/^[\]\}\s,.-]+/, '');
  formatted = formatted.replace(/【.*?】/g, '');
  return formatted.trim();
};

export default function ChatWindow({ sessionId, origin = 'bot', tenantId, isManualMode, setIsManualMode }: {
  sessionId: string;
  origin?: 'bot' | 'support';
  tenantId: string | null;
  isManualMode: boolean;
  setIsManualMode: (v: boolean) => void;
}) {
  // In 'support' mode the operator always has direct input — bypass bot lock
  const inputEnabled = origin === 'support' || isManualMode;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    async function fetchMessages() {
      const { data: messagesData, error: messagesError } = await supabase
        .from('n8n_chat_clientes_historial')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: true });

      if (!messagesError && messagesData) {
        setMessages(messagesData.map(m => {
          const mType = m.message?.type;
          return {
            id: m.id.toString(),
            role: (mType === 'human' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: mType === 'human' ? (m.message?.content || '') : formatMessageContent(m.message?.content || ''),
            created_at: m.created_at || m.id.toString(),
            is_manual: mType === 'human_manual' || m.message?.additional_kwargs?.is_panic_intervention
          };
        }).filter(m => m.content && m.content.trim().length > 0));
      }
      setLoading(false);
      scrollToBottom();
    }

    fetchMessages();

    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'n8n_chat_clientes_historial',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const message = payload.new.message;
        const type = message?.type;
        setIsTyping(type === 'human');

        const newMessage: Message = {
          id: payload.new.id.toString(),
          role: type === 'human' ? 'user' : 'assistant',
          content: type === 'human' ? (message?.content || '') : formatMessageContent(message?.content || ''),
          created_at: payload.new.created_at || new Date().toISOString(),
          is_manual: type === 'human_manual' || message?.additional_kwargs?.is_panic_intervention
        };

        if (newMessage.content && newMessage.content.trim().length > 0) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(scrollToBottom, [messages, isTyping]);

  const getPhoneFromSession = (sid: string) => sid.split('@')[0];

  const activatePanicMode = async () => {
    const phone = getPhoneFromSession(sessionId);
    await supabase
      .from('session_control')
      .upsert({ session_id: phone, is_manual: true, tenant_id: tenantId }, { onConflict: 'session_id' });
    setIsManualMode(true);
  };

  const deactivatePanicMode = async () => {
    const phone = getPhoneFromSession(sessionId);
    await supabase
      .from('session_control')
      .upsert({ session_id: phone, is_manual: false, tenant_id: tenantId }, { onConflict: 'session_id' });
    setIsManualMode(false);
  };

  const N8N_WEBHOOK_URL = 'https://n8n.srv941923.hstgr.cloud/webhook/polaris-intervencion-manual';

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;
    if (!tenantId) {
      console.error('[Alpha] tenant_id no disponible — insert abortado');
      return;
    }

    const messageContent = inputValue;
    setInputValue('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      role: 'assistant',
      content: messageContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    const payload = {
      session_id: sessionId,
      tenant_id: tenantId,
      origin_type: origin,
      message: {
        type: origin === 'support' ? 'human' : 'human_manual',
        content: messageContent,
        additional_kwargs: { is_panic_intervention: origin !== 'support', source: 'alpha_frontend' },
        response_metadata: {}
      }
    };
    console.log('[Alpha] Enviando Payload:', payload);

    const { error } = await supabase
      .from('n8n_chat_clientes_historial')
      .insert(payload);

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputValue(messageContent);
      setSending(false);
      return;
    }

    try {
      const phoneNumber = sessionId.split('@')[0];
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          phone: phoneNumber,
          message: messageContent,
          origin_type: origin,
          source: 'alpha_manual_intervention'
        })
      });
    } catch (webhookError) {
      console.error('[Alpha] Error al llamar webhook n8n:', webhookError);
    }

    setSending(false);
  };

  const handleFeedback = async (messageId: string, rating: number) => {
    if (messageId.startsWith('temp-')) return;
    setFeedbackGiven(prev => ({ ...prev, [messageId]: rating }));
    await supabase
      .from('ai_feedback')
      .upsert({
        message_id: parseInt(messageId),
        rating,
        processed: false,
        tenant_id: tenantId
      }, { onConflict: 'message_id' });
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f7f9] dark:bg-[#030711] font-sans">

      {/* ── Header ── */}
      <header className="px-5 py-3.5 flex items-center gap-3 bg-white dark:bg-slate-900/80 border-b border-[#eef1f3] dark:border-white/[0.03] z-10 shrink-0 shadow-[0px_1px_6px_rgba(0,0,0,0.04)]">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--foreground)] truncate leading-tight">
            {sessionId.split('@')[0]}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-[var(--text-muted)]">En línea</span>
          </div>
        </div>

        {/* Panic / Resume */}
        {!isManualMode ? (
          <button
            onClick={activatePanicMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all text-[11px] font-bold border border-rose-200 dark:border-rose-500/20 shrink-0"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Pánico
          </button>
        ) : (
          <button
            onClick={deactivatePanicMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all text-[11px] font-bold border border-emerald-200 dark:border-emerald-500/20 shrink-0"
          >
            <Bot className="w-3.5 h-3.5" />
            Reanudar IA
          </button>
        )}
      </header>

      {/* ── Manual Mode Banner ── */}
      {isManualMode && (
        <div className="px-5 py-2 bg-rose-50 dark:bg-rose-500/10 border-b border-rose-100 dark:border-rose-500/20 flex items-center gap-2 animate-in fade-in duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
            Intervención Manual Activada
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-primary animate-spin opacity-50" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-full group animate-in slide-in-from-bottom-2 duration-200`}
              >
                {message.role === 'assistant' && (
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1.5 ml-1">
                    Agente Alpha
                  </span>
                )}

                <div className={`flex gap-2.5 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-[#eef1f3] dark:bg-slate-800/80'
                      : 'bg-primary/10 dark:bg-primary/20'
                  }`}>
                    {message.role === 'user'
                      ? <User className="w-4 h-4 text-[var(--text-muted)]" />
                      : <Bot className="w-4 h-4 text-primary" />}
                  </div>

                  {/* Bubble + meta */}
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
                    <div className={`p-3.5 rounded-xl text-[13px] leading-[1.65] tracking-tight shadow-sm ${
                      message.role === 'user'
                        ? 'bg-white dark:bg-slate-800/60 text-[var(--foreground)] rounded-tr-none'
                        : 'bg-violet-50 dark:bg-primary/10 text-[var(--foreground)] dark:text-slate-200 rounded-tl-none border border-violet-100/70 dark:border-primary/10'
                    }`}>
                      {message.content}
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[9px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Ahora</span>
                      {message.role === 'assistant' && !message.id.startsWith('temp-') && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleFeedback(message.id, 1)}
                            className={`p-1 rounded transition-all ${
                              feedbackGiven[message.id] === 1 ? 'text-emerald-500' : 'text-[var(--text-muted)] hover:text-emerald-500'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, -1)}
                            className={`p-1 rounded transition-all ${
                              feedbackGiven[message.id] === -1 ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="bg-white dark:bg-slate-800/40 px-4 py-3 rounded-xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="p-4 bg-white dark:bg-slate-900/80 border-t border-[#eef1f3] dark:border-white/[0.03]">
        {inputEnabled ? (
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe un mensaje manual..."
              className="flex-1 bg-[#eef1f3] dark:bg-slate-900/60 text-[var(--foreground)] rounded-xl px-4 py-3 text-sm focus:outline-none placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending}
              className="w-11 h-11 rounded-xl aurora-gradient text-white flex items-center justify-center hover:opacity-90 active:scale-90 disabled:opacity-40 transition-all shadow-[0_4px_12px_rgba(139,92,246,0.3)] shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#eef1f3] dark:bg-slate-900/40 rounded-xl px-4 py-3 text-sm text-[var(--text-muted)] cursor-not-allowed opacity-60 select-none">
              Gestionado por Agente IA...
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#eef1f3] dark:bg-slate-900/40 flex items-center justify-center opacity-40 cursor-not-allowed shrink-0">
              <Send className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
