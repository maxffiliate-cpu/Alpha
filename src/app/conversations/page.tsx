'use client';

import { useState, useEffect } from 'react';
import ChatWindow from '@/components/LiveChat/ChatWindow';
import PhoneMockup from '@/components/LiveChat/PhoneMockup';
import ChatInsights from '@/components/LiveChat/ChatInsights';
import { supabase } from '@/lib/supabase';
import Skeleton from '@/components/ui/Skeleton';
import { Search, Filter, MessageSquare, User, Activity, AlertTriangle } from 'lucide-react';

export default function ConversationsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isManualMode, setIsManualMode] = useState(false);

  // Reset panic mode when switching sessions
  const handleSelectSession = (id: string) => {
    setSelectedSession(id);
    setIsManualMode(false);
  };

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from('n8n_chat_clientes_historial')
        .select('session_id, id')
        .order('id', { ascending: false });

      if (!error && data) {
        // Group by session_id to get unique chats
        const uniqueSessions = Array.from(new Set(data.map((item: any) => item.session_id)))
          .map((id: any) => {
            return {
              id,
              lastMessage: data.find((s: any) => s.session_id === id)?.id
            };
          });
        setSessions(uniqueSessions);
      }
      setLoading(false);
    }

    fetchSessions();

    // Realtime subscription for new sessions
    const channel = supabase
      .channel('public:n8n_chat_clientes_historial')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_clientes_historial' }, (payload: any) => {
        setSessions(prev => {
          const exists = prev.find(s => s.id === payload.new.session_id);
          if (exists) {
            return [
              { ...exists, lastMessage: payload.new.id },
              ...prev.filter(s => s.id !== payload.new.session_id)
            ];
          }
          return [{ id: payload.new.session_id, lastMessage: payload.new.id }, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredSessions = sessions.filter(s => 
    s?.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex bg-[#030711] text-slate-400 overflow-hidden font-sans">
      {/* Column 1: Chat List */}
      <aside className="w-[320px] border-r border-slate-800/60 flex flex-col bg-[#030711]">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Chats</h2>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-slate-200 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5 custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 p-3">
                  <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-600 italic flex flex-col items-center gap-4">
              <MessageSquare className="w-8 h-8 opacity-10" />
              <p className="text-sm">{searchTerm ? 'No se encontraron resultados' : 'No hay chats activos'}</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 group border ${
                  selectedSession === session.id 
                    ? 'bg-primary/5 border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.05)]' 
                    : 'hover:bg-slate-900/40 border-transparent'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                  selectedSession === session.id 
                    ? 'bg-primary/20 border-primary/30' 
                    : 'bg-slate-800/50 border-slate-700/50 group-hover:border-slate-600'
                }`}>
                  <User className={`w-5 h-5 ${selectedSession === session.id ? 'text-primary' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-semibold truncate ${selectedSession === session.id ? 'text-white' : 'text-slate-300'}`}>
                      {(session.id as string)?.split('@')[0] || session.id}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium">Ahora</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className={`text-xs truncate ${selectedSession === session.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      Activo ahora
                    </p>
                  </div>
                </div>
                {selectedSession === session.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Column 2: Chat Header and Phone */}
      <main className="flex-1 flex flex-col bg-[#030711] relative overflow-hidden">
        {selectedSession ? (
          <>
            <div className="flex-1 flex flex-col items-center pt-8 pb-8 px-8 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-[340px] relative">
                <PhoneMockup isPanic={isManualMode}>
                <ChatWindow 
                  sessionId={selectedSession} 
                  isManualMode={isManualMode}
                  setIsManualMode={setIsManualMode}
                />
              </PhoneMockup>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-6">
            <div className="p-8 rounded-full bg-slate-900/30 border border-slate-800/50 animate-pulse">
              <Activity className="w-12 h-12 text-primary/20" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">Modo Espectador</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Selecciona una conversación activa para monitorear en tiempo real y acceder a insights de IA.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Column 3: Insights */}
      <aside className="w-[360px] border-l border-slate-800/60 bg-[#030711] overflow-hidden">
        <ChatInsights sessionId={selectedSession} />
      </aside>

      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary rounded-full blur-[150px]" />
      </div>
    </div>
  );
}
