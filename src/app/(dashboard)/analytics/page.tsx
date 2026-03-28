import { Suspense } from 'react';
import { 
  BarChart3, 
  Target, 
  Smile, 
  Frown, 
  Meh, 
  Zap,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
        <p className="text-slate-400">Deep insights into lead quality and conversion funnels.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Lead Accuracy" 
          value="94%" 
          trend="up" 
          detail="+2.4% from last month"
          icon={<Target className="w-5 h-5 text-indigo-400" />}
        />
        <MetricCard 
          title="Conversion Rate" 
          value="18.2%" 
          trend="up" 
          detail="+0.5% this week"
          icon={<Zap className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard 
          title="Bot Attrition" 
          value="4.1%" 
          trend="down" 
          detail="-1.2% reduction"
          icon={<TrendingDown className="w-5 h-5 text-rose-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sentiment Analysis */}
        <section className="glass-panel p-8 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Customer Sentiment</h2>
          <div className="flex items-center justify-around py-4">
            <SentimentGauge label="Positive" icon={<Smile className="text-emerald-400 w-10 h-10" />} value={72} color="bg-emerald-500" />
            <SentimentGauge label="Neutral" icon={<Meh className="text-slate-400 w-10 h-10" />} value={18} color="bg-slate-500" />
            <SentimentGauge label="Negative" icon={<Frown className="text-rose-400 w-10 h-10" />} value={10} color="bg-rose-500" />
          </div>
        </section>

        {/* Funnel Insights */}
        <section className="glass-panel p-8 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Funnel Leak Points</h2>
          <div className="space-y-6">
            <LeakPoint 
              title="Pricing Resistance" 
              count={124} 
              description="High drop-off when discussing the Pro tier."
              impact="High"
            />
            <LeakPoint 
              title="Identity Check" 
              count={42} 
              description="Users hesitate during automated validation."
              impact="Medium"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, detail, icon }: { title: string; value: string; trend: 'up'|'down'; detail: string; icon: React.ReactNode }) {
  return (
    <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary hover:translate-y-[-2px] transition-transform cursor-default">
      <div className="flex justify-between items-center mb-4">
        <div className="p-2 rounded-lg bg-slate-800/80">
          {icon}
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend === 'up' ? 'Increase' : 'Decrease'}
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-tight">{title}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function SentimentGauge({ label, icon, value, color }: { label: string; icon: React.ReactNode; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="p-4 rounded-full bg-slate-800/40 group-hover:bg-slate-800 transition-colors">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-white">{value}%</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <div className="w-16 h-1 mt-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function LeakPoint({ title, count, description, impact }: { title: string; count: number; description: string; impact: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 hover:border-slate-700 transition-all">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
          impact === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
        }`}>
          {impact} Impact
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{count} occurrences</span>
        <button className="text-[10px] flex items-center gap-1 text-primary hover:underline uppercase font-bold">
          View Details <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
