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

export default function AgentSettings() {
  useEffect(() => {
    async function loadConfig() {
      const { data, error } = await supabase
        .from('agent_config')
        .select('*')
        .limit(1);
      
      if (data && data.length > 0) {
        setConfig({
          id: data[0].id,
          system_prompt: data[0].system_prompt,
          temperature: data[0].temperature,
          model: 'gemini-3-flash' // Model is currently static or managed elsewhere
        });
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    const { error } = await supabase
      .from('agent_config')
      .upsert({ 
        id: config.id, 
        system_prompt: config.system_prompt,
        temperature: config.temperature
      });
    
    if (!error) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
    }
    setSaving(false);
  };

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Settings2 className="w-8 h-8 text-primary" />
          </div>
          Configuración del Agente
        </h1>
        <p className="text-lg text-slate-400 font-medium">Ajusta el comportamiento y la personalidad de tu agente de IA.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Core Settings */}
        <section className="lg:col-span-3 space-y-8">
          <div className="glass-panel p-8 rounded-3xl space-y-6 border-slate-800/50 hover:border-purple-500/30 transition-all group">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <BrainCircuit className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              Personalidad (System Prompt)
            </h2>
            <div className="relative">
              <textarea 
                value={config.system_prompt}
                onChange={(e) => setConfig({...config, system_prompt: e.target.value})}
                className="w-full h-80 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-base text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none shadow-inner"
                placeholder="Ingresa las instrucciones del sistema para el agente de IA..."
              />
              <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest pointer-events-none">
                AI Instructions
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl space-y-6 border-slate-800/50 hover:border-emerald-500/30 transition-all group">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              Libertad Creativa (Temperatura)
            </h2>
            <div className="space-y-6 bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50">
              <input 
                type="range" 
                min="0" 
                max="1.5" 
                step="0.1" 
                value={config.temperature}
                onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-blue-400 transition-all"
              />
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                <span className="text-slate-500">PRECISO (0.0)</span>
                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-black tabular-nums">
                  {config.temperature}
                </div>
                <span className="text-slate-500">CREATIVO (1.5)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Info & Help */}
        <section className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8 rounded-3xl bg-primary/5 border border-primary/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-primary" />
              Consejos Profesionales
            </h2>
            <ul className="space-y-6">
              <li className="flex gap-4 text-slate-400 leading-relaxed font-medium">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                Se recomienda una temperatura de 0.7 para consultas comerciales estándar.
              </li>
              <li className="flex gap-4 text-slate-400 leading-relaxed font-medium">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                Mantén el prompt del sistema conciso pero específico sobre los límites del negocio.
              </li>
              <li className="flex gap-4 text-slate-400 leading-relaxed font-medium">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                Los cambios son procesados por n8n en tiempo real para actualizar el contexto.
              </li>
            </ul>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-slate-800/50 hover:border-blue-500/30 transition-all group">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <MessageSquareCode className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              Versión del Modelo
            </h2>
            <select 
              value={config.model}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-base text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-not-allowed opacity-80"
              disabled
            >
              <option value="gemini-3-flash">Gemini 3 Flash (Alpha Optimized)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
            <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
              Managed by Polaris Infrastructure
            </p>
          </div>
        </section>
      </div>

      <footer className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-10 border-t border-slate-800/50">
        <div className="flex-1">
          {status === 'success' && (
            <span className="text-sm text-emerald-400 font-bold flex items-center gap-2 animate-in slide-in-from-left-4">
              <RefreshCcw className="w-4 h-4 animate-spin-slow" />
              Configuración actualizada con éxito
            </span>
          )}
          {status === 'error' && (
            <span className="text-sm text-rose-400 font-bold animate-in shake">Error al guardar los cambios</span>
          )}
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-primary text-white text-lg font-black hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 active:scale-95 group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Save className={`w-5 h-5 relative z-10 ${saving ? 'animate-bounce' : ''}`} />
          <span className="relative z-10">
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </span>
        </button>
      </footer>
    </div>
  );
}
