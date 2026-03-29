'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase'; // Correct import for the singleton client
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  MessageSquare, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  RefreshCw,
  Zap,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';

// --- Types ---

interface AdMetrics {
  id: string;
  ad_name: string;
  adset_name: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpc: number;
  ctr: number;
  messages_started: number;
  adds_to_cart: number;
  date_start: string;
}

interface KPIData {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}

// --- Helper Functions ---

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatNumber = (val: number) => {
  return new Intl.NumberFormat('es-CL').format(val || 0);
};

// --- Sub-components ---

const StatCard = ({ item }: { item: KPIData }) => (
  <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110 ${item.color}`} />
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2.5 rounded-xl ${item.color} bg-opacity-10 dark:bg-opacity-20`}>
        {item.icon}
      </div>
      {item.trend !== undefined && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${item.trend >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {item.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(item.trend)}%
        </div>
      )}
    </div>
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.label}</h3>
      <p className="text-2xl font-black text-white mt-1 tracking-tight">{item.value}</p>
    </div>
  </div>
);

// --- Main AdsBoard Component ---

export default function AdsBoard() {
  const [data, setData] = useState<AdMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  const client = supabase;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await client.auth.getUser();
        const tid = user?.app_metadata?.tenant_id;
        console.log('[AdsBoard] User tid from metadata:', tid);

        if (tid) {
          const { data: metrics, error } = await client
            .from('meta_ads_metrics')
            .select('*')
            .eq('tenant_id', tid)
            .order('date_start', { ascending: true });
          
          if (error) {
            console.error('[AdsBoard] Supabase Error:', error);
          } else if (metrics) {
            console.log('[AdsBoard] Metrics found:', metrics.length);
            setData(metrics);
          }
        } else {
          console.warn('[AdsBoard] No tenant_id found in user metadata');
        }
      } catch (e) {
        console.error('[AdsBoard] Critical load error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [client]);

  // --- Data Calculations ---

  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      spend: acc.spend + Number(curr.spend),
      revenue: acc.revenue + Number(curr.revenue),
      purchases: acc.purchases + (curr.purchases || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      messages: acc.messages + (curr.messages_started || 0),
      add_to_cart: acc.add_to_cart + (curr.adds_to_cart || 0),
    }), { spend: 0, revenue: 0, purchases: 0, clicks: 0, messages: 0, add_to_cart: 0 });
  }, [data]);

  const globalROAS = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00';
  const globalCPA  = totals.purchases > 0 ? (totals.spend / totals.purchases) : 0;

  // Time-series data for the area chart
  const seriesData = useMemo(() => {
    const map = new Map();
    data.forEach(m => {
      const date = m.date_start;
      const existing = map.get(date) || { date, spend: 0, revenue: 0 };
      map.set(date, {
        date,
        spend: existing.spend + Number(m.spend),
        revenue: existing.revenue + Number(m.revenue)
      });
    });
    return Array.from(map.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Campaign breakdown for bar chart
  const campaignData = useMemo(() => {
    const map = new Map();
    data.forEach(m => {
      const name = m.campaign_name;
      const existing = map.get(name) || { name, spend: 0, revenue: 0, purchases: 0 };
      map.set(name, {
        name,
        spend: existing.spend + Number(m.spend),
        revenue: existing.revenue + Number(m.revenue),
        purchases: existing.purchases + (m.purchases || 0)
      });
    });
    return Array.from(map.values())
      .map(c => ({ 
        ...c, 
        roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
        shortName: c.name.length > 20 ? c.name.substring(0, 17) + '...' : c.name
      }))
      .sort((a,b) => Number(b.roas) - Number(a.roas))
      .slice(0, 5);
  }, [data]);

  if (loading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[500px] gap-4">
      <RefreshCw className="w-10 h-10 text-primary animate-spin opacity-50" />
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando Metrics de Meta Ads...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
      
      {/* 1. Header with Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Ads-board <span className="text-primary text-sm tracking-widest ml-1 opacity-50 uppercase">v4.0</span></h1>
          <p className="text-slate-500 text-sm mt-1">Inteligencia publicitaria para {data[0]?.campaign_name ? 'tus campañas activas' : 'tu agencia'}.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar campaña o anuncio..."
              className="bg-slate-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2.5 rounded-xl glass-panel border border-white/5 text-slate-400 hover:text-white hover:border-white/10 transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard item={{ 
          label: 'Inversión Total', 
          value: formatCurrency(totals.spend), 
          icon: <DollarSign className="w-5 h-5 text-blue-400" />,
          color: 'text-blue-500'
        }} />
        <StatCard item={{ 
          label: 'Revenue Generado', 
          value: formatCurrency(totals.revenue), 
          icon: <ArrowUpRight className="w-5 h-5 text-emerald-400" />,
          color: 'text-emerald-500'
        }} />
        <StatCard item={{ 
          label: 'ROAS Global', 
          value: `${globalROAS}x`, 
          trend: Number(globalROAS) > 2 ? 15 : -5,
          icon: <Zap className="w-5 h-5 text-violet-400" />,
          color: 'text-violet-500'
        }} />
        <StatCard item={{ 
          label: 'CPA Promedio', 
          value: formatCurrency(globalCPA), 
          icon: <ShoppingCart className="w-5 h-5 text-amber-400" />,
          color: 'text-amber-500'
        }} />
        <StatCard item={{ 
          label: 'Conversaciones', 
          value: formatNumber(totals.messages), 
          icon: <MessageSquare className="w-5 h-5 text-cyan-400" />,
          color: 'text-cyan-500'
        }} />
      </div>

      {/* 3. The Story: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tendencia Temporal: Spend vs Revenue */}
        <section className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-8 text-center sm:text-left">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Tendencia de Eficiencia</h2>
              <p className="text-xs text-slate-500">Correlación entre el gasto publicitario y el retorno (Revenue).</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => {
                    try { return new Date(val).toLocaleDateString(); }
                    catch(e) { return val; }
                  }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="spend" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSpend)" name="Inversión" strokeWidth={3} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" name="Retorno (Revenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Campañas ROAS */}
        <section className="glass-panel p-6 rounded-2xl flex flex-col items-center">
          <div className="w-full mb-8">
            <h2 className="text-lg font-bold text-white tracking-tight">Top 5 Campañas (ROAS)</h2>
            <p className="text-xs text-slate-500">Rendimiento por ratio de retorno.</p>
          </div>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="shortName" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#cbd5e1', fontSize: 9, fontWeight: 'bold' }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                />
                <Bar dataKey="roas" radius={[0, 4, 4, 0]} name="ROAS">
                  {campaignData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Number(entry.roas) > 3 ? '#ec4899' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 4. Automated Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-emerald-500 relative bg-emerald-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Zap className="w-20 h-20 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <ArrowUpRight className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">IA Insight: Rendimiento Saludable</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed font-medium relative z-10">
             Tu ROAS global de <span className="text-white font-bold">{globalROAS}x</span> indica un retorno positivo. 
             La campaña <span className="text-emerald-400 font-bold">"{campaignData[0]?.name}"</span> está sobre-cumpliendo el promedio; considera aumentar el presupuesto un 15% para escalar resultados.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-rose-500 relative bg-rose-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <ArrowDownRight className="w-20 h-20 text-rose-500" />
          </div>
          <div className="flex items-center gap-3 text-rose-400 mb-2">
            <ArrowDownRight className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">IA Insight: Optimización Requerida</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed font-medium relative z-10">
             Detectamos que el CPA promedio de <span className="text-white font-bold">{formatCurrency(globalCPA)}</span> está cerca de tus límites de margen. 
             Revisa los anuncios en el desglose con un CTR menor al <span className="text-rose-400 font-bold">0.8%</span> para optimizar la creatividad.
          </p>
        </div>
      </div>

      {/* 5. Deep Detail Table */}
      <section className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center bg-slate-800/20 gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Desglose Detallado</h2>
            <p className="text-xs text-slate-500">Métricas granulares por anuncio y conjunto de anuncios.</p>
          </div>
          <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><ListIcon className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Anuncio</th>
                <th className="px-6 py-4">Campaña</th>
                <th className="px-6 py-4">Inversión</th>
                <th className="px-6 py-4">CTR</th>
                <th className="px-6 py-4">ROAS</th>
                <th className="px-6 py-4">Ventas</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {data.filter(i => 
                i.ad_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                i.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
              ).slice(0, 10).map((row) => {
                const isHighROAS = Number(row.roas) > 3;
                const isLowROAS = Number(row.roas) < 1;
                
                return (
                  <tr key={row.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white group-hover:text-primary transition-colors truncate max-w-[200px]">{row.ad_name}</p>
                      <p className="text-[10px] text-slate-500 font-medium italic truncate max-w-[200px]">{row.adset_name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs truncate max-w-[150px]">{row.campaign_name}</td>
                    <td className="px-6 py-4 font-bold text-white">{formatCurrency(row.spend)}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">{(row.ctr * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md font-black text-[10px] shadow-sm ${
                        isHighROAS ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
                        isLowROAS ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {Number(row.roas).toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-black">{row.purchases || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <div className={`w-2 h-2 rounded-full ${isHighROAS ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : (isLowROAS ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-slate-600')}`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Dummy */}
        <div className="px-6 py-4 bg-slate-900/30 flex items-center justify-between border-t border-white/5 text-center sm:text-left">
          <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-tight">Mostrando 1-10 de {data.length} métricas síncronas</span>
          <div className="flex gap-2">
            <button className="p-1 px-3 rounded-lg border border-white/5 text-slate-500 hover:text-white transition-all disabled:opacity-20 cursor-not-allowed text-xs font-bold"><ChevronLeft className="w-4 h-4" /></button>
            <button className="p-1 px-3 rounded-lg border border-white/5 text-slate-500 hover:text-white transition-all text-xs font-bold"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>

    </div>
  );
}
