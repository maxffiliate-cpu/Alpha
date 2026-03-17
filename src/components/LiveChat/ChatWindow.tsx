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
  Brain,
  ArrowLeft,
  Paperclip,
  Mic,
  Moon,
  Smile,
  MoreVertical
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
    <div className="flex flex-col h-full bg-[#0d0d0d] relative overflow-hidden font-sans">
      {/* Telegram-style Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
      
      {/* Header Match */}
      <header className="px-4 pt-10 pb-3 flex items-center justify-between bg-[#1c1c1e]/90 backdrop-blur-xl border-b border-white/[0.05] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer group">
            <ArrowLeft className="w-5 h-5 text-sky-500" />
            <span className="text-sm font-bold text-sky-500 pr-1 group-active:scale-95">24</span>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1 min-w-0 px-2 cursor-pointer hover:opacity-80 transition-opacity">
          <h3 className="text-[15px] font-bold text-white truncate max-w-[140px] tracking-tight">
            {sessionId.split('@')[0]}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            últ. vez hoy a las 19:16
          </p>
        </div>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-black text-sm shadow-lg border border-white/10 shrink-0">
          {sessionId.substring(0, 2).toUpperCase()}
        </div>
      </header>

      {/* Messages Scroll Area with Date Separator */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar relative z-0">
        <div className="flex justify-center mb-8">
          <span className="bg-black/30 backdrop-blur-md text-white/90 px-4 py-1 rounded-full text-[11px] font-bold tracking-tight">
            25 de enero
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin opacity-50" />
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <span className="bg-black/20 text-white/60 px-5 py-1.5 rounded-2xl text-[12px] font-medium text-center max-w-[80%] leading-relaxed">
                Estableciendo conexión segura con <span className="text-sky-400 font-bold">Alpha AI</span>...
              </span>
            </div>

            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-[1.6] shadow-md tracking-tight ${
                  message.role === 'user'
                    ? 'bg-[#2b5278] text-white rounded-br-none'
                    : 'bg-[#212121] text-slate-100 rounded-bl-none border border-white/5'
                }`}>
                  {message.content}
                  <div className={`flex items-center justify-end gap-1 mt-1 ${message.role === 'user' ? 'text-white/50' : 'text-slate-500'}`}>
                    <span className="text-[9px] font-medium uppercase tracking-tighter">19:16</span>
                    {message.role === 'user' && <div className="flex -space-x-1"><span className="text-[10px] text-sky-400">✓</span><span className="text-[10px] text-sky-400">✓</span></div>}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start px-1 animate-pulse">
                <div className="bg-[#212121] px-4 py-2.5 rounded-2xl rounded-bl-none flex gap-1.5 items-center border border-white/5">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Footer Match */}
      <footer className="px-4 py-5 bg-[#0d0d0d]/80 backdrop-blur-xl border-t border-white/[0.03] space-y-3 z-10">
        {!isManualMode ? (
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsManualMode(true)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all shrink-0 active:scale-95"
              >
                <Paperclip className="w-5 h-5 text-slate-400" />
              </button>

              <div className="flex-1 bg-[#212121] border border-white/5 rounded-[1.8rem] px-5 py-2.5 flex items-center gap-3 group focus-within:border-sky-500/30 transition-all shadow-inner">
                <input 
                  type="text" 
                  value={inputValue}
                  readOnly
                  placeholder="Mensaje"
                  className="flex-1 bg-transparent text-white text-[15px] focus:outline-none placeholder:text-slate-600 font-medium"
                />
                <button className="text-slate-600 hover:text-sky-500 transition-colors">
                  <Moon className="w-5 h-5" />
                </button>
              </div>

              <button className="w-11 h-11 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 active:scale-90 transition-all shrink-0">
                <Mic className="w-5 h-5" />
              </button>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> Manual Override
              </span>
              <button 
                onClick={() => setIsManualMode(false)}
                className="text-[9px] text-slate-500 hover:text-white font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md"
              >
                Resume AI <Brain className="w-3 h-3 text-sky-400" />
              </button>
            </div>
            
            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
              <button type="button" className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Paperclip className="w-5 h-5 text-rose-500" />
              </button>
              
              <div className="flex-1 bg-[#1a1111] border border-rose-500/20 rounded-[1.8rem] px-5 py-2.5 flex items-center gap-3 focus-within:border-rose-500 transition-all shadow-lg">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-transparent text-white text-[15px] focus:outline-none placeholder:text-rose-900/40"
                  autoFocus
                />
                <Smile className="w-5 h-5 text-rose-900/60" />
              </div>

              <button 
                type="submit"
                disabled={!inputValue.trim() || sending}
                className="w-11 h-11 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/20 active:scale-90 transition-all disabled:opacity-30 disabled:grayscale"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        )}
      </footer>
    </div>
  );
}
