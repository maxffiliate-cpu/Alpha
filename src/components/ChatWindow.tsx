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
      panicMode ? 'bg-rose-950/5' : 'bg-slate-900/10'
    } backdrop-blur-xl`}>
      {/* Chat Header */}
      <header className={`p-4 border-b transition-colors duration-500 flex items-center justify-between ${
        panicMode ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800 bg-slate-900/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${
              panicMode ? 'bg-rose-500/20 border-rose-500/40' : 'bg-primary/20 border-primary/30'
            }`}>
              <Bot className={`w-5 h-5 ${panicMode ? 'text-rose-400' : 'text-primary'}`} />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${panicMode ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {sessionId}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </h3>
            <p className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${
              panicMode ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {panicMode ? 'Intervention Active' : 'AI Agent Handling'}
            </p>
          </div>
        </div>

        <button 
          onClick={togglePanicMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            panicMode 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95'
          }`}
        >
          {panicMode ? 'Resume AI' : <><AlertTriangle className="w-3.5 h-3.5" /> PANIC BUTTON</>}
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
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${message.role === 'user' ? 'text-slate-500 text-right w-full' : 'text-primary'}`}>
                        {message.role === 'user' ? 'Client' : 'Alpha Agent'}
                      </span>
                      {message.is_manual && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-md border border-rose-500/30 font-black animate-pulse whitespace-nowrap">
                          HUMAN INTERVENTION
                        </span>
                      )}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group/msg shadow-sm ${
                      message.role === 'user'
                        ? 'bg-slate-800/80 text-white rounded-tr-none'
                        : 'bg-primary/20 text-white border border-primary/10 rounded-tl-none'
                    }`}>
                      {message.content}
                      
                      {message.role === 'assistant' && (
                        <div className={`absolute -right-12 top-0 flex flex-col gap-2 transition-all duration-300 ${
                          message.feedback ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'
                        }`}>
                          <button 
                            onClick={() => handleFeedback(message.id, 1)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              message.feedback === 1 
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 scale-110' 
                                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(message.id, -1)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              message.feedback === -1 
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 scale-110' 
                                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className={`text-[10px] text-slate-500 font-medium ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.created_at.includes('T') ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
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
      <footer className={`p-4 border-t transition-colors duration-500 ${
        panicMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/40 border-slate-800'
      }`}>
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 max-w-5xl mx-auto">
          <div className="relative flex-1 group">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={panicMode ? "Type manual message to client..." : "Suggest a response to AI..."}
              className={`w-full border text-white rounded-2xl py-4 pl-5 pr-12 text-sm focus:outline-none focus:ring-4 transition-all shadow-inner ${
                panicMode 
                  ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 focus:border-primary/50 focus:ring-primary/5'
              }`}
            />
            {!panicMode && (
              <Brain className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-hover:text-primary/50 transition-colors pointer-events-none" />
            )}
            {panicMode && (
              <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500/50 animate-pulse pointer-events-none" />
            )}
          </div>
          <button 
            type="submit"
            disabled={!inputValue.trim() || sending}
            className={`p-4 rounded-2xl text-white active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg ${
              panicMode
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                : 'bg-primary hover:bg-blue-600 shadow-primary/20'
            }`}
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
