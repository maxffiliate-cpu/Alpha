import { Suspense } from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  AlertCircle 
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-slate-400">Welcome back, Alpha. Here's what's happening today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Conversations" 
          value="1,284" 
          change="+12%" 
          icon={<MessageSquare className="w-5 h-5" />}
        />
        <StatCard 
          title="Active Sessions" 
          value="24" 
          change="+4" 
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard 
          title="Avg. Sentiment" 
          value="8.4" 
          change="+0.2" 
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard 
          title="Response Time" 
          value="1.2s" 
          change="-0.3s" 
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <section className="glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <ActivityItem 
                user="John Doe" 
                action="New lead identified" 
                detail="Score: 92/100" 
                time="2m ago"
              />
              <ActivityItem 
                user="AI Agent" 
                action="Handled inquiry" 
                detail="Product: Premium Plan" 
                time="15m ago"
              />
              <ActivityItem 
                user="System" 
                action="Panic Button triggered" 
                detail="Session #4829 - Human required" 
                time="1h ago"
                urgent
              />
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <section className="glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between p-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-foreground border border-primary/20 transition-all">
                <span>View All Leads</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all">
                <span>Export Reports</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) {
  const isPositive = change.startsWith('+') || change.startsWith('-');
  return (
    <div className="glass-panel p-6 rounded-2xl hover:bg-slate-800/20 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-slate-800/50 text-slate-400 group-hover:text-primary transition-colors">
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {change}
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, detail, time, urgent }: { user: string; action: string; detail: string; time: string; urgent?: boolean }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
      <div className={`w-2 h-10 rounded-full ${urgent ? 'bg-rose-500' : 'bg-primary'}`} />
      <div className="flex-1 space-y-1">
        <div className="flex justify-between">
          <span className="text-sm font-semibold text-white">{user}</span>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
        <p className="text-sm text-slate-300">{action}</p>
        <p className="text-xs text-slate-500 italic">{detail}</p>
      </div>
    </div>
  );
}
