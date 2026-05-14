import { useEffect, useState, useCallback, useMemo } from 'react';
import StatCard from '../components/ui/StatCard';
import { 
  fetchStats, 
  fetchStaffTodayLists, 
  fetchAllStaffStats, 
  fetchStaffStats, 
  fetchStaffMonthlyChart, 
  fetchStaffCommission,
  fetchAllStaffCommissions 
} from '../services/dashboard.service';
import * as attendanceSvc from '../services/attendance.service';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import OrderStatusBoard from '../components/OrderStatusBoard';

const cardCls = "bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow";
const cardStyle = { border: '1px solid rgba(0,0,0,0.05)' };
const inp = 'border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500 bg-white';

const DATE_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

const formatDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDateParams = (preset, customFrom, customTo) => {
  if (preset === 'all') return {};
  const today = new Date();
  const to = formatDateInput(today);
  if (preset === 'today') return { filterType: 'range', from: to, to };
  if (preset === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const day = formatDateInput(d);
    return { filterType: 'range', from: day, to: day };
  }
  if (preset === 'last7') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { filterType: 'range', from: formatDateInput(d), to };
  }
  if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { filterType: 'range', from: formatDateInput(d), to };
  }
  if (preset === 'custom' && customFrom && customTo) {
    return { filterType: 'range', from: customFrom, to: customTo };
  }
  return {};
};

