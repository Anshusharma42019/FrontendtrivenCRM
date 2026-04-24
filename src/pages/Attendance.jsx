import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as svc from '../services/attendance.service';
import { fetchAllStaffCommissions } from '../services/dashboard.service';
import { getUsers } from '../services/user.service';
import Modal from '../components/ui/Modal';

const STATUS_COLORS = {
  present: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Present' },
  absent: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Absent' },
  half_day: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a', label: 'Half Day' },
  late: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', label: 'Late' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getMonthDays(year, month) {
  const days = [];
  const firstDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= total; i++) days.push(i);
  return days;
}

function toDateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

/* ─── Calendar Component ─── */
function AttendanceCalendar({ records, year, month, onChangeMonth }) {
  const days = getMonthDays(year, month);
  const map = {};
  records.forEach(r => { map[toDateKey(r.date)] = r; });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const counts = { present: 0, absent: 0, half_day: 0, late: 0 };
  records.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
        <button onClick={() => onChangeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-green-300 hover:bg-white/10 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="text-white font-semibold text-sm">{MONTHS[month]} {year}</span>
        <button onClick={() => onChangeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-green-300 hover:bg-white/10 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100">
        {Object.entries(STATUS_COLORS).map(([key, c]) => (
          <div key={key} className="text-center rounded-xl py-1.5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <p className="text-lg font-bold" style={{ color: c.text }}>{counts[key]}</p>
            <p className="text-[10px] text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-4 pt-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase pb-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {days.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const rec = map[key];
          const isToday = key === todayKey;
          const sc = rec ? STATUS_COLORS[rec.status] : null;
          return (
            <div key={i} className={`relative text-center py-1.5 rounded-xl text-xs font-medium transition ${isToday ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
              style={sc ? { background: sc.bg, color: sc.text } : { color: '#9ca3af' }}
              title={rec ? `${sc?.label} | In: ${formatTime(rec.checkIn)} | Out: ${formatTime(rec.checkOut)}` : ''}>
              {day}
              {rec && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: sc?.text }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Staff View ─── */
function StaffAttendance() {
  const [todayRec, setTodayRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const load = useCallback(async () => {
    try {
      const [status, hist] = await Promise.all([
        svc.getTodayStatus(),
        svc.getMyAttendance({ startDate: new Date(year, month, 1).toISOString(), endDate: new Date(year, month + 1, 0, 23, 59, 59).toISOString() }),
      ]);
      setTodayRec(status);
      setRecords(hist?.results || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    setActionLoading(true); setError('');
    try { await svc.checkIn({ notes }); setNotes(''); load(); }
    catch (e) { setError(e.response?.data?.message || 'Check-in failed'); }
    setActionLoading(false);
  };

  const handleCheckOut = async () => {
    setActionLoading(true); setError('');
    try { await svc.checkOut({ notes }); setNotes(''); load(); }
    catch (e) { setError(e.response?.data?.message || 'Check-out failed'); }
    setActionLoading(false);
  };

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const checkedIn = !!todayRec?.checkIn;
  const checkedOut = !!todayRec?.checkOut;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading attendance...
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Clock Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
          <div className="flex items-center gap-3 mb-1">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h2 className="text-white font-bold text-lg">Today's Attendance</h2>
          </div>
          <p className="text-green-300/60 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="p-6">
          {/* Status pills */}
          <div className="flex gap-4 mb-5">
            <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: checkedIn ? '#f0fdf4' : '#f9fafb', border: `1px solid ${checkedIn ? '#bbf7d0' : '#e5e7eb'}` }}>
              <p className={`text-xl font-bold ${checkedIn ? 'text-green-600' : 'text-gray-300'}`}>{checkedIn ? formatTime(todayRec.checkIn) : '—:—'}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Check In</p>
            </div>
            <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: checkedOut ? '#f0fdf4' : '#f9fafb', border: `1px solid ${checkedOut ? '#bbf7d0' : '#e5e7eb'}` }}>
              <p className={`text-xl font-bold ${checkedOut ? 'text-green-600' : 'text-gray-300'}`}>{checkedOut ? formatTime(todayRec.checkOut) : '—:—'}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Check Out</p>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

          {!checkedOut && (
            <div className="space-y-3">
              <input type="text" placeholder="Add a note (optional)" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition" />
              {!checkedIn ? (
                <button onClick={handleCheckIn} disabled={actionLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {actionLoading ? 'Checking In...' : <><svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Clock In</>}
                </button>
              ) : (
                <button onClick={handleCheckOut} disabled={actionLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  {actionLoading ? 'Checking Out...' : <><svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Clock Out</>}
                </button>
              )}
            </div>
          )}

          {checkedIn && checkedOut && (
            <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-green-50 border border-green-100">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span className="text-sm font-semibold text-green-700">Attendance complete for today!</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <AttendanceCalendar records={records} year={year} month={month} onChangeMonth={changeMonth} />
    </div>
  );
}

/* ─── Admin View ─── */
function AdminAttendance() {
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRecords, setUserRecords] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [commData, setCommData] = useState(null);
  const [commMonth, setCommMonth] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const [commLoading, setCommLoading] = useState(false);
  const [showCommission, setShowCommission] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const [uRes, aRes] = await Promise.all([
        getUsers(),
        svc.getAllAttendance({ startDate: todayStart.toISOString(), endDate: todayEnd.toISOString(), limit: 200 }),
      ]);
      setUsers(uRes?.results || []);
      setRecords(aRes?.results || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load commission data
  useEffect(() => {
    let cancelled = false;
    setCommLoading(true);
    fetchAllStaffCommissions(commMonth.month, commMonth.year)
      .then(d => { if (!cancelled) setCommData(d); })
      .catch(e => console.error('Commission fetch failed:', e.message))
      .finally(() => { if (!cancelled) setCommLoading(false); });
    return () => { cancelled = true; };
  }, [commMonth]);

  const openUser = async (u) => {
    setSelectedUser(u); setModalLoading(true);
    try {
      const res = await svc.getAllAttendance({
        userId: u._id,
        startDate: new Date(year, month, 1).toISOString(),
        endDate: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
        limit: 50,
      });
      setUserRecords(res?.results || []);
    } catch { setUserRecords([]); }
    setModalLoading(false);
  };

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  // Reload user modal data when month changes
  useEffect(() => { if (selectedUser) openUser(selectedUser); }, [year, month]);

  const getAttendanceForUser = (uid) => records.find(r => (r.user?._id || r.user) === uid);

  const ROLE_GRADIENT = { admin: 'from-purple-500 to-violet-600', manager: 'from-blue-500 to-cyan-500', sales: 'from-green-500 to-emerald-500' };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading attendance...
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Staff Attendance</h2>
        <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Staff', val: users.length, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Present', val: records.filter(r => r.checkIn).length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Checked Out', val: records.filter(r => r.checkOut).length, color: '#ea580c', bg: '#fff7ed' },
          { label: 'Absent', val: users.length - records.filter(r => r.checkIn).length, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Salary Sheet */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
        <button className="w-full flex items-center justify-between px-5 py-4" onClick={() => setShowCommission(!showCommission)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b98122, #05966922)' }}>
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-700">Monthly Salary Sheet</h3>
              <p className="text-xs text-gray-400">Attendance-based Base Pay + 5% Commission</p>
            </div>
          </div>
          <span className="text-gray-400 text-sm">{showCommission ? '▲' : '▼'}</span>
        </button>

        {showCommission && (
          <div className="px-5 pb-5">
            {/* Month navigation */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <button onClick={() => setCommMonth(p => {
                const m = p.month - 1;
                return m < 0 ? { month: 11, year: p.year - 1 } : { month: m, year: p.year };
              })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                {new Date(commMonth.year, commMonth.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setCommMonth(p => {
                const m = p.month + 1;
                return m > 11 ? { month: 0, year: p.year + 1 } : { month: m, year: p.year };
              })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {commLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : commData ? (
              <>
                {/* Grand totals */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="rounded-2xl p-4 text-center" style={{ background: '#eff6ff', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <p className="text-xl font-bold text-blue-600">{commData.grandTotalDeliveries}</p>
                    <p className="text-[10px] text-blue-700 font-semibold mt-1">Deliveries</p>
                  </div>
                  <div className="rounded-2xl p-4 text-center" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.1)' }}>
                    <p className="text-xl font-bold text-green-600">₹{(commData.grandTotalRevenue || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-green-700 font-semibold mt-1">Total Revenue</p>
                  </div>
                  <div className="rounded-2xl p-4 text-center" style={{ background: '#fffbeb', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <p className="text-xl font-bold text-amber-600">₹{(commData.grandTotalCommission || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-amber-700 font-semibold mt-1">Total Comm.</p>
                  </div>
                  <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)', border: 'none' }}>
                    <p className="text-xl font-bold text-green-400">₹{(commData.grandTotalPay || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-green-300/60 font-semibold mt-1">Total Payout</p>
                  </div>
                </div>

                {/* Per-staff table */}
                {commData.staff?.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-[11px] sm:text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500">
                          <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider">Staff</th>
                          <th className="text-center py-3 px-2 font-semibold uppercase tracking-wider">Attendance</th>
                          <th className="text-center py-3 px-2 font-semibold uppercase tracking-wider">Verified</th>
                          <th className="text-right py-3 px-2 font-semibold uppercase tracking-wider">Base Pay</th>
                          <th className="text-right py-3 px-2 font-semibold uppercase tracking-wider">Comm.</th>
                          <th className="text-right py-3 px-4 font-semibold uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {commData.staff.map(s => (
                          <tr key={s.user._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${ROLE_GRADIENT[s.user.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-[10px] font-bold uppercase`}>
                                  {s.user.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{s.user.name}</p>
                                  <p className="text-[9px] text-gray-400">₹{s.user.baseSalary?.toLocaleString()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2">
                              <div className="flex items-center justify-center gap-1">
                                <span title="Present" className="text-green-600 font-bold">{s.attendance.present + s.attendance.late}</span>
                                <span className="text-gray-300">/</span>
                                <span title="Half Day" className="text-amber-500 font-bold">{s.attendance.half_day}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2">
                              <p className="font-bold text-blue-600">{s.verifications.verified}</p>
                              <p className="text-[9px] text-gray-400">{s.verifications.assigned} assigned</p>
                            </td>
                            <td className="text-right py-3 px-2 text-gray-600">
                              ₹{(s.basePay || 0).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-2">
                              <p className="font-bold text-amber-600">₹{s.totalCommission?.toLocaleString()}</p>
                              <p className="text-[9px] text-green-500">{s.totalDeliveries} del.</p>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="text-sm font-bold text-gray-900">₹{(s.totalPay || 0).toLocaleString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {commData.staff?.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No staff data available</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Unable to load salary data</p>
            )}
          </div>
        )}
      </div>

      {/* Staff cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {users.map(u => {
          const att = getAttendanceForUser(u._id);
          const statusInfo = att?.checkIn
            ? att.checkOut
              ? { label: 'Done', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
              : { label: 'Working', bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' }
            : { label: 'Absent', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
          return (
            <div key={u._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden cursor-pointer"
              style={{ border: '1px solid rgba(0,0,0,0.05)' }} onClick={() => openUser(u)}>
              <div className={`h-1.5 bg-gradient-to-r ${ROLE_GRADIENT[u.role] || 'from-gray-300 to-gray-400'}`} />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[u.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-sm font-bold uppercase`}>
                    {u.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.role}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.text, border: `1px solid ${statusInfo.border}` }}>
                    {statusInfo.label}
                  </span>
                </div>
                {att?.checkIn && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                    <span>In: <strong className="text-gray-700">{formatTime(att.checkIn)}</strong></span>
                    <span>Out: <strong className="text-gray-700">{formatTime(att.checkOut)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <Modal title={`${selectedUser.name}'s Attendance`} onClose={() => setSelectedUser(null)}>
          {modalLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AttendanceCalendar records={userRecords} year={year} month={month} onChangeMonth={changeMonth} />
          )}
        </Modal>
      )}
    </div>
  );
}

/* ─── Main Export ─── */
export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  return isAdmin ? <AdminAttendance /> : <StaffAttendance />;
}
