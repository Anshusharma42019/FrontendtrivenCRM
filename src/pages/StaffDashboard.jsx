import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStaffStats, saveStaffTarget, fetchStaffVerifications, fetchStaffTodayLists, fetchStaffMonthlyChart, fetchStaffCommission } from '../services/dashboard.service';
import * as attendanceSvc from '../services/attendance.service';

const card = 'bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow';
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
  const [stats, setStats] = useState({ todayVerifications: 0, monthVerifications: 0, pendingTasks: 0, todayTarget: 0 });
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

  const load = useCallback(async () => {
    const [data, vData, lists, chart, att] = await Promise.allSettled([
      fetchStaffStats(), fetchStaffVerifications(), fetchStaffTodayLists(), fetchStaffMonthlyChart(), attendanceSvc.getTodayStatus()
    ]);
    if (data.status === 'fulfilled') setStats(data.value);
    else console.error('fetchStaffStats failed:', data.reason?.response?.status, data.reason?.message);
    if (vData.status === 'fulfilled') setVerifications(Array.isArray(vData.value) ? vData.value : []);
    else console.error('fetchStaffVerifications failed:', vData.reason?.response?.status, vData.reason?.message);
    if (lists.status === 'fulfilled') setTodayLists(lists.value || { cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [] });
    else console.error('fetchStaffTodayLists failed:', lists.reason?.response?.status, lists.reason?.message);
    if (chart.status === 'fulfilled') setMonthlyChart(Array.isArray(chart.value) ? chart.value : []);
    else console.error('fetchStaffMonthlyChart failed:', chart.reason?.response?.status, chart.reason?.message);
    if (att.status === 'fulfilled') setAttStatus(att.value);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Load commission data
  useEffect(() => {
    let cancelled = false;
    setCommLoading(true);
    fetchStaffCommission(commMonth.month, commMonth.year)
      .then(d => { if (!cancelled) setCommission(d); })
      .catch(e => console.error('Commission fetch failed:', e.message))
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
      const msg = err?.response?.data?.message || err?.response?.statusText || err.message || 'Unknown error';
      const status = err?.response?.status || 'no status';
      console.error('Save target error:', status, msg, err?.response?.data);
      alert(`Save failed (${status}): ${msg}`);
    } finally { setSaving(false); }
  };

  const done = stats.todayVerifications || 0;
  const target = stats.todayTarget || 0;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">My Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back, {user?.name}! · {today}</p>
        </div>
      </div>

      {/* Attendance Quick Card */}
      <div className={card} style={{ ...cardStyle, background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)', border: 'none' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Attendance</p>
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

      {/* Earnings Card */}
      <div className={card} style={{ ...cardStyle, overflow: 'hidden' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b98122, #05966922)' }}>
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700">My Earnings</h3>
              <p className="text-xs text-gray-400">Fixed Salary + 5% Commission</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCommMonth(p => {
              const m = p.month - 1;
              return m < 0 ? { month: 11, year: p.year - 1 } : { month: m, year: p.year };
            })} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-xs font-semibold text-gray-600 min-w-[90px] text-center">
              {new Date(commMonth.year, commMonth.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => setCommMonth(p => {
              const m = p.month + 1;
              return m > 11 ? { month: 0, year: p.year + 1 } : { month: m, year: p.year };
            })} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        {commLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : commission ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl p-4 text-center" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.1)' }}>
                <p className="text-xl font-bold text-green-600">₹{(commission.basePay || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-green-700 font-semibold mt-1">Base Pay</p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: '#fffbeb', border: '1px solid rgba(245,158,11,0.1)' }}>
                <p className="text-xl font-bold text-amber-600">₹{(commission.totalCommission || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-amber-700 font-semibold mt-1">Commission</p>
              </div>
              <div className="rounded-2xl p-4 text-center bg-gray-900 shadow-inner">
                <p className="text-xl font-bold text-white">₹{(commission.totalPay || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-wider">Total Salary</p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: '#eff6ff', border: '1px solid rgba(59,130,246,0.1)' }}>
                <p className="text-xl font-bold text-blue-600">{commission.verifications?.verified || 0}</p>
                <p className="text-[10px] text-blue-700 font-semibold mt-1">Verified Tasks</p>
              </div>
            </div>

            {/* Attendance & Verification Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-500">Attendance ({commission.attendance?.present + commission.attendance?.late} Present, {commission.attendance?.half_day} Half Day)</span>
                  <span className="text-gray-900">{Math.round(((commission.attendance?.present + commission.attendance?.late + (commission.attendance?.half_day * 0.5)) / new Date(commMonth.year, commMonth.month + 1, 0).getDate()) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, ((commission.attendance?.present + commission.attendance?.late + (commission.attendance?.half_day * 0.5)) / 30) * 100)}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-500">Verification Rate ({commission.verifications?.verified} / {commission.verifications?.assigned})</span>
                  <span className="text-gray-900">{commission.verifications?.assigned ? Math.round((commission.verifications?.verified / commission.verifications?.assigned) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${commission.verifications?.assigned ? (commission.verifications?.verified / commission.verifications?.assigned) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Daily breakdown */}
            {commission.dailyBreakdown?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <button className="w-full flex items-center justify-between mb-2" onClick={() => setOpenSection(openSection === 'commBreakdown' ? null : 'commBreakdown')}>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission Breakdown</span>
                  <span className="text-gray-400 text-xs">{openSection === 'commBreakdown' ? '▲' : '▼'}</span>
                </button>
                {openSection === 'commBreakdown' && (
                  <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {commission.dailyBreakdown.map(d => (
                      <div key={d.date} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-[10px] font-bold">
                            {new Date(d.date + 'T00:00:00').getDate()}
                          </span>
                          <div>
                            <span className="text-gray-800 text-xs font-medium">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <p className="text-[10px] text-gray-400">{d.deliveries} deliveries</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600">+ ₹{Math.round(d.commission).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] text-gray-400">₹{Math.round(d.revenue).toLocaleString('en-IN')} rev.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {commission.totalDeliveries === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No commissions earned this month</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Unable to load earnings data</p>
        )}
      </div>

      {/* Target setter */}
      <div className={card} style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Today's Target</h3>
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
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 text-center" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.15)' }}>
                <p className="text-3xl font-bold text-green-600">{done}</p>
                <p className="text-xs text-green-700 font-semibold mt-1">Done</p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: achieved ? '#f0fdf4' : '#fff7ed', border: `1px solid ${achieved ? 'rgba(22,163,74,0.15)' : 'rgba(251,146,60,0.25)'}` }}>
                <p className={`text-3xl font-bold ${achieved ? 'text-green-600' : 'text-orange-500'}`}>
                  {achieved ? 'Done!' : remaining}
                </p>
                <p className={`text-xs font-semibold mt-1 ${achieved ? 'text-green-700' : 'text-orange-600'}`}>
                  {achieved ? 'Achieved!' : 'Remaining'}
                </p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: '#eff6ff', border: '1px solid rgba(59,130,246,0.15)' }}>
                <p className="text-3xl font-bold text-blue-600">{target}</p>
                <p className="text-xs text-blue-700 font-semibold mt-1">Target</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Activity Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "CNP", value: stats.todayCnp ?? 0, icon: icons.cnp, bg: "bg-red-50", text: "text-red-500" },
          { label: "Call Again", value: stats.todayCallAgain ?? 0, icon: icons.callAgain, bg: "bg-yellow-50", text: "text-yellow-600" },
          { label: "Interested", value: stats.todayInterested ?? 0, icon: icons.interested, bg: "bg-green-50", text: "text-green-600" },
          { label: "Not Interested", value: stats.todayNotInterested ?? 0, icon: icons.notInterested, bg: "bg-gray-50", text: "text-gray-500" },
        ].map(({ label, value, icon, bg, text }) => (
          <div key={label} className={`${card} flex flex-col items-center justify-center text-center gap-2 py-6`} style={cardStyle}>
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
              <span className={text}>{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Today's Activity Lists */}
      {[
        { key: 'cnp', label: 'CNP', icon: icons.cnp, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', list: todayLists.cnpList },
        { key: 'callAgain', label: 'Call Again', icon: icons.callAgain, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', list: todayLists.callAgainList },
        { key: 'interested', label: 'Interested', icon: icons.interested, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', list: todayLists.interestedList },
        { key: 'notInterested', label: 'Not Interested', icon: icons.notInterested, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', list: todayLists.notInterestedList },
      ].map(({ key, label, icon, color, bg, border, list }) => (
        <div key={key} className={card} style={cardStyle}>
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
            <div className="mt-4 divide-y divide-gray-50">
              {list.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No records for today</p>
              ) : list.map((item, i) => (
                <div key={item._id} className="py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center text-xs font-bold ${color} shrink-0`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title || item.lead?.name || '—'}</p>
                    <div className="flex gap-3 mt-0.5">
                      {item.lead?.name && <span className="text-xs text-gray-500 flex items-center gap-1">{icons.user}{item.lead.name}</span>}
                      {item.lead?.phone && <span className="text-xs text-gray-500 flex items-center gap-1">{icons.phone}{item.lead.phone}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Monthly Overview Bar Chart */}
      <div className={card} style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Monthly Overview</h3>
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        </div>
        {monthlyChart.length === 0 || monthlyChart.every(d => d.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-6">No verification data this month</p>
        ) : (() => {
          const maxVal = Math.max(...monthlyChart.map(d => d.count), 1);
          const IST_OFFSET = 5.5 * 60 * 60 * 1000;
          const today = new Date(Date.now() + IST_OFFSET).getUTCDate();
          const W = 800, H = 120, PAD = 10;
          const pts = monthlyChart.map((d, i) => ({
            x: PAD + (i / (monthlyChart.length - 1)) * (W - PAD * 2),
            y: H - PAD - ((d.count / maxVal) * (H - PAD * 2)),
            ...d,
          }));
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const areaPath = `${linePath} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
          return (
            <div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map(f => (
                  <line key={f} x1={PAD} y1={H - PAD - f * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - f * (H - PAD * 2)}
                    stroke="#f0f0f0" strokeWidth="1" />
                ))}
                {/* Area fill */}
                <path d={areaPath} fill="url(#areaGrad)" />
                {/* Line */}
                <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Data points */}
                {pts.map((p) => p.count > 0 && (
                  <g key={p.day}>
                    <circle cx={p.x} cy={p.y} r={p.day === today ? 5 : 3}
                      fill={p.day === today ? '#16a34a' : '#4ade80'}
                      stroke="white" strokeWidth="1.5" />
                  </g>
                ))}
                {/* Today vertical line */}
                {pts[today - 1] && (
                  <line x1={pts[today-1].x} y1={PAD} x2={pts[today-1].x} y2={H - PAD}
                    stroke="#16a34a" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                )}
              </svg>
              {/* X-axis */}
              <div className="flex w-full">
                {monthlyChart.map(({ day }) => (
                  <div key={day} className="flex-1 text-center">
                    {(day === 1 || day % 5 === 0) && (
                      <span className={`text-[9px] ${day === today ? 'text-green-600 font-bold' : 'text-gray-400'}`}>{day}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Today</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-300 inline-block" /> Done</span>
                <span className="ml-auto font-semibold text-gray-700">Total: {stats.monthVerifications}</span>
              </div>
            </div>
          );
        })()}
      </div>
      {/* Today's Verification List */}
      <div className={card} style={cardStyle}>
        <button className="w-full flex items-center justify-between"
          onClick={() => setOpenSection(openSection === 'verifications' ? null : 'verifications')}>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center`}>{icons.verification}</span>
            <span className="text-sm font-semibold text-gray-700">Today's Verification Tasks</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{verifications.length}</span>
          </div>
          <span className="text-gray-400 text-sm">{openSection === 'verifications' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'verifications' && (
          <div className="mt-4">
            {verifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No verification tasks for today</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {verifications.map((v, i) => (
                  <div key={v._id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">{v.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          v.status === 'verified' ? 'bg-green-100 text-green-700' :
                          v.status === 'on_hold' ? 'bg-gray-100 text-gray-600' :
                          v.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>{v.status?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {v.lead?.name && <p className="text-xs text-gray-600 flex items-center gap-1">{icons.user}{v.lead.name}</p>}
                        {v.lead?.phone && <p className="text-xs text-gray-500 flex items-center gap-1">{icons.phone}{v.lead.phone}</p>}
                        {v.cityVillage && <p className="text-xs text-gray-500 flex items-center gap-1">{icons.location}{v.cityVillage}{v.district ? `, ${v.district}` : ''}</p>}
                        {v.price && <p className="text-xs text-green-600 font-semibold">₹{v.price}</p>}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 shrink-0">
                      {new Date(v.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
