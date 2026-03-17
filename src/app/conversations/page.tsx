'use client';

import { useState, useEffect } from 'react';
import ChatWindow from '@/components/ChatWindow';
import PhoneMockup from '@/components/PhoneMockup';
import ChatInsights from '@/components/ChatInsights';
import { supabase } from '@/lib/supabase';
import Skeleton from '@/components/ui/Skeleton';
import { Search, Filter, MessageSquare, User, Activity } from 'lucide-react';

export default function ConversationsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
    <div className="h-[calc(100vh-6rem)] grid grid-cols-[300px_1fr_320px] gap-4 animate-in fade-in duration-500 overflow-hidden -mt-4">
      {/* Column 1: Session List */}
      <aside className="glass-panel rounded-2xl overflow-hidden flex flex-col border border-slate-800/50 shadow-xl">
        <div className="p-4 border-b border-slate-800/50 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Chats</h2>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
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
            <div className="p-8 text-center text-slate-600 italic flex flex-col items-center gap-3">
              <MessageSquare className="w-6 h-6 opacity-20" />
              <p className="text-xs">{searchTerm ? 'No matches' : 'No chats'}</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${
                  selectedSession === session.id 
                    ? 'bg-primary/10 border-primary/30 text-white' 
                    : 'hover:bg-slate-800/40 text-slate-400 border border-transparent'
                } border`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                  selectedSession === session.id ? 'bg-primary border-primary/40' : 'bg-slate-800 border-slate-700'
                }`}>
                  <User className={`w-5 h-5 ${selectedSession === session.id ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black truncate uppercase tracking-tight ${selectedSession === session.id ? 'text-white' : 'text-slate-300'}`}>
                    {(session.id as string)?.split('@')[0] || session.id}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-none">Live</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Column 2: Phone Mockup Area */}
      <section className="relative flex flex-col items-center justify-center">
        {selectedSession ? (
          <div className="w-full h-full flex items-center justify-center py-2 relative">
              <PhoneMockup>
                <ChatWindow sessionId={selectedSession} />
              </PhoneMockup>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 glass-panel w-full rounded-2xl border border-slate-800/50">
            <div className="p-6 rounded-full bg-slate-900/50 border border-slate-800">
              <Activity className="w-10 h-10 text-primary/30" />
            </div>
            <div className="text-center">
                <p className="text-lg font-black text-white uppercase tracking-tighter italic">Spectator Mode</p>
                <p className="text-xs text-slate-600">Select a chat to begin monitoring.</p>
            </div>
          </div>
        )}
      </section>

      {/* Column 3: Chat Insights */}
      <aside className="glass-panel rounded-2xl p-5 border border-slate-800/50 shadow-xl overflow-hidden">
        <ChatInsights sessionId={selectedSession} />
      </aside>
    </div>
  );
}
