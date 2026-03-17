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
  Zap, 
  Brain 
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
  return content.replace(/【.*?】/g, '').trim();
};

export default function ChatWindow({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
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
            role: mType === 'human' ? 'user' : 'assistant',
            content: mType === 'human' ? m.message?.content : formatMessageContent(m.message?.content || ''),
            created_at: m.created_at || m.id.toString(),
            is_manual: mType === 'human_manual' || m.message?.additional_kwargs?.is_panic_intervention
          };
        }));
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

        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

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

    const { error } = await supabase
      .from('n8n_chat_clientes_historial')
      .insert({
        session_id: sessionId,
        message: {
          type: 'human_manual',
          content: messageContent,
          additional_kwargs: { is_panic_intervention: true, source: 'alpha_frontend' },
          response_metadata: {}
        }
      });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputValue(messageContent);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#030711] relative overflow-hidden font-sans">
      <header className="px-6 pt-12 pb-6 flex flex-col items-center bg-slate-900/10 border-b border-white/[0.03]">
        <div className="relative mb-3 group">
          <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all group-hover:bg-primary/30">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#030711] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <h3 className="text-[13px] font-bold text-white tracking-tight">
              {sessionId.split('@')[0]}
            </h3>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-primary/80">
            AI Agent Handling
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7 custom-scrollbar bg-gradient-to-b from-[#030711] to-[#0a0c10]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-primary animate-spin opacity-50" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-full animate-in slide-in-from-bottom-3`}
              >
                {message.role === 'assistant' && (
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1.5 ml-1">Alpha Agent</span>
                )}
                
                <div className={`flex gap-3 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border ${
                    message.role === 'user' 
                      ? 'bg-slate-800/80 border-slate-700/50' 
                      : 'bg-primary/20 border-primary/30'
                  }`}>
                    {message.role === 'user' ? <User className="w-3.5 h-3.5 text-slate-400" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
                    <div className={`p-3.5 rounded-2xl text-[12px] leading-[1.6] shadow-sm tracking-tight ${
                      message.role === 'user'
                        ? 'bg-[#1e1b4b] text-white rounded-tr-none border border-primary/10'
                        : 'bg-[#171923] text-slate-200 border border-white/[0.03] rounded-tl-none'
                    }`}>
                      {message.role === 'user' && (
                        <span className="text-[9px] block font-bold text-slate-500 mb-1 uppercase tracking-wider">Mensaje_Cliente:</span>
                      )}
                      {message.content}
                    </div>
                    <span className="text-[8px] text-slate-600 font-medium px-1 uppercase tracking-widest">Now</span>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start items-center gap-2 animate-pulse pl-1">
                <div className="bg-primary/10 px-3 py-2 rounded-2xl flex gap-1.5 items-center border border-primary/5">
                    <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <footer className="p-5 bg-slate-900/10 border-t border-white/[0.03] space-y-3">
        {!isManualMode ? (
          <button 
            onClick={() => setIsManualMode(true)}
            className="w-full group relative overflow-hidden bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3.5 px-4 transition-all active:scale-[0.98] shadow-lg shadow-rose-950/20 border border-rose-500/50"
          >
            <div className="relative z-10 flex items-center justify-center gap-2.5">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.15em]">Panic Button - Manual Intervention</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
          </button>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] text-rose-500 font-black uppercase tracking-[0.2em]">Manual Override Enabled</span>
              <button 
                onClick={() => setIsManualMode(false)}
                className="text-[8px] text-slate-500 hover:text-white font-black uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                Resume AI <Bot className="w-2.5 h-2.5" />
              </button>
            </div>
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#0a0c10] border border-rose-500/20 rounded-[1.2rem] px-4 py-2 shadow-xl focus-within:border-rose-500/50 transition-all">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type manual message..."
                className="flex-1 bg-transparent text-white py-2 px-1 text-sm focus:outline-none placeholder:text-rose-900/50 font-medium"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || sending}
                className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 active:scale-90 disabled:opacity-20 transition-all shadow-lg shadow-rose-600/20"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        )}
        <p className="text-[8px] text-center text-slate-700 uppercase tracking-widest font-bold">
            Alpha Control - Realtime Manual Intervention Enabled
        </p>
      </footer>
    </div>
  );
}
