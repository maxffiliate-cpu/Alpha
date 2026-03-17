'use client';

import { useState, useEffect } from 'react';
import ChatWindow from '@/components/ChatWindow';
import { supabase } from '@/lib/supabase';
import { Search, Filter, MessageSquare, User } from 'lucide-react';

export default function ConversationsPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from('n8n_chat_clientes_historial')
        .select('session_id, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Group by session_id to get unique chats
        const uniqueSessions = Array.from(new Set(data.map(item => item.session_id)))
          .map(id => {
            return {
              id,
              lastMessage: data.find(s => s.session_id === id)?.created_at
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_clientes_historial' }, (payload) => {
        setSessions(prev => {
          const exists = prev.find(s => s.id === payload.new.session_id);
          if (exists) {
            return [
              { ...exists, lastMessage: payload.new.created_at },
              ...prev.filter(s => s.id !== payload.new.session_id)
            ];
          }
          return [{ id: payload.new.session_id, lastMessage: payload.new.created_at }, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-in fade-in duration-500">
      {/* Session List */}
      <aside className="w-80 glass-panel rounded-2xl overflow-hidden flex flex-col border border-slate-800">
        <div className="p-4 border-b border-slate-800 space-y-4">
          <h2 className="text-xl font-bold text-white">Chats</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No conversations found.</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                  selectedSession === session.id 
                    ? 'bg-primary/20 border-primary/50 text-white border' 
                    : 'hover:bg-slate-800/40 text-slate-400 border border-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{session.id}</p>
                  <p className="text-xs text-slate-500">Active now</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
        {selectedSession ? (
          <ChatWindow sessionId={selectedSession} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="p-6 rounded-full bg-slate-900/50">
              <MessageSquare className="w-12 h-12 text-slate-700" />
            </div>
            <p className="text-lg">Select a conversation to start monitoring</p>
          </div>
        )}
      </section>
    </div>
  );
}
