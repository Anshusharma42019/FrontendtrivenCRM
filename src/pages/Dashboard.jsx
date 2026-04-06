import { useEffect, useState, useCallback } from 'react';
import StatCard from '../components/ui/StatCard';
import { fetchStats, fetchRevenueChart } from '../services/dashboard.service';

const FUNNEL_COLORS = {
  new: 'from-blue-400 to-blue-500',
  contacted: 'from-yellow-400 to-amber-500',
  interested: 'from-purple-400 to-violet-500',
  follow_up: 'from-orange-400 to-orange-500',
  closed_won: 'from-green-400 to-emerald-500',
  closed_lost: 'from-red-400 to-rose-500',
};

const cardCls = "bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow";
const cardStyle = { border: '1px solid rgba(0,0,0,0.05)' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([fetchStats(), fetchRevenueChart(period)]);
      setStats(s); setChart(c);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => {
    load();
    const t = setInterval(load, Number(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) || 30000);
    return () => clearInterval(t);
  }, [load]);

  const maxFunnel = stats ? Math.max(...stats.salesFunnel.map(f => f.count), 1) : 1;
  const maxRevenue = chart.length ? Math.max(...chart.map(c => c.revenue), 1) : 1;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading dashboard...
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back! Here's what's happening.</p>
        </div>
        <span className="text-xs text-gray-300 bg-white px-3 py-1.5 rounded-xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          Live · {(Number(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) || 30000) / 1000}s refresh
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={stats?.totalLeads} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} color="border-green-500" />
        <StatCard label="New Leads Today" value={stats?.newLeadsToday} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} color="border-blue-500" />
        <StatCard label="Converted" value={stats?.convertedLeads} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>} color="border-emerald-500"
          sub={`${stats?.conversionRate ?? 0}% conversion rate`} />
        <StatCard label="Revenue" value={`₹${(stats?.revenue ?? 0).toLocaleString()}`} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} color="border-yellow-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Funnel */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Sales Funnel</h3>
          <div className="space-y-4">
            {stats?.salesFunnel.map(({ stage, count }) => (
              <div key={stage}>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="capitalize font-medium">{stage.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-gray-700">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full bg-gradient-to-r ${FUNNEL_COLORS[stage] || 'from-gray-300 to-gray-400'} transition-all`}
                    style={{ width: `${Math.round((count / maxFunnel) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Performance */}
        <div className={cardCls} style={cardStyle}>
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Lead Source Performance</h3>
          <div className="space-y-4">
            {stats?.sourcePerformance.length === 0 && <p className="text-sm text-gray-300">No data yet</p>}
            {stats?.sourcePerformance.map(({ source, count, percentage }) => (
              <div key={source}>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="capitalize font-medium">{source.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-gray-700">{count} <span className="text-gray-400 font-normal">({percentage}%)</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                    style={{ width: `${percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-gray-700">Revenue Chart</h3>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        {chart.length === 0 ? (
          <p className="text-sm text-gray-300">No revenue data yet</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {chart.map((c, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">
                  ₹{(c.revenue / 1000).toFixed(0)}k
                </span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-green-500 to-emerald-400 transition-all hover:from-green-400 hover:to-emerald-300"
                  style={{ height: `${Math.round((c.revenue / maxRevenue) * 120)}px` }} />
                <span className="text-xs text-gray-400">
                  {period === 'monthly' ? `${c._id.month}/${String(c._id.year).slice(2)}` : `W${c._id.week}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Pending Tasks" value={stats?.tasks?.pending} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} color="border-orange-400" />
        <StatCard label="Overdue Tasks" value={stats?.tasks?.overdue} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} color="border-red-500" />
      </div>
    </div>
  );
}
