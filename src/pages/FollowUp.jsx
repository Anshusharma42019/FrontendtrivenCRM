import { useState, useEffect } from 'react';
import api from '../api';

const PER_PAGE = 20;
const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white';
const ordinal = n => ['1st','2nd','3rd','4th','5th'][n] || `${n+1}th`;

export default function FollowUp() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filterDelivered, setFilterDelivered] = useState('');
  const [filterFollowupNum, setFilterFollowupNum] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [completedMap, setCompletedMap] = useState({});
  const [doneLoading, setDoneLoading] = useState(null);

  const load = async () => {
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
  };

  const syncAndLoad = async () => {
    setSyncing(true); setError('');
    try { await api.post('/shiprocket/orders/sync'); } catch { }
    finally { setSyncing(false); }
    await load();
  };

  useEffect(() => {
    load().then(count => { if (count === 0) syncAndLoad(); });
  }, []);

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
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally { setDoneLoading(null); }
  };

  const saveNote = async () => {
    if (!detailOrder) return;
    setNoteSaving(true);
    try {
      await api.patch(`/shiprocket/orders/${detailOrder._id}/notes`, { notes: noteText });
      setAll(prev => prev.map(o => String(o._id) === String(detailOrder._id) ? { ...o, notes: noteText } : o));
      setDetailOrder(prev => ({ ...prev, notes: noteText }));
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
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Follow Up</h2>
          <p className="text-xs text-gray-400 mt-0.5">All delivered orders — {all.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncAndLoad} disabled={syncing || loading}
            className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-xl hover:bg-emerald-700 font-semibold disabled:opacity-50 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {syncing ? 'Syncing…' : 'Sync & Refresh'}
          </button>
          <button onClick={load} disabled={loading}
            className="text-xs bg-gray-800 text-white px-3 py-2 rounded-xl hover:bg-gray-700 font-semibold disabled:opacity-50 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-4 shrink-0" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/></svg>
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Delivered Date</span>
          <input type="date" value={filterDelivered} onChange={e => { setFilterDelivered(e.target.value); setPage(1); }} className={inp} />
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Follow-up</span>
          <select value={filterFollowupNum} onChange={e => { setFilterFollowupNum(e.target.value); setPage(1); }} className={inp}>
            <option value="">All</option>
            <option value="1">1st Follow-up</option>
            <option value="2">2nd Follow-up</option>
            <option value="3">3rd Follow-up</option>
            <option value="4">4th Follow-up</option>
            <option value="5">5th Follow-up</option>
          </select>
        </div>
        {(filterDelivered || filterFollowupNum) && (
          <button onClick={() => { setFilterDelivered(''); setFilterFollowupNum(''); setPage(1); }}
            className="text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 font-semibold">✕ Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400 font-semibold">{filtered.length} results</span>
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-emerald-500" />
        {(loading || syncing) && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-12">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            {syncing ? 'Syncing from Shiprocket…' : 'Loading…'}
          </div>
        )}
        {!loading && !syncing && filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">No delivered orders found.</div>
        )}
        {!loading && !syncing && paged.length > 0 && (
          <>
            <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-gray-50">
              {paged.map(o => {
                const oid = String(o._id);
                const product = o.order_items?.[0];
                const allFUs = (o.followups || []).sort((a, b) => a.followup_number - b.followup_number);
                const completed = completedMap[oid] ?? allFUs.filter(f => f.completed).length;
                const activeIdx = completed;
                const activeFU = allFUs[activeIdx];
                const allDone = completed >= 5;
                const displayFUs = allFUs.length > 0 ? allFUs : Array.from({ length: 5 }, (_, i) => ({
                  followup_number: i + 1,
                  scheduled_date: new Date(o.delivered_at || o.createdAt || new Date()),
                  completed: false,
                }));
                return (
                  <div key={oid} className="px-5 py-4 hover:bg-orange-50/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white"
                        style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                        {(o.billing_customer_name || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm">{o.billing_customer_name || '—'}</p>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">DELIVERED</span>
                          {!allDone && activeFU && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
                              {ordinal(activeIdx)} Follow-up Due
                            </span>
                          )}
                          {allDone && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">✓ All Done</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-400">
                          <span>{o.billing_phone || '—'}</span>
                          <span>{o.billing_city || '—'}</span>
                          {product && <span>{product.name} ×{product.units || 1}</span>}
                          <span className="font-semibold text-gray-700">₹{o.sub_total || '—'}</span>
                          {o.awb_code && <span className="font-mono text-blue-500">{o.awb_code}</span>}
                          {o.delivered_at && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/></svg>
                              {new Date(o.delivered_at).toLocaleDateString('en-IN')}
                            </span>
                          )}
                          {!allDone && activeFU && (
                            <span className="text-orange-500 font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                              Next: {new Date(activeFU.scheduled_date).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {activeFU && !allDone && (
                          <p className="text-xs font-semibold text-orange-600">
                            {ordinal(activeIdx)}: {new Date(activeFU.scheduled_date).toLocaleDateString('en-IN')}
                          </p>
                        )}
                        {allFUs[activeIdx + 1] && !allDone && (
                          <p className="text-xs text-blue-500">
                            Next: {new Date(allFUs[activeIdx + 1].scheduled_date).toLocaleDateString('en-IN')}
                          </p>
                        )}
                        <button onClick={() => { setDetailOrder(o); setNoteText(o.notes || ''); }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white block"
                          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                          View Detail
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {displayFUs.map((fu, i) => {
                        const isDone = i < completed;
                        const isActive = i === activeIdx && !allDone;
                        return (
                          <button key={i} type="button"
                            onClick={e => { e.stopPropagation(); if (isActive && doneLoading !== oid) handleFollowUpDone(oid); }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${isDone ? 'bg-gray-100 text-gray-400 line-through' : isActive ? 'text-white' : 'bg-gray-50 text-gray-300 border border-gray-100'}`}
                            style={isActive ? { background: 'linear-gradient(135deg, #16a34a, #15803d)', cursor: 'pointer' } : { cursor: 'default' }}>
                            {isDone ? `✓ ${ordinal(i)}` : doneLoading === oid && isActive ? '…' : `${ordinal(i)} Follow-up`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between shrink-0">
                <span className="text-xs text-gray-400">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => p-1)} disabled={page===1} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">‹</button>
                  {Array.from({length: totalPages}, (_, i) => i+1)
                    .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=1)
                    .reduce((acc, p, i, arr) => { if (i>0 && p-arr[i-1]>1) acc.push('...'); acc.push(p); return acc; }, [])
                    .map((p, i) => p==='...' ? <span key={`e${i}`} className="px-2 text-xs text-gray-400">…</span> : (
                      <button key={p} onClick={() => setPage(p)}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${page===p ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{p}</button>
                    ))}
                  <button onClick={() => setPage(p => p+1)} disabled={page===totalPages} className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Order Detail</h3>
              <button onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-1 text-sm">
              {[
                ['Order ID', detailOrder.order_id || detailOrder.shiprocket_order_id],
                ['Customer', detailOrder.billing_customer_name],
                ['Phone', detailOrder.billing_phone],
                ['City', detailOrder.billing_city],
                ['State', detailOrder.billing_state],
                ['Pincode', detailOrder.billing_pincode],
                ['Address', detailOrder.billing_address],
                ['Amount', `₹${detailOrder.sub_total}`],
                ['Payment', detailOrder.payment_method],
                ['AWB', detailOrder.awb_code],
                ['Courier', detailOrder.courier_name],
                ['Status', detailOrder.status],
                ['Delivered', detailOrder.delivered_at ? new Date(detailOrder.delivered_at).toLocaleDateString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 py-2 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">{label}</p>
                  <p className="text-gray-800 font-medium">{value || '—'}</p>
                </div>
              ))}
              {(detailOrder.order_items || []).length > 0 && (
                <div className="py-2 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Products</p>
                  {detailOrder.order_items.map((p, i) => (
                    <p key={i} className="text-gray-800">{p.name} <span className="text-gray-400">×{p.units || 1}</span>{p.selling_price ? <span className="text-gray-500"> @ ₹{p.selling_price}</span> : ''}</p>
                  ))}
                </div>
              )}
              <div className="py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note about this order…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white resize-none"
                />
                <button onClick={saveNote} disabled={noteSaving}
                  className="mt-2 text-xs font-semibold px-4 py-2 rounded-xl text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {noteSaving ? 'Saving…' : 'Save Note'}
                </button>
              </div>
              <div className="py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Follow-up Schedule</p>
                {(detailOrder.followups || []).sort((a,b) => a.followup_number - b.followup_number).map((fu, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1">
                    <span className={`font-semibold w-16 ${fu.completed ? 'text-gray-400 line-through' : 'text-orange-600'}`}>{ordinal(i)}</span>
                    <span className="text-gray-600">{new Date(fu.scheduled_date).toLocaleDateString('en-IN')}</span>
                    {fu.completed && <span className="text-emerald-600 font-semibold">✓ Done</span>}
                    {fu.completed_at && <span className="text-gray-400">on {new Date(fu.completed_at).toLocaleDateString('en-IN')}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
