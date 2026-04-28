import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/ui/StatCard';
import { 
  fetchStats, 
  saveStaffTarget, 
  fetchStaffVerifications, 
  fetchStaffTodayLists, 
  fetchStaffMonthlyChart, 
  fetchStaffCommission 
} from '../services/dashboard.service';
import * as attendanceSvc from '../services/attendance.service';

const cardCls = "bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow";
const cardStyle = { border: '1px solid rgba(0,0,0,0.05)' };

const icons = {
  cnp: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M16.5 1.5a4.5 4.5 0 0 1 4.5 4.5v12a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 18V6a4.5 4.5 0 0 1 4.5-4.5h9z"/><line x1="4" y1="4" x2="20" y2="20"/></svg>,
  callAgain: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  interested: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  notInterested: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  verification: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  user: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  phone: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  location: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [todayLists, setTodayLists] = useState({ cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [] });
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [openSection, setOpenSection] = useState(null);
  const [targetInput, setTargetInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attStatus, setAttStatus] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [commission, setCommission] = useState(null);
  const [commMonth, setCommMonth] = useState(() => { const n = new Date(); return { month: n.getMonth(), year: n.getFullYear() }; });
  const [commLoading, setCommLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, vData, lists, chart, att] = await Promise.allSettled([
        fetchStats(), 
        fetchStaffVerifications(), 
        fetchStaffTodayLists(), 
        fetchStaffMonthlyChart(), 
        attendanceSvc.getTodayStatus()
      ]);
      
      if (s.status === 'fulfilled') setStats(s.value);
      if (vData.status === 'fulfilled') setVerifications(Array.isArray(vData.value) ? vData.value : []);
      if (lists.status === 'fulfilled') setTodayLists(lists.value || { cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [] });
      if (chart.status === 'fulfilled') setMonthlyChart(Array.isArray(chart.value) ? chart.value : []);
      if (att.status === 'fulfilled') setAttStatus(att.value);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setCommLoading(true);
    fetchStaffCommission(commMonth.month, commMonth.year)
      .then(d => { if (!cancelled) setCommission(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCommLoading(false); });
    return () => { cancelled = true; };
  }, [commMonth]);

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!targetInput || Number(targetInput) < 1) return;
    setSaving(true);
    try {
      const data = await saveStaffTarget(Number(targetInput));
      setStats(prev => ({ ...prev, todayTarget: data.todayTarget }));
      setEditing(false);
      setTargetInput('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const done = stats?.todayVerifications || 0;
  const target = stats?.todayTarget || 0;
  const remaining = target > 0 ? Math.max(target - done, 0) : 0;
  const achieved = target > 0 && done >= target;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const checkedIn = !!attStatus?.checkIn;
  const checkedOut = !!attStatus?.checkOut;
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

  const handleCheckIn = async () => {
    setAttLoading(true);
    try { const res = await attendanceSvc.checkIn(); setAttStatus(res); }
    catch (e) { alert(e.response?.data?.message || 'Check-in failed'); }
    setAttLoading(false);
  };
  const handleCheckOut = async () => {
    setAttLoading(true);
    try { const res = await attendanceSvc.checkOut(); setAttStatus(res); }
    catch (e) { alert(e.response?.data?.message || 'Check-out failed'); }
    setAttLoading(false);
  };

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading your dashboard...
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">My Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back, {user?.name}! · {today}</p>
        </div>
      </div>

      {/* Main Stats Row - Styled like Manager Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatCard label="Today's Done" value={stats?.todayVerifications} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} color="border-green-500" />
        <StatCard label="Pending Tasks" value={stats?.tasks?.pending} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} color="border-orange-500" />
        <StatCard label="Month Verifications" value={stats?.monthVerifications} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} color="border-blue-500" />
        <StatCard label="Total Leads" value={stats?.totalLeads} icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} color="border-purple-500" />
      </div>

      {/* Attendance Summary Row (Team) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-green-100 bg-green-50/30">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team Present</p>
          <p className="text-2xl font-bold text-green-600">{stats?.attendance?.present || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-orange-100 bg-orange-50/30">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Checked Out</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.attendance?.checkedOut || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-red-100 bg-red-50/30">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats?.attendance?.absent || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-blue-100 bg-blue-50/30">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Team</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.attendance?.totalStaff || 0}</p>
        </div>
      </div>

      {/* Attendance Quick Card */}
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

      {/* Target Setter */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Daily Target</h3>
          {target > 0 && !editing && (
            <button onClick={() => { setEditing(true); setTargetInput(String(target)); }}
              className="text-xs text-green-600 font-semibold hover:underline">Change</button>
          )}
        </div>
        {(!target || editing) ? (
          <form onSubmit={handleSaveTarget} className="flex items-center gap-3">
            <input type="number" min="1" max="500" value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              placeholder="Set today's verification target"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-gray-50"
              autoFocus />
            <button type="submit" disabled={saving || !targetInput}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              {saving ? 'Saving...' : 'Set Target'}
            </button>
            {editing && target > 0 && (
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
            )}
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-center bg-green-50 border border-green-100">
              <p className="text-2xl font-bold text-green-600">{done}</p>
              <p className="text-[10px] text-green-700 font-semibold uppercase mt-1">Done</p>
            </div>
            <div className={`rounded-2xl p-4 text-center border ${achieved ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className={`text-2xl font-bold ${achieved ? 'text-green-600' : 'text-orange-500'}`}>
                {achieved ? 'Done!' : remaining}
              </p>
              <p className={`text-[10px] font-semibold uppercase mt-1 ${achieved ? 'text-green-700' : 'text-orange-600'}`}>
                {achieved ? 'Achieved' : 'Remaining'}
              </p>
            </div>
            <div className="rounded-2xl p-4 text-center bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-600">{target}</p>
              <p className="text-[10px] text-blue-700 font-semibold uppercase mt-1">Target</p>
            </div>
          </div>
        )}
      </div>

      {/* Earnings & Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 ${cardCls}`} style={cardStyle}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-700">Earnings</h3>
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
              <div className="bg-gray-900 rounded-2xl p-5 text-center shadow-lg">
                <p className="text-2xl font-bold text-white">₹{(commission.totalPay || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Salary</p>
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
            <h3 className="text-sm font-semibold text-gray-700">Activity Chart</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monthly Trend</span>
          </div>
          {monthlyChart.length > 0 && (
            <div className="h-40 relative flex items-end gap-1">
              {(() => {
                const max = Math.max(...monthlyChart.map(d => d.count), 1);
                return monthlyChart.map((d, i) => (
                  <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">{d.count}</div>
                    <div className="w-full bg-green-500/20 rounded-t-sm group-hover:bg-green-500/40 transition-all" style={{ height: `${(d.count/max)*100}%` }} />
                    <div className={`w-full h-1 mt-1 rounded-full ${d.count > 0 ? 'bg-green-500' : 'bg-gray-100'}`} />
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Staff Activity Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Today's {label}</p>
          </div>
        ))}
      </div>

      {/* Activity Detail Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { key: 'cnp', label: 'CNP List', icon: icons.cnp, color: 'text-red-500', bg: 'bg-red-50', list: todayLists.cnpList },
          { key: 'callAgain', label: 'Call Again List', icon: icons.callAgain, color: 'text-yellow-600', bg: 'bg-yellow-50', list: todayLists.callAgainList },
          { key: 'interested', label: 'Interested List', icon: icons.interested, color: 'text-green-600', bg: 'bg-green-50', list: todayLists.interestedList },
          { key: 'notInterested', label: 'Not Interested List', icon: icons.notInterested, color: 'text-gray-500', bg: 'bg-gray-50', list: todayLists.notInterestedList },
        ].map(({ key, label, icon, color, bg, list }) => (
          <div key={key} className={cardCls} style={cardStyle}>
            <button className="w-full flex items-center justify-between"
              onClick={() => setOpenSection(openSection === key ? null : key)}>
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-xl ${bg} ${color} flex items-center justify-center`}>{icon}</span>
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${color}`}>{list.length}</span>
              </div>
              <span className="text-gray-400 text-sm">{openSection === key ? '▲' : '▼'}</span>
            </button>
            {openSection === key && (
              <div className="mt-4 divide-y divide-gray-50 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {list.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No records for today</p>
                ) : list.map((item, i) => (
                  <div key={item._id} className="py-3 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center text-[10px] font-bold ${color} shrink-0`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.title || item.lead?.name || '—'}</p>
                      <div className="flex gap-3 mt-0.5">
                        {item.lead?.phone && <span className="text-[10px] text-gray-400 flex items-center gap-1">{icons.phone}{item.lead.phone}</span>}
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

      {/* Today's Verification Tasks List */}
      <div className={cardCls} style={cardStyle}>
        <button className="w-full flex items-center justify-between"
          onClick={() => setOpenSection(openSection === 'verifications' ? null : 'verifications')}>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center`}>{icons.verification}</span>
            <span className="text-sm font-semibold text-gray-700">Verification Tasks</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{verifications.length}</span>
          </div>
          <span className="text-gray-400 text-sm">{openSection === 'verifications' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'verifications' && (
          <div className="mt-4 divide-y divide-gray-50">
            {verifications.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No tasks for today</p>
            ) : verifications.map((v, i) => (
              <div key={v._id} className="py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px] shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-xs">{v.title}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      v.status === 'verified' ? 'bg-green-100 text-green-700' :
                      v.status === 'on_hold' ? 'bg-gray-100 text-gray-600' :
                      v.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>{v.status?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {v.lead?.name && <p className="text-[10px] text-gray-600 flex items-center gap-1">{icons.user}{v.lead.name}</p>}
                    {v.lead?.phone && <p className="text-[10px] text-gray-500 flex items-center gap-1">{icons.phone}{v.lead.phone}</p>}
                    {v.cityVillage && <p className="text-[10px] text-gray-400 flex items-center gap-1">{icons.location}{v.cityVillage}</p>}
                    {v.price && <p className="text-[10px] text-green-600 font-bold">₹{v.price}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
