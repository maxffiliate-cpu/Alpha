'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  Loader2, 
  ChevronDown,
  ThumbsDown,
  ThumbsUp,
  Brain,
  ShieldAlert
} from 'lucide-react';

const formatMessageContent = (content: string) => {
  // Remove technical tool logs like [Used tools: ...] and anything inside those square brackets
  // The pattern usually starts with [Used tools: and ends with ]]
  return content.replace(/^\[Used tools:[\s\S]*?\]\]\s*/i, '').trim();
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  feedback?: number | null;
  is_manual?: boolean;
}

export default function ChatWindow({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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

      const { data: feedbackData } = await supabase
        .from('ai_feedback')
        .select('message_id, rating');

      if (!messagesError && messagesData) {
        setMessages(messagesData.map(m => {
          const mType = m.message?.type;
          const isHumanIntervention = mType === 'human_manual' || m.message?.additional_kwargs?.is_panic_intervention;
          
          return {
            id: m.id.toString(),
            role: mType === 'human' ? 'user' : 'assistant',
            content: mType === 'human' ? m.message?.content : formatMessageContent(m.message?.content || ''),
            created_at: m.created_at || m.id.toString(),
            feedback: feedbackData?.find(f => f.message_id === m.id)?.rating || null,
            is_manual: isHumanIntervention
          };
        }));
      }
      setLoading(false);
      scrollToBottom();
    }

    fetchMessages();

    // Subscribe to new messages for this specific session
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
        const isHumanIntervention = type === 'human_manual' || message?.additional_kwargs?.is_panic_intervention;
        
        if (type === 'human') {
          setIsTyping(true);
        } else {
          setIsTyping(false);
        }

        const newMessage: Message = {
          id: payload.new.id.toString(),
          role: type === 'human' ? 'user' : 'assistant',
          content: type === 'human' ? (message?.content || '') : formatMessageContent(message?.content || ''),
          created_at: payload.new.created_at || new Date().toISOString(),
          feedback: null,
          is_manual: isHumanIntervention
        };

        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_feedback'
      }, (payload) => {
        setMessages(prev => prev.map(m => 
          m.id === payload.new.message_id.toString() 
            ? { ...m, feedback: payload.new.rating } 
            : m
        ));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_feedback'
      }, (payload) => {
        setMessages(prev => prev.map(m => 
          m.id === payload.new.message_id.toString() 
            ? { ...m, feedback: payload.new.rating } 
            : m
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleFeedback = async (messageId: string, rating: number) => {
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: rating } : m
    ));

    const { error } = await supabase
      .from('ai_feedback')
      .upsert({ message_id: parseInt(messageId), rating }, { onConflict: 'message_id' });
    
    if (error) {
       console.error('Feedback error:', error);
       // Revert on error? Or just leave it. Better to revert or show alert.
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const messageContent = inputValue;
    setInputValue('');
    setSending(true);

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      role: panicMode ? 'assistant' : 'user', // Manual intervention is 'assistant' (outbound)
      content: messageContent,
      created_at: new Date().toISOString(),
      feedback: null
    };
    setMessages(prev => [...prev, optimisticMessage]);

    const { error, data } = await supabase
      .from('n8n_chat_clientes_historial')
      .insert({
        session_id: sessionId,
        message: {
          type: panicMode ? 'human_manual' : 'human',
          content: messageContent,
          additional_kwargs: {
            is_panic_intervention: panicMode,
            source: 'alpha_frontend'
          },
          response_metadata: {}
        }
      })
      .select();

    if (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputValue(messageContent); // Restore input
    } else if (data && data[0]) {
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, id: data[0].id.toString() } : m
      ));
      
      if (panicMode) {
        // Trigger n8n manual intervention webhook
        try {
          fetch('https://n8n.srv941923.hstgr.cloud/webhook/polaris-intervencion-manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: sessionId,
              type: 'human_manual',
              content: messageContent,
              metadata: { is_panic_intervention: true }
            })
          });
        } catch (webhookError) {
          console.error('Webhook error:', webhookError);
        }
      } else {
        setIsTyping(true);
      }
    }
    setSending(false);
  };

  const togglePanicMode = async () => {
    const { error } = await supabase
      .from('session_control')
      .upsert({ session_id: sessionId, is_manual: !panicMode });
    
    if (!error) {
      if (!panicMode) setIsTyping(false);
      setPanicMode(!panicMode);
    }
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${
      panicMode ? 'bg-rose-950/20' : 'bg-transparent'
    }`}>
      {/* Panic Button - Positioned outside the mockup visually but technically inside the component */}
      <div className="fixed top-8 right-8 z-[100] flex items-center gap-4">
        <button 
          onClick={togglePanicMode}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-2xl ${
            panicMode 
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 scale-105 border-none' 
              : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-rose-900/40'
          }`}
        >
          {panicMode ? 'RESUME AI CONTROL' : <><AlertTriangle className="w-4 h-4" /> PANIC BUTTON</>}
        </button>
      </div>

      {/* Chat Header inside Mockup */}
      <header className={`px-4 pt-10 pb-4 border-b transition-colors duration-500 flex flex-col items-center text-center ${
        panicMode ? 'border-rose-500/30 bg-rose-500/10' : 'border-slate-800 bg-slate-900/40'
      }`}>
        <div className="relative mb-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-500 ${
            panicMode ? 'bg-rose-500/20 border-rose-500/40' : 'bg-primary/20 border-primary/30'
          }`}>
            <Bot className={`w-6 h-6 ${panicMode ? 'text-rose-400' : 'text-primary'}`} />
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${panicMode ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white flex items-center justify-center gap-1 uppercase tracking-tight">
            {sessionId.split('@')[0]}
          </h3>
          <p className={`text-[9px] uppercase tracking-[0.2em] font-black transition-colors ${
            panicMode ? 'text-rose-400' : 'text-slate-500'
          }`}>
            {panicMode ? 'Intervention Active' : 'AI Agent Handling'}
          </p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2`}
              >
                <div className={`flex gap-2 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border mt-auto mb-1 ${
                    message.role === 'user' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-primary/10 border-primary/20'
                  }`}>
                    {message.role === 'user' ? <User className="w-3 h-3 text-slate-400" /> : <Bot className="w-3 h-3 text-primary" />}
                  </div>
                  <div className="space-y-1">
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed relative shadow-md ${
                      message.role === 'user'
                        ? 'bg-slate-800 text-white rounded-br-none'
                        : 'bg-primary/20 text-white border border-primary/10 rounded-bl-none'
                    }`}>
                      {message.content}
                    </div>
                    {message.is_manual && (
                        <p className="text-[8px] text-rose-400 font-black uppercase tracking-widest text-right">Human Intervention</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && !panicMode && (
              <div className="flex justify-start animate-in slide-in-from-bottom-1">
                <div className="bg-primary/10 px-3 py-2 rounded-2xl flex gap-1 items-center">
                    <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <footer className={`p-4 pb-8 border-t transition-colors duration-500 ${
        panicMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-900/40 border-slate-800'
      }`}>
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={panicMode ? "Manual message..." : "Ask AI..."}
              className={`w-full border text-white rounded-xl py-3 px-4 text-xs focus:outline-none transition-all ${
                panicMode 
                  ? 'bg-rose-950/40 border-rose-500/30 focus:border-rose-500'
                  : 'bg-slate-900 border-slate-800 focus:border-primary/50'
              }`}
            />
          <button 
            type="submit"
            disabled={!inputValue.trim() || sending}
            className={`p-3 rounded-xl text-white active:scale-95 disabled:opacity-50 transition-all ${
              panicMode ? 'bg-rose-600' : 'bg-primary'
            }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </footer>
    </div>
  );
}
