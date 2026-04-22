import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStaffStats, saveStaffTarget, fetchStaffVerifications, fetchStaffTodayLists, fetchStaffMonthlyChart } from '../services/dashboard.service';

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

  const load = useCallback(async () => {
    const [data, vData, lists, chart] = await Promise.allSettled([
      fetchStaffStats(), fetchStaffVerifications(), fetchStaffTodayLists(), fetchStaffMonthlyChart()
    ]);
    if (data.status === 'fulfilled') setStats(data.value);
    else console.error('fetchStaffStats failed:', data.reason?.response?.status, data.reason?.message);
    if (vData.status === 'fulfilled') setVerifications(Array.isArray(vData.value) ? vData.value : []);
    else console.error('fetchStaffVerifications failed:', vData.reason?.response?.status, vData.reason?.message);
    if (lists.status === 'fulfilled') setTodayLists(lists.value || { cnpList: [], callAgainList: [], interestedList: [], notInterestedList: [] });
    else console.error('fetchStaffTodayLists failed:', lists.reason?.response?.status, lists.reason?.message);
    if (chart.status === 'fulfilled') setMonthlyChart(Array.isArray(chart.value) ? chart.value : []);
    else console.error('fetchStaffMonthlyChart failed:', chart.reason?.response?.status, chart.reason?.message);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">My Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back, {user?.name}! · {today}</p>
        </div>
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
