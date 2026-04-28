import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Modal from '../components/ui/Modal';

const PER_PAGE = 20;
const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";
const ordinal = n => ['1st', '2nd', '3rd', '4th', '5th'][n] || `${n + 1}th`;

const PIN_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const DetailRow = ({ label, value }) =>
  value ? (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium capitalize flex-1">{value}</span>
    </div>
  ) : null;

const SectionHead = ({ label }) => (
  <div className="flex items-center gap-2 mt-4 mb-1">
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">{label}</span>
    <div className="flex-1 h-px bg-emerald-100" />
  </div>
);

export default function FollowUp() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filterDelivered, setFilterDelivered] = useState('');
  const [filterFollowupNum, setFilterFollowupNum] = useState('');
  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [completedMap, setCompletedMap] = useState({});
  const [doneLoading, setDoneLoading] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/shiprocket/orders/with-followups');
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setAll(data);
      return data.length;
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      return 0;
    } finally { setLoading(false); }
  }, []);

  const syncAndLoad = async () => {
    setSyncing(true); setError('');
    try { await api.post('/shiprocket/orders/sync'); } catch { }
    finally { setSyncing(false); }
    await load();
  };

  useEffect(() => {
    load().then(count => { if (count === 0) syncAndLoad(); });
  }, [load]);

  const handleFollowUpDone = async (orderId) => {
    const oid = String(orderId);
    setDoneLoading(oid);
    try {
      const res = await api.post(`/shiprocket/orders/${oid}/complete-followup`);
      const { completedCount, next_follow_up } = res.data.data;
      setCompletedMap(prev => ({ ...prev, [oid]: completedCount }));
      setAll(prev => prev.map(o => {
        if (String(o._id) !== oid) return o;
        const updatedFUs = (o.followups || []).map(f =>
          f.followup_number === completedCount ? { ...f, completed: true } : f
        );
        return { ...o, next_follow_up, followups: updatedFUs };
      }));
      if (selected?._id === orderId) {
          const updatedSelected = { ...selected, next_follow_up };
          updatedSelected.followups = (selected.followups || []).map(f =>
              f.followup_number === completedCount ? { ...f, completed: true } : f
          );
          setSelected(updatedSelected);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally { setDoneLoading(null); }
  };

  const saveNote = async () => {
    if (!selected) return;
    setNoteSaving(true);
    try {
      await api.patch(`/shiprocket/orders/${selected._id}/notes`, { notes: noteText });
      setAll(prev => prev.map(o => String(o._id) === String(selected._id) ? { ...o, notes: noteText } : o));
      setSelected(prev => ({ ...prev, notes: noteText }));
    } finally { setNoteSaving(false); }
  };

  const filtered = all.filter(o => {
    if (filterDelivered && o.delivered_at) {
      const d = new Date(o.delivered_at).toISOString().split('T')[0];
      if (d !== filterDelivered) return false;
    }
    if (filterFollowupNum) {
      const num = Number(filterFollowupNum);
      const completed = (o.followups || []).filter(f => f.completed).length;
      if (completed !== num - 1) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        o.billing_customer_name?.toLowerCase().includes(q) ||
        o.billing_phone?.includes(q) ||
        o.billing_city?.toLowerCase().includes(q) ||
        o.order_id?.toString().includes(q) ||
        o.awb_code?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSelect = (order) => {
    if (selected?._id === order._id) {
      setSelected(null);
    } else {
      setSelected(order);
      setNoteText(order.notes || '');
    }
  };

  return (
    <div className="flex gap-4 scroll-container-h overflow-hidden animate-slide-up mobile-p-safe">
      {/* ── LEFT PANEL ── */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selected ? 'w-full lg:w-[55%]' : 'w-full'} h-full overflow-hidden`}>
        
        {/* Header & Filters (Fixed) */}
        <div className="flex flex-col gap-5 shrink-0 glass p-5 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Follow Up</h2>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Manage delivered orders • {all.length} total</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={syncAndLoad} disabled={syncing || loading}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.1} viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              <button onClick={load} disabled={loading}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #374151, #1f2937)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.1} viewBox="0 0 24 24"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                {loading ? 'Refilling...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[140px] flex items-center bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-3">Date</span>
                <input type="date" value={filterDelivered} onChange={e => { setFilterDelivered(e.target.value); setPage(1); }} 
                  className="text-xs font-bold text-gray-700 bg-transparent outline-none flex-1" />
              </div>
              <div className="flex-1 min-w-[120px] flex items-center bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-3">Call</span>
                <select value={filterFollowupNum} onChange={e => { setFilterFollowupNum(e.target.value); setPage(1); }} 
                  className="text-xs font-bold text-gray-700 bg-transparent outline-none flex-1">
                  <option value="">All Calls</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{ordinal(n-1)}</option>)}
                </select>
              </div>
              {(filterDelivered || filterFollowupNum) && (
                <button onClick={() => { setFilterDelivered(''); setFilterFollowupNum(''); setPage(1); }}
                  className="px-4 py-2 rounded-xl text-[10px] font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 transition shadow-sm">RESET</button>
              )}
            </div>

            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search customer, phone, AWB..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-100 bg-white text-sm font-medium text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition shadow-sm"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
                {filtered.length} found
              </div>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-xs font-medium shrink-0">{error}</div>}

        {/* List (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loading && all.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 text-emerald-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No follow-ups found</p>
              <p className="text-gray-400 text-xs mt-1">{search ? 'Try a different search' : 'Nothing here yet'}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {paged.map((o, i) => {
                const color = PIN_COLORS[i % PIN_COLORS.length];
                const isActive = selected?._id === o._id;
                const allFUs = (o.followups || []).sort((a, b) => a.followup_number - b.followup_number);
                const completedCount = completedMap[o._id] ?? allFUs.filter(f => f.completed).length;
                const allDone = completedCount >= 5;
                const activeFU = allFUs[completedCount];

                return (
                  <div
                    key={o._id}
                    onClick={() => handleSelect(o)}
                    className={`relative flex flex-col gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 border
                      ${isActive
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-sm'}`}>

                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${color}`} />
                    
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] font-bold text-gray-300 w-5 text-center shrink-0 ml-2">{((page - 1) * PER_PAGE) + i + 1}</span>

                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
                        {initials(o.billing_customer_name)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{o.billing_customer_name || '—'}</p>
                          {allDone ? (
                             <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 uppercase">Done</span>
                          ) : (
                             <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 uppercase">{ordinal(completedCount)} Due</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500">{o.billing_city}</span>
                          <span className="text-xs text-gray-400">₹{o.sub_total}</span>
                          <span className="text-[10px] text-gray-400 border-l border-gray-200 pl-2">Delivered: {new Date(o.shiprocket_delivered_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Next Call</p>
                         <p className={`text-[10px] font-bold ${allDone ? 'text-gray-300' : 'text-orange-600'}`}>
                           {allDone ? 'Completed' : new Date(activeFU?.scheduled_date).toLocaleDateString()}
                         </p>
                      </div>

                      <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${isActive ? 'rotate-90 text-emerald-400' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 ml-11">
                      {Array.from({ length: 5 }, (_, idx) => {
                        const isDone = idx < completedCount;
                        const isCurrent = idx === completedCount && !allDone;
                        return (
                          <div key={idx} 
                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                              isDone ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' :
                              isCurrent ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' :
                              'bg-gray-50 text-gray-300 border-gray-100'
                            }`}>
                            {ordinal(idx)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination (Fixed at bottom of left panel) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 border-t border-gray-50 shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(totalPages, p + 1)); }} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT DETAIL PANEL ── */}
      {selected && (
        <div className="hidden lg:flex flex-col w-[45%] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
          <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg,#10b981,#059669,#10b981)' }} />
          
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${PIN_COLORS[filtered.findIndex(r => r._id === selected._id) % PIN_COLORS.length]}`}>
                {initials(selected.billing_customer_name)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-tight">{selected.billing_customer_name || 'Order Detail'}</p>
                <p className="text-xs text-gray-400">{selected.billing_phone}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-lg">×</button>
          </div>

          <div className="px-5 py-3 overflow-y-auto flex-1 custom-scrollbar">
            <SectionHead label="Customer & Order" />
            <DetailRow label="Order ID" value={selected.order_id || selected.shiprocket_order_id} />
            <DetailRow label="AWB Code" value={selected.awb_code} />
            <DetailRow label="Courier" value={selected.courier_name} />
            <DetailRow label="Payment" value={selected.payment_method} />
            <DetailRow label="Amount" value={`₹${selected.sub_total}`} />
            
            <SectionHead label="Address" />
            <DetailRow label="City" value={selected.billing_city} />
            <DetailRow label="State" value={selected.billing_state} />
            <DetailRow label="Pincode" value={selected.billing_pincode} />
            <DetailRow label="Address" value={selected.billing_address} />

            <SectionHead label="Products" />
            {(selected.order_items || []).map((p, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 font-medium">{p.name}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">×{p.units || 1}</span>
              </div>
            ))}

            <SectionHead label="Notes" />
            <div className="mt-2">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add customer feedback or follow-up notes..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50 resize-none transition"
              />
              <button onClick={saveNote} disabled={noteSaving}
                className="mt-2 w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {noteSaving ? 'Saving...' : 'Save Note'}
              </button>
            </div>

            <SectionHead label="Follow-up Timeline" />
            <div className="space-y-3 mt-3 pb-4">
              {(selected.followups || []).sort((a, b) => a.followup_number - b.followup_number).map((fu, i) => {
                const isCurrent = !fu.completed && (i === 0 || selected.followups[i-1]?.completed);
                return (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border ${fu.completed ? 'bg-gray-50 border-gray-100 opacity-60' : isCurrent ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${fu.completed ? 'bg-gray-200 text-gray-500' : 'bg-emerald-600 text-white'}`}>
                      {fu.followup_number}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${fu.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{ordinal(i)} Follow-up</p>
                      <p className="text-[10px] text-gray-400">{new Date(fu.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    {fu.completed ? (
                      <span className="text-[10px] font-bold text-emerald-600">DONE</span>
                    ) : isCurrent ? (
                      <button 
                        onClick={() => handleFollowUpDone(selected._id)}
                        disabled={doneLoading === String(selected._id)}
                        className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                        {doneLoading === String(selected._id) ? '...' : 'MARK DONE'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
                {/* Detail Modal (Mobile) */}
      {selected && (
        <div className="lg:hidden">
          <Modal hideHeader={true} onClose={() => setSelected(null)}>
            <div className="-mx-4 -mt-4 mb-5 px-6 py-6 rounded-b-3xl relative" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
              <button onClick={() => setSelected(null)}
                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-all text-xl">
                ×
              </button>
              <div className="flex items-center gap-4 pr-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-xl ${PIN_COLORS[filtered.findIndex(r => r._id === selected._id) % PIN_COLORS.length]}`}>
                  {initials(selected.billing_customer_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg tracking-tight truncate">{selected.billing_customer_name}</h3>
                  <p className="text-emerald-300/70 text-sm font-medium">{selected.billing_phone}</p>
                </div>
              </div>
            </div>

            <div className="space-y-0 px-2">
              <SectionHead label="Order Details" />
              <DetailRow label="Phone" value={selected.billing_phone} />
              <DetailRow label="AWB" value={selected.awb_code} />
              <DetailRow label="City" value={selected.billing_city} />
              <DetailRow label="Amount" value={`₹${selected.sub_total}`} />
              
              <SectionHead label="Feedback Notes" />
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Type customer notes here..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 mb-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
              <button onClick={saveNote} className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {noteSaving ? 'Saving...' : 'Save Notes'}
              </button>

              <SectionHead label="Follow-up Progress" />
              <div className="space-y-2.5 mt-3 pb-4">
                {(selected.followups || []).sort((a,b) => a.followup_number - b.followup_number).map((fu, i) => {
                  const isCurrent = !fu.completed && (i === 0 || selected.followups[i-1]?.completed);
                  return (
                    <div key={i} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${fu.completed ? 'bg-gray-50 border-gray-100 opacity-60' : isCurrent ? 'bg-emerald-50 border-emerald-100 shadow-sm' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${fu.completed ? 'bg-gray-200 text-gray-500' : 'bg-emerald-600 text-white shadow-sm'}`}>{fu.followup_number}</div>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${fu.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{ordinal(i)} Call</span>
                          <span className="text-[10px] text-gray-400">{new Date(fu.scheduled_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isCurrent ? (
                        <button onClick={() => handleFollowUpDone(selected._id)} className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-xl shadow-sm active:scale-95 transition-all">MARK DONE</button>
                      ) : fu.completed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-bold text-[10px]">✓</span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </Modal>
        </div>
      )}
      </div>
        </div>
      )}
    </div>
  );
}
