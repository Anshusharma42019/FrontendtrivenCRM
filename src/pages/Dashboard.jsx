import { useEffect, useState, useCallback } from 'react';
import StatCard from '../components/ui/StatCard';
import { fetchStats, fetchStaffTodayLists, fetchAllStaffStats } from '../services/dashboard.service';
import * as srSvc from '../services/shiprocket.service';
import * as attendanceSvc from '../services/attendance.service';
import { useAuth } from '../context/AuthContext';
import OrderStatusBoard from '../components/OrderStatusBoard';

const cardCls = "bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow";
const cardStyle = { border: '1px solid rgba(0,0,0,0.05)' };
const inp = "border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500 bg-white";

const icons = {
  cnp: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M16.5 1.5a4.5 4.5 0 0 1 4.5 4.5v12a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 18V6a4.5 4.5 0 0 1 4.5-4.5h9z"/><line x1="4" y1="4" x2="20" y2="20"/></svg>,
  callAgain: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  interested: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  notInterested: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  user: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  phone: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
};

const formatDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeStatus = (status) => String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');

const formatStatusLabel = (status) => String(status || '').replace(/_/g, ' ');

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString()}`;

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveredStats, setDeliveredStats] = useState({ count: 0, revenue: 0, statusBreakdown: [] });
  const [statusError, setStatusError] = useState('');
  const [attStatus, setAttStatus] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [todayLists, setTodayLists] = useState({ cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [] });
  const [allStaffStats, setAllStaffStats] = useState([]);
  const [openSection, setOpenSection] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, att, lists, staff] = await Promise.all([
        fetchStats(),
        attendanceSvc.getTodayStatus(),
        fetchStaffTodayLists(),
        fetchAllStaffStats()
      ]);
      setStats(s);
      setAttStatus(att);
      setTodayLists(lists || { cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [] });
      setAllStaffStats(staff || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadDelivered = useCallback((params = {}) => {
    srSvc.getDeliveredStats(params).then(res => {
      const { count, revenue, statusBreakdown } = res.data?.data || {};
      setDeliveredStats({ count: count || 0, revenue: revenue || 0, statusBreakdown: statusBreakdown || [] });
    }).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    setAttLoading(true);
    try { const res = await attendanceSvc.checkIn(); setAttStatus(res); load(); }
    catch (e) { alert(e.response?.data?.message || 'Check-in failed'); }
    setAttLoading(false);
  };

  const handleCheckOut = async () => {
    setAttLoading(true);
    try { const res = await attendanceSvc.checkOut(); setAttStatus(res); load(); }
    catch (e) { alert(e.response?.data?.message || 'Check-out failed'); }
    setAttLoading(false);
  };

  const checkedIn = !!attStatus?.checkIn;
  const checkedOut = !!attStatus?.checkOut;
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

  useEffect(() => {
    load();
    const t = setInterval(load, Number(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL) || 120000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    loadDelivered(getDateParams('today', '', ''));
  }, [loadDelivered]);

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
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Total Leads" value={stats?.totalLeads} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} color="border-green-500" />
        <StatCard label="New Leads Today" value={stats?.newLeadsToday} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>} color="border-blue-500" />
        <StatCard label="Ready to Shipment" value={stats?.readyToShipmentCount} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>} color="border-purple-500" />
        <StatCard label="Delivered Orders" value={deliveredStats.count} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} color="border-emerald-500" />
        <StatCard label="Delivered Revenue" value={`₹${deliveredStats.revenue.toLocaleString()}`} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} color="border-teal-500" />
      </div>

      {/* Attendance Stats Row */}
      {user?.role === 'manager' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-green-100 bg-green-50/30">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Present Today</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats?.attendance?.present || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-orange-100 bg-orange-50/30">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Checked Out</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats?.attendance?.checkedOut || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-red-100 bg-red-50/30">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Absent Staff</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats?.attendance?.absent || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-blue-100 bg-blue-50/30">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.attendance?.totalStaff || 0}</p>
        </div>
      </div>
      )}

      {/* My Attendance Quick Card */}
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

      {/* Staff Activity Counts */}
      {user?.role === 'manager' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "CNP", value: stats?.activity?.todayCnp ?? 0, icon: icons.cnp, bg: "bg-red-50", text: "text-red-500" },
          { label: "Call Again", value: stats?.activity?.todayCallAgain ?? 0, icon: icons.callAgain, bg: "bg-yellow-50", text: "text-yellow-600" },
          { label: "Interested", value: stats?.activity?.todayInterested ?? 0, icon: icons.interested, bg: "bg-green-50", text: "text-green-600" },
          { label: "Not Interested", value: stats?.activity?.todayNotInterested ?? 0, icon: icons.notInterested, bg: "bg-gray-50", text: "text-gray-500" },
        ].map(({ label, value, icon, bg, text }) => (
          <div key={label} className={`${cardCls} flex flex-col items-center justify-center text-center gap-2 py-6`} style={cardStyle}>
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
              <span className={text}>{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-500 font-medium">Today's {label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Staff Performance Overview Table */}
      {user?.role === 'manager' && (
        <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Staff Performance</h3>
          <span className="text-xs text-gray-400">Real-time tracking</span>
        </div>
        <div className="table-responsive no-scrollbar">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-50 text-left">
                <th className="py-3 px-2 font-semibold uppercase tracking-wider w-40">Staff Name</th>
                <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center">Today Verif.</th>
                <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center">Month Verif.</th>
                <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center">Target</th>
                <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center">Pending Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allStaffStats.map(s => (
                <tr key={s.user._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {s.user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700 truncate">{s.user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-green-600">{s.todayVerifications}</td>
                  <td className="py-3 px-2 text-center font-bold text-blue-600">{s.monthVerifications}</td>
                  <td className="py-3 px-2 text-center text-gray-500">{s.todayTarget || '—'}</td>
                  <td className="py-3 px-2 text-center font-semibold text-orange-500">{s.pendingTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Staff Activity Detail Lists */}
      {user?.role === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { key: 'cnp', label: 'CNP List', icon: icons.cnp, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', list: todayLists.cnpList },
          { key: 'callAgain', label: 'Call Again List', icon: icons.callAgain, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', list: todayLists.callAgainList },
          { key: 'interested', label: 'Interested List', icon: icons.interested, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', list: todayLists.interestedList },
          { key: 'notInterested', label: 'Not Interested List', icon: icons.notInterested, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', list: todayLists.notInterestedList },
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
                  <p className="text-sm text-gray-400 text-center py-6">No records for today</p>
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

      {/* Order Status Cards */}
      <OrderStatusBoard />

      {/* Tasks Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Pending Tasks" value={stats?.tasks?.pending} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} color="border-orange-400" />
        <StatCard label="Overdue Tasks" value={stats?.tasks?.overdue} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} color="border-red-500" />
      </div>
    </div>
  );
}
