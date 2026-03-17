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
  Brain,
  ShieldAlert
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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
      const { data, error } = await supabase
        .from('n8n_chat_clientes_historial')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: true });

      if (!error && data) {
        setMessages(data.map(m => ({
          id: m.id.toString(),
          role: m.message?.type === 'human' ? 'user' : 'assistant',
          content: m.message?.content || '',
          created_at: new Date().toISOString()
        })));
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
        const type = payload.new.message?.type;
        
        if (type === 'human') {
          setIsTyping(true);
        } else if (type === 'ai') {
          setIsTyping(false);
        }

        const newMessage: Message = {
          id: payload.new.id.toString(),
          role: type === 'human' ? 'user' : 'assistant',
          content: payload.new.message?.content || '',
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
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

    setSending(true);
    // In a real app, this would trigger n8n or save directly
    const { error } = await supabase
      .from('n8n_chat_clientes_historial')
      .insert({
        session_id: sessionId,
        message: {
          type: 'human',
          content: inputValue,
          additional_kwargs: {},
          response_metadata: {}
        }
      });

    if (!error) {
      setInputValue('');
      setIsTyping(true); // Manually trigger typing when operator sends message to prompt AI
    }
    setSending(false);
  };

  const togglePanicMode = async () => {
    const { error } = await supabase
      .from('session_control')
      .upsert({ session_id: sessionId, is_manual: !panicMode });
    
    if (!error) {
      if (!panicMode) setIsTyping(false); // Stop typing if panic mode enabled
      setPanicMode(!panicMode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/10 backdrop-blur-xl">
      {/* Chat Header */}
      <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <Bot className={`w-5 h-5 ${panicMode ? 'text-slate-400' : 'text-primary'}`} />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${panicMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {sessionId}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              {panicMode ? 'Manual Intervention Active' : 'AI Agent Handling'}
            </p>
          </div>
        </div>

        <button 
          onClick={togglePanicMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            panicMode 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {panicMode ? 'Resume AI' : 'PANIC BUTTON'}
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <span className="text-[10px] py-1 px-3 rounded-full bg-slate-800/50 text-slate-500 uppercase tracking-widest font-bold border border-slate-700/50">
                Encrypted Session Started
              </span>
            </div>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${
                    message.role === 'user' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-primary/10 border-primary/20'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-slate-800/80 text-white rounded-tr-none'
                        : 'bg-primary/20 text-white border border-primary/10 rounded-tl-none'
                    }`}>
                      {message.content}
                    </div>
                    <p className={`text-[10px] text-slate-500 font-medium ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && !panicMode && (
              <div className="flex justify-start group animate-in slide-in-from-bottom-2">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center border bg-primary/10 border-primary/20">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-primary/10 px-4 py-3 rounded-full flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                    <span className="text-[10px] text-primary/60 font-bold uppercase tracking-wider ml-2">AI Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <footer className="p-4 bg-slate-900/40 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 max-w-5xl mx-auto">
          <div className="relative flex-1 group">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={panicMode ? "Type manual response..." : "Suggest a response to AI..."}
              className="w-full bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-primary/50 text-white rounded-2xl py-4 pl-5 pr-12 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
            />
            {!panicMode && (
              <Brain className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-hover:text-primary/50 transition-colors pointer-events-none" />
            )}
            {panicMode && (
              <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50 animate-pulse pointer-events-none" />
            )}
          </div>
          <button 
            type="submit"
            disabled={!inputValue.trim() || sending}
            className="p-4 rounded-2xl bg-primary text-white hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg shadow-primary/20"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-600 mt-3 font-medium tracking-tight">
          Alpha Control - Realtime Manual Intervention Enabled
        </p>
      </footer>
    </div>
  );
}
