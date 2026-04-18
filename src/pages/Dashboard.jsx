import { useEffect, useState, useCallback } from 'react';
import StatCard from '../components/ui/StatCard';
import { fetchStats } from '../services/dashboard.service';
import * as srSvc from '../services/shiprocket.service';

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
const inp = "border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500 bg-white";

const PIE_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#ec4899','#6366f1','#84cc16',
  '#14b8a6','#a855f7','#64748b','#0ea5e9','#d946ef',
];

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return null;
  const cx = 80, cy = 80, r = 70;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const pct = d.count / total;
    const start = angle;
    angle += pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    const large = pct > 0.5 ? 1 : 0;
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length], ...d };
  });
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="1.5" />)}
        <circle cx={cx} cy={cy} r="30" fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1f2937">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#6b7280">orders</text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600 truncate flex-1">{s._id}</span>
            <span className="font-semibold text-gray-800 shrink-0">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveredStats, setDeliveredStats] = useState({ count: 0, revenue: 0, statusBreakdown: [] });
  const [filterType, setFilterType] = useState('all');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await fetchStats();
      setStats(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadDelivered = useCallback((params = {}) => {
    srSvc.getDeliveredStats(params).then(res => {
      const { count, revenue, statusBreakdown } = res.data?.data || {};
      setDeliveredStats({ count: count || 0, revenue: revenue || 0, statusBreakdown: statusBreakdown || [] });
    }).catch(() => {});
  }, []);

  const applyFilter = () => {
    if (filterType === 'all') loadDelivered();
    else if (filterType === 'yearly') loadDelivered({ filterType: 'yearly', year: filterYear });
    else if (filterType === 'monthly') loadDelivered({ filterType: 'monthly', year: filterYear, month: filterMonth });
    else if (filterType === 'range') loadDelivered({ filterType: 'range', from: filterFrom, to: filterTo });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, Number(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) || 120000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { loadDelivered(); }, [loadDelivered]);

  const maxFunnel = stats ? Math.max(...stats.salesFunnel.map(f => f.count), 1) : 1;

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading dashboard...
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back! Here's what's happening.</p>
        </div>
        <span className="text-xs text-gray-300 bg-white px-3 py-1.5 rounded-xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          Live · {(Number(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) || 120000) / 1000}s refresh
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Total Leads" value={stats?.totalLeads} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} color="border-green-500" />
        <StatCard label="New Leads Today" value={stats?.newLeadsToday} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} color="border-blue-500" />
        <StatCard label="Ready to Shipment" value={stats?.readyToShipmentCount} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>} color="border-purple-500" />
        <StatCard label="Delivered Orders" value={deliveredStats.count} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} color="border-emerald-500" />
        <StatCard label="Delivered Revenue" value={`₹${deliveredStats.revenue.toLocaleString()}`} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} color="border-teal-500" />
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

      {/* Order Status Pie Chart */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Order Status Distribution</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select className={inp} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Time</option>
              <option value="yearly">Yearly</option>
              <option value="monthly">Monthly</option>
              <option value="range">Date Range</option>
            </select>
            {(filterType === 'yearly' || filterType === 'monthly') && (
              <select className={inp} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {filterType === 'monthly' && (
              <select className={inp} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
              </select>
            )}
            {filterType === 'range' && (
              <>
                <input type="date" className={inp} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                <input type="date" className={inp} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              </>
            )}
            <button onClick={applyFilter}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 font-semibold">
              Apply
            </button>
          </div>
        </div>
        {deliveredStats.statusBreakdown.length === 0 ? (
          <p className="text-sm text-gray-300">No order data yet</p>
        ) : (
          <PieChart data={deliveredStats.statusBreakdown} />
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
