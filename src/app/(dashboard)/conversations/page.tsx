'use client';

import { useState, useEffect } from 'react';
import ChatWindow from '@/features/live-chat/ChatWindow';
import ChatInsights from '@/features/live-chat/ChatInsights';
import { supabase } from '@/lib/supabase';
import Skeleton from '@/components/ui/Skeleton';
import { Search, MessageSquare, User, Activity } from 'lucide-react';

export default function ConversationsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isManualMode, setIsManualMode] = useState(false);

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
        const uniqueSessions = Array.from(new Set(data.map((item: any) => item.session_id)))
          .map((id: any) => ({
            id,
            lastMessage: data.find((s: any) => s.session_id === id)?.id
          }));
        setSessions(uniqueSessions);
      }
      setLoading(false);
    }

    fetchSessions();

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

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredSessions = sessions.filter(s =>
    s?.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex bg-[var(--background)] overflow-hidden font-sans">

      {/* ── Column 1: Chat List ── */}
      <aside className="w-72 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] shrink-0">
        <div className="p-5 space-y-4 border-b border-[var(--border)]">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">Chats</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              En vivo
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#eef1f3] dark:bg-slate-900/40 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-3">
              <MessageSquare className="w-8 h-8 text-[var(--text-muted)] opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">
                {searchTerm ? 'Sin resultados' : 'No hay chats activos'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all border-l-4 ${
                  selectedSession === session.id
                    ? 'bg-primary/5 dark:bg-primary/10 border-l-primary'
                    : 'border-l-transparent hover:bg-[#eef1f3] dark:hover:bg-slate-900/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  selectedSession === session.id
                    ? 'bg-primary/10 dark:bg-primary/20'
                    : 'bg-[#eef1f3] dark:bg-slate-800/60'
                }`}>
                  <User className={`w-4.5 h-4.5 ${selectedSession === session.id ? 'text-primary' : 'text-[var(--text-muted)]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    selectedSession === session.id ? 'text-[var(--foreground)]' : 'text-[var(--foreground)] opacity-80'
                  }`}>
                    {(session.id as string)?.split('@')[0] || session.id}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">Activo ahora</p>
                </div>
                {selectedSession === session.id && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Column 2: Chat Window ── */}
      <main className="flex-1 flex flex-col bg-[#f5f7f9] dark:bg-[#030711] relative overflow-hidden">
        {selectedSession ? (
          <ChatWindow
            sessionId={selectedSession}
            isManualMode={isManualMode}
            setIsManualMode={setIsManualMode}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-5">
            <div className="w-20 h-20 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-[0px_4px_20px_rgba(112,42,225,0.04)]">
              <Activity className="w-9 h-9 text-primary opacity-30" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Modo Espectador</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-xs">
                Selecciona una conversación para monitorear en tiempo real.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── Column 3: Insights ── */}
      <aside className="w-80 shrink-0 bg-[#eef1f3] dark:bg-[#030711] border-l border-[var(--border)] overflow-hidden">
        <ChatInsights sessionId={selectedSession} />
      </aside>
    </div>
  );
}
