'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Save, 
  RefreshCcw, 
  Settings2, 
  ShieldCheck, 
  BrainCircuit,
  MessageSquareCode,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    system_prompt: '',
    temperature: 0.7,
    model: 'gemini-3-flash'
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function loadConfig() {
      const { data, error } = await supabase
        .from('agent_config')
        .select('*')
        .eq('id', 'default')
        .single();
      
      if (data) setConfig(data);
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    const { error } = await supabase
      .from('agent_config')
      .upsert({ id: 'default', ...config });
    
    if (!error) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Agent Configuration
        </h1>
        <p className="text-slate-400">Fine-tune the behavior and personality of your AI agent.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Core Settings */}
        <section className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              Personality (System Prompt)
            </h2>
            <textarea 
              value={config.system_prompt}
              onChange={(e) => setConfig({...config, system_prompt: e.target.value})}
              className="w-full h-64 bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none"
              placeholder="Enter the system instruction for the AI agent..."
            />
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Creative Freedom (Temperature)
            </h2>
            <div className="space-y-4">
              <input 
                type="range" 
                min="0" 
                max="1.5" 
                step="0.1" 
                value={config.temperature}
                onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>PRECISE (0.0)</span>
                <span className="text-primary font-bold">{config.temperature}</span>
                <span>CREATIVE (1.5)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Info & Help */}
        <section className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl bg-primary/5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Pro Tips
            </h2>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                A temperature of 0.7 is recommended for standard business enquiries.
              </li>
              <li className="flex gap-3 text-sm text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                Keep the system prompt concise but specific about business boundaries.
              </li>
              <li className="flex gap-3 text-sm text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                Changes are handled by n8n in real-time for updated context.
              </li>
            </ul>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquareCode className="w-5 h-5 text-blue-400" />
              Model Version
            </h2>
            <select 
              value={config.model}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none"
              disabled
            >
              <option value="gemini-3-flash">Gemini 3 Flash (Alpha Optimized)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>
        </section>
      </div>

      <footer className="flex items-center justify-end gap-4 border-t border-slate-800 pt-8">
        {status === 'success' && (
          <span className="text-sm text-emerald-400 font-medium flex items-center gap-2 animate-in slide-in-from-right-2">
            <RefreshCcw className="w-4 h-4 animate-spin" />
            Config updated successfully
          </span>
        )}
        {status === 'error' && (
          <span className="text-sm text-rose-400 font-medium">Failed to save changes</span>
        )}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </footer>
    </div>
  );
}