const icons = {
  cnp: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M16.5 1.5a4.5 4.5 0 0 1 4.5 4.5v12a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 18V6a4.5 4.5 0 0 1 4.5-4.5h9z"/><line x1="4" y1="4" x2="20" y2="20"/></svg>,
  callAgain: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  interested: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  notInterested: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  user: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  phone: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  leadAdd: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  verify: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveredStats, setDeliveredStats] = useState({ count: 0, revenue: 0, statusBreakdown: [] });
  const [todayLists, setTodayLists] = useState({ cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [], onHoldList: [] });
  const [staffStats, setStaffStats] = useState(null);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [attStatus, setAttStatus] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [commission, setCommission] = useState(null);
  const [commMonth, setCommMonth] = useState(() => { const n = new Date(); return { month: n.getMonth(), year: n.getFullYear() }; });
  const [commLoading, setCommLoading] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  
  const [datePreset, setDatePreset] = useState('today');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(async () => {
    const params = getDateParams(datePreset, filterFrom, filterTo);
    const { from, to } = params;
    const selectedDate = (datePreset === 'today' || !from) ? new Date().toISOString().split('T')[0] : from;

    try {
      const [s, lists, personal, chart, att] = await Promise.allSettled([
        fetchStats(selectedDate, from, to),
        fetchStaffTodayLists(selectedDate, null, from, to),
        fetchStaffStats(selectedDate, null, from, to),
        fetchStaffMonthlyChart(),
        attendanceSvc.getTodayStatus()
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (lists.status === 'fulfilled') setTodayLists(lists.value || { cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [], onHoldList: [] });
      if (personal.status === 'fulfilled') setStaffStats(personal.value || null);
      if (chart.status === 'fulfilled') setMonthlyChart(Array.isArray(chart.value) ? chart.value : []);
      if (att.status === 'fulfilled') setAttStatus(att.value);
    } catch (e) { console.error('Dashboard load error:', e); }
    finally { setLoading(false); }
  }, [datePreset, filterFrom, filterTo]);

  useEffect(() => {
    load();
    const t = setInterval(load, Number(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) || 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setCommLoading(true);
    
    const isPrivileged = user?.role === 'admin' || user?.role === 'manager';
    const fetchFunc = isPrivileged ? fetchAllStaffCommissions : fetchStaffCommission;

    fetchFunc(commMonth.month, commMonth.year)
      .then(d => { 
        if (!cancelled) {
          if (isPrivileged) {
            setCommission({
              totalPay: d.grandTotalPay,
              basePay: (d.grandTotalPay || 0) - (d.grandTotalCommission || 0),
              totalCommission: d.grandTotalCommission,
              revenue: d.grandTotalRevenue
            });
          } else {
            setCommission(d);
          }
        } 
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCommLoading(false); });
    return () => { cancelled = true; };
  }, [commMonth, user?.role]);

  const checkedIn = !!attStatus?.checkIn;
  const checkedOut = !!attStatus?.checkOut;
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

  const handleCheckIn = async () => {
    setAttLoading(true);
    try { 
      const res = await attendanceSvc.checkIn(); 
      setAttStatus(res); 
      success('Good morning! You have checked in successfully.', 'Clock In');
    }
    catch (e) { error(e.response?.data?.message || 'Check-in failed'); }
    setAttLoading(false);
  };
  const handleCheckOut = async () => {
    setAttLoading(true);
    try { 
      const res = await attendanceSvc.checkOut(); 
      setAttStatus(res); 
      info('Work day finished. Take care!', 'Clock Out');
    }
    catch (e) { error(e.response?.data?.message || 'Check-out failed'); }
    setAttLoading(false);
  };

  const selectDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      const today = new Date();
      const from = formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
      const to = formatDateInput(today);
      setFilterFrom(from);
      setFilterTo(to);
    }
  };

  const filterParams = useMemo(() => getDateParams(datePreset, filterFrom, filterTo), [datePreset, filterFrom, filterTo]);

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading dashboard...
      </div>
    </div>
  );
  const getPeriodLabel = () => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'yesterday') return 'Yesterday';
    if (datePreset === 'last7') return 'Last 7 Days';
    if (datePreset === 'month') return 'This Month';
    if (datePreset === 'all') return 'All Time';
    return `${filterFrom} to ${filterTo}`;
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 ${cardCls}`} style={cardStyle}>
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
             <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
           </div>
           <div>
             <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Dashboard Overview</h2>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Filtering for: {getPeriodLabel().toUpperCase()}</p>
           </div>
        </div>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1 shrink-0">
              {DATE_FILTERS.map(filter => (
                <button key={filter.id} onClick={() => selectDatePreset(filter.id)}
                  className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    datePreset === filter.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {filter.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className={`${inp} py-2`} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              <input type="date" className={`${inp} py-2`} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              <button onClick={load} className="h-9 px-4 rounded-xl bg-green-600 text-white text-[10px] font-bold hover:bg-green-700 transition active:scale-95">APPLY</button>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Total Leads" value={stats?.totalLeads} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} color="border-green-500" />
        <StatCard label={datePreset === 'all' ? "New Leads (Total)" : `New Leads (${getPeriodLabel()})`} value={stats?.newLeadsToday} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} color="border-blue-500" />
        <StatCard label="Ready to Shipment" value={stats?.readyToShipmentCount} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>} color="border-purple-500" />
        <StatCard label={`Delivered (${getPeriodLabel()})`} value={deliveredStats.count} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} color="border-emerald-500" />
        <StatCard label={`Revenue (${getPeriodLabel()})`} value={`₹${deliveredStats.revenue.toLocaleString()}`} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} color="border-teal-500" />
      </div>

      {/* Attendance Quick Card (Managers Only) */}
      {user?.role === 'manager' && (
        <div className={cardCls} style={{ ...cardStyle, background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)', border: 'none' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Personal Attendance</p>
                <p className="text-green-300/60 text-xs mt-0.5">
                  {checkedIn && checkedOut ? `In: ${fmtTime(attStatus.checkIn)} · Out: ${fmtTime(attStatus.checkOut)}`
                    : checkedIn ? `Checked in at ${fmtTime(attStatus.checkIn)}`
                    : 'Not checked in yet'}
                </p>
              </div>
            </div>
            <div>
              {!checkedIn ? (
                <button onClick={handleCheckIn} disabled={attLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {attLoading ? 'Processing...' : <><svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Clock In</>}
                </button>
              ) : !checkedOut ? (
                <button onClick={handleCheckOut} disabled={attLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  {attLoading ? 'Processing...' : <><svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Clock Out</>}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/20 text-green-300 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/></svg>
                  Day Complete
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Activity Counts (Staff Only) */}
      {user?.role === 'sales' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">My Activity Counts</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "CNP", value: staffStats?.todayCnp ?? 0, icon: icons.cnp, bg: "bg-red-50", text: "text-red-500" },
              { label: "Call Again", value: staffStats?.todayCallAgain ?? 0, icon: icons.callAgain, bg: "bg-yellow-50", text: "text-yellow-600" },
              { label: "Lead Add", value: staffStats?.leadsAdded ?? 0, icon: icons.leadAdd, bg: "bg-blue-50", text: "text-blue-600" },
              { label: "Verified", value: staffStats?.verifiedCount ?? 0, icon: icons.verify, bg: "bg-emerald-50", text: "text-emerald-600" },
              { label: "On Hold", value: staffStats?.onHoldCount ?? 0, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, bg: "bg-amber-50", text: "text-amber-600" },
              { label: "Interested", value: staffStats?.todayInterested ?? 0, icon: icons.interested, bg: "bg-green-50", text: "text-green-600" },
              { label: "Not Interested", value: staffStats?.todayNotInterested ?? 0, icon: icons.notInterested, bg: "bg-gray-50", text: "text-gray-500" },
            ].map(({ label, value, icon, bg, text }) => (
              <div key={label} className={`${cardCls} flex flex-col items-center justify-center text-center gap-1.5 py-4 px-2`} style={cardStyle}>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 mb-1`}>
                  <span className={text}>{icon}</span>
                </div>
                <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Order Status Cards */}
      <OrderStatusBoard onStatsChange={setDeliveredStats} filterParams={filterParams} />

      {/* Earnings & Activity Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 ${cardCls}`} style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-700">Company Earnings</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCommMonth(p => {
                const m = p.month - 1;
                return m < 0 ? { month: 11, year: p.year - 1 } : { month: m, year: p.year };
              })} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
              <span className="text-[10px] font-bold text-gray-600 min-w-[70px] text-center uppercase tracking-tight">
                {new Date(commMonth.year, commMonth.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => setCommMonth(p => {
                const m = p.month + 1;
                return m > 11 ? { month: 0, year: p.year + 1 } : { month: m, year: p.year };
              })} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
            </div>
          </div>
          {commLoading ? (
             <div className="flex items-center justify-center py-10"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : commission ? (
            <div className="space-y-4">
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="bg-emerald-600 rounded-2xl p-5 text-center shadow-lg border border-emerald-500/50">
                  <p className="text-2xl font-bold text-white">₹{(commission.revenue || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">Total Revenue</p>
                </div>
              )}
              <div className="bg-gray-900 rounded-2xl p-5 text-center shadow-lg">
                <p className="text-2xl font-bold text-white">₹{(commission.totalPay || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Payouts</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-lg font-bold text-green-600">₹{(commission.basePay || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[9px] text-green-700 font-bold uppercase">Base</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-lg font-bold text-amber-600">₹{(commission.totalCommission || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[9px] text-amber-700 font-bold uppercase">Comm.</p>
                </div>
              </div>
            </div>
          ) : <p className="text-xs text-gray-400 text-center py-6">No data</p>}
        </div>

        <div className={`lg:col-span-2 ${cardCls}`} style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-700">Company Activity Trend</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verifications</span>
          </div>
          {monthlyChart.length > 0 && (
            <div className="h-48 relative group px-2">
              {(() => {
                const max = Math.max(...monthlyChart.map(d => d.count), 5);
                const points = monthlyChart.map((d, i) => {
                  const x = (i / (monthlyChart.length - 1)) * 100;
                  const y = 92 - (d.count / max) * 84;
                  return `${x},${y}`;
                }).join(' L ');
                
                return (
                  <>
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 25, 50, 75, 100].map(v => (
                        <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="#f3f4f6" strokeWidth="0.5" />
                      ))}
                      <path d={`M 0 100 L ${points} L 100 100 Z`} fill="url(#chartGrad)" />
                      <path d={`M ${points}`} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="absolute inset-0 flex">
                      {monthlyChart.map((d, i) => (
                        <div key={i} className="flex-1 group/dot relative h-full">
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-1.5 rounded opacity-0 group-hover/dot:opacity-100 transition-opacity z-20 whitespace-nowrap pointer-events-none shadow-xl">
                            {new Date().toLocaleString('default', { month: 'short' })} {d.day}: <span className="font-bold">{d.count}</span>
                          </div>
                          <div 
                            className="absolute w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm opacity-0 group-hover/dot:opacity-100 transition-all scale-0 group-hover/dot:scale-110"
                            style={{ 
                              left: '50%', 
                              bottom: `${8 + (d.count / max) * 84}%`,
                              transform: 'translate(-50%, 50%)'
                            }}
                          />
                          <div className="absolute inset-y-0 left-0 w-full cursor-crosshair" />
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between px-1 pt-4 border-t border-gray-50">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">01 {new Date().toLocaleString('default', { month: 'short' })}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{monthlyChart.length} {new Date().toLocaleString('default', { month: 'short' })}</span>
          </div>
        </div>
      </div>

      {/* Staff Activity Detail Lists (Staff Only) */}
      {user?.role === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { key: 'cnp', label: `CNP List (${getPeriodLabel()})`, icon: icons.cnp, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', list: todayLists.cnpList },
            { key: 'callAgain', label: `Call Again List (${getPeriodLabel()})`, icon: icons.callAgain, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', list: todayLists.callAgainList },
            { key: 'interested', label: `Interested List (${getPeriodLabel()})`, icon: icons.interested, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', list: todayLists.interestedList },
            { key: 'onHold', label: `On Hold List (${getPeriodLabel()})`, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', list: todayLists.onHoldList },
            { key: 'notInterested', label: `Not Interested List (${getPeriodLabel()})`, icon: icons.notInterested, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', list: todayLists.notInterestedList },
          ].map(({ key, label, icon, color, bg, border, list }) => (
            <div key={key} className={cardCls} style={cardStyle}>
              <button className="w-full flex items-center justify-between"
                onClick={() => setOpenSection(openSection === key ? null : key)}>
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-xl ${bg} ${color} flex items-center justify-center`}>{icon}</span>
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bg} ${color} border ${border}`}>{list.length}</span>
                </div>
                <span className="text-gray-400 text-sm">{openSection === key ? '▲' : '▼'}</span>
              </button>
              {openSection === key && (
                <div className="mt-4 divide-y divide-gray-50 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {list.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No records for {getPeriodLabel()}</p>
                  ) : list.map((item, i) => (
                    <div key={item._id} className="py-3 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center text-[10px] font-bold ${color} shrink-0`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.title || item.lead?.name || '—'}</p>
                        <div className="flex gap-3 mt-0.5">
                          {item.assignedTo?.name && <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">{icons.user}{item.assignedTo.name}</span>}
                          {item.lead?.phone && <span className="text-[10px] text-gray-500 flex items-center gap-1">{icons.phone}{item.lead.phone}</span>}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-400 shrink-0">
                        {new Date(item.createdAt || item.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tasks Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Pending Tasks" value={stats?.tasks?.pending} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} color="border-orange-400" />
        <StatCard label="Overdue Tasks" value={stats?.tasks?.overdue} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} color="border-red-500" />
      </div>
    </div>
  );
}
