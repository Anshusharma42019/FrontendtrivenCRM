import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLeads, updateLead } from '../services/lead.service';
import API from '../api';

const STAGES = [
  { key: 'new',         label: 'New',         bar: 'bg-blue-500' },
  { key: 'contacted',   label: 'Contacted',   bar: 'bg-amber-500' },
  { key: 'interested',  label: 'Interested',  bar: 'bg-purple-500' },
  { key: 'follow_up',   label: 'Follow Up',   bar: 'bg-orange-500' },
  { key: 'closed_won',  label: 'Closed Won',  bar: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', bar: 'bg-red-400' },
  { key: 'on_hold',     label: 'On Hold',     bar: 'bg-gray-400' },
];

function FollowUpPanel({ lead, onUpdate }) {
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState(
    lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);
  const followUps = lead.follow_ups || [];

  const add = async () => {
    if (!note.trim() && !nextDate) return;
    setSaving(true);
    try {
      const res = await API.post(`/leads/${lead._id}/follow-up`, { note, next_date: nextDate || undefined });
      onUpdate(lead._id, res.data.data);
      setNote('');
    } finally { setSaving(false); }
  };

  const setDate = async (date) => {
    setNextDate(date);
    const res = await API.patch(`/leads/${lead._id}/next-follow-up`, { next_follow_up: date || null });
    onUpdate(lead._id, res.data.data);
  };

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Follow Up</span>
        {followUps.length > 0 && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{followUps.length}</span>
        )}
        {lead.next_follow_up && (
          <span className="text-xs text-orange-600 font-semibold ml-auto">
            Next: {new Date(lead.next_follow_up).toLocaleDateString('en-IN')}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        <input type="date" value={nextDate} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white" />
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Note…"
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white flex-1 min-w-32" />
        <button onClick={add} disabled={saving || (!note.trim() && !nextDate)}
          className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-40">
          {saving ? '…' : '+ Add'}
        </button>
      </div>
      {followUps.length > 0 && (
        <div className="space-y-0.5 max-h-20 overflow-auto">
          {[...followUps].reverse().slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-gray-400 whitespace-nowrap shrink-0">{new Date(f.date).toLocaleDateString('en-IN')}</span>
              <span className="text-gray-600 truncate">{f.note || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [detailVerification, setDetailVerification] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.filter) {
      setFilter(location.state.filter);
      window.history.replaceState({}, '');
    }
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const [leadsRes, interestedRes, ordersRes] = await Promise.all([
        getLeads({ limit: 200 }),
        getLeads({ limit: 200, status: 'interested' }),
        API.get('/shiprocket/orders/with-followups'),
      ]);
      const allLeads = [...(Array.isArray(leadsRes?.leads) ? leadsRes.leads : []), ...(Array.isArray(interestedRes?.leads) ? interestedRes.leads : [])];
      setLeads(allLeads);
      setDeliveredOrders(Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byStage = (stage) => leads.filter(l => l.status === stage);

  const openDetail = async (lead) => {
    setDetailLead(lead);
    setDetailVerification(null);
    try {
      const res = await API.get('/verification');
      const records = res.data.data || [];
      const rec = records.find(r => r.lead?._id === lead._id || r.lead === lead._id);
      setDetailVerification(rec || null);
    } catch { }
  };

  const handleMove = async (lead, newStage) => {
    setUpdating(lead._id);
    try {
      await updateLead(lead._id, { status: newStage });
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: newStage } : l));
    } catch { load(); }
    finally { setUpdating(null); }
  };

  const [doneLoading, setDoneLoading] = useState(null);
  const [completedMap, setCompletedMap] = useState({}); // orderId → completedCount

  const handleFollowUpDone = async (orderId) => {
    const oid = String(orderId);
    setDoneLoading(oid);
    try {
      const res = await API.post(`/shiprocket/orders/${oid}/complete-followup`);
      console.log('[FollowUp] response:', res.data);
      const { next_follow_up, completedCount } = res.data.data;
      setCompletedMap(prev => ({ ...prev, [oid]: completedCount }));
      setDeliveredOrders(prev => prev.map(o => {
        if (String(o._id) !== oid) return o;
        if (completedCount >= 5 && !next_follow_up) return null;
        const updatedFUs = (o.followups || []).map(f =>
          f.followup_number === completedCount ? { ...f, completed: true } : f
        );
        return { ...o, next_follow_up, followups: updatedFUs };
      }).filter(Boolean));
    } catch(err) {
      console.error('[FollowUp] error:', err.response?.data || err.message);
    } finally { setDoneLoading(null); }
  };

  const handleFollowUpUpdate = (id, updated) => {
    setLeads(prev => prev.map(l => l._id === id ? { ...l, ...updated } : l));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading pipeline...
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Sales Pipeline</h2>
        <div className="flex gap-2">
          {[
            { key: 'on_hold',     label: 'On Hold',        color: 'bg-gray-500' },
            { key: 'interested',  label: 'Interested',     color: 'bg-purple-500' },
            { key: 'closed_lost', label: 'Not Interested', color: 'bg-red-400' },
          ].map(({ key, label, color }) => (
            <button key={key}
              onClick={() => setFilter(f => f === key ? null : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filter === key
                  ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${filter === key ? 'bg-white' : color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {!filter ? (
          <div className="py-16 text-center text-gray-400 text-sm">Select a filter to view leads</div>
        ) : (
          <>
            {STAGES.map(({ key, label, bar }) => {
              if (key !== filter) return null;
              const stageLeads = byStage(key);
              const showDelivered = key === 'follow_up' && deliveredOrders.length > 0;
              if (stageLeads.length === 0 && !showDelivered) return (
                <div key={key} className="py-16 text-center text-gray-400 text-sm">No leads in {label}</div>
              );
              return (
                <div key={key} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div className={`h-1 ${bar}`} />
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700 text-sm">{label}</h3>
                    <span className="text-xs text-gray-400">{stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {showDelivered && deliveredOrders.map(o => {
                      const oid = String(o._id);
                      const allFUs = (o.followups || []).sort((a, b) => a.followup_number - b.followup_number);
                      const completed = completedMap[oid] ?? allFUs.filter(f => f.completed).length;
                      const activeIdx = completed;
                      const activeFU = allFUs[activeIdx];
                      const product = o.order_items?.[0];
                      const ordinal = n => ['1st','2nd','3rd','4th','5th'][n] || `${n+1}th`;
                      const allDone = completed >= 5;
                      const displayFUs = allFUs.length > 0 ? allFUs : Array.from({ length: 5 }, (_, i) => ({
                        followup_number: i + 1, scheduled_date: new Date(o.delivered_at || o.createdAt || new Date()), completed: false,
                      }));
                      return (
                        <div key={o._id} className="px-5 py-3.5 hover:bg-orange-50/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white"
                              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                              {(o.billing_customer_name || '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800 text-sm">{o.billing_customer_name || '—'}</p>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">DELIVERED</span>
                                {!allDone && activeFU && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
                                    {ordinal(activeIdx)} Follow-up Due
                                  </span>
                                )}
                                {allDone && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">✓ All Done</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <p className="text-xs text-gray-400">{o.billing_phone || '—'}</p>
                                <p className="text-xs text-gray-400">{o.billing_city || '—'}</p>
                                {product && <p className="text-xs text-gray-500">{product.name} ×{product.units || 1}</p>}
                                <p className="text-xs font-semibold text-gray-700">₹{o.sub_total || '—'}</p>
                                {o.awb_code && <p className="text-xs font-mono text-blue-500">{o.awb_code}</p>}
                                {o.delivered_at && (
                                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/></svg>
                                    {new Date(o.delivered_at).toLocaleDateString('en-IN')}
                                  </p>
                                )}
                                {!allDone && activeFU && (
                                  <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                    Next: {new Date(activeFU.scheduled_date).toLocaleDateString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
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
                            </div>
                          </div>
                          {/* Follow-up steps */}
                          <div className="mt-2 pt-2 border-t border-orange-50 flex items-center gap-2 flex-wrap">
                            {displayFUs.map((fu, i) => {
                              const isDone = i < completed;
                              const isActive = i === activeIdx && !allDone;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isActive && doneLoading !== oid) handleFollowUpDone(oid);
                                  }}
                                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                                    isDone
                                      ? 'bg-gray-100 text-gray-400 line-through'
                                      : isActive
                                      ? 'text-white'
                                      : 'bg-gray-50 text-gray-300 border border-gray-100'
                                  }`}
                                  style={isActive ? { background: 'linear-gradient(135deg, #16a34a, #15803d)', cursor: 'pointer' } : { cursor: 'default' }}
                                >
                                  {isDone ? `✓ ${ordinal(i)}` : doneLoading === oid && isActive ? '…' : `${ordinal(i)} Follow-up`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {stageLeads.map(lead => (
                      <div key={lead._id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                        {/* Lead info + action buttons */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                            {lead.name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-gray-400">{lead.phone}</p>
                              {lead.assignedTo && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                  {lead.assignedTo.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                            {key === 'on_hold' ? (
                              <>
                                <button onClick={() => openDetail(lead)}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all"
                                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                                  View Detail
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'interested')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                  Verification
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'closed_lost')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                  Not Interested
                                </button>
                              </>
                            ) : key === 'interested' ? (
                              <>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'on_hold')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                                  On Hold
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={async () => {
                                    setUpdating(lead._id);
                                    try {
                                      const { getTasks, updateTask } = await import('../services/task.service');
                                      const tasks = await getTasks({ lead: lead._id, status: 'interested' });
                                      const task = Array.isArray(tasks) ? tasks[0] : null;
                                      if (task) await updateTask(task._id, { status: 'verification' });
                                      navigate('/verification');
                                    } catch { navigate('/verification'); }
                                    finally { setUpdating(null); }
                                  }}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                  Verification
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'closed_lost')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                  Not Interested
                                </button>
                              </>
                            ) : (
                              <>
                                {key !== 'closed_lost' && (
                                  <button disabled={updating === lead._id}
                                    onClick={() => handleMove(lead, 'on_hold')}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                                    On Hold
                                  </button>
                                )}
                                {key !== 'closed_lost' && STAGES.filter(s => s.key !== key && s.key !== 'on_hold').map(s => (
                                  <button key={s.key}
                                    disabled={updating === lead._id}
                                    onClick={() => s.key === 'new'
                                      ? (handleMove(lead, 'new'), navigate('/tasks', { state: { leadId: lead._id, assignedTo: lead.assignedTo?._id || '' } }))
                                      : handleMove(lead, s.key)
                                    }
                                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-40">
                                    {s.label}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        {/* Follow Up Panel */}
                        <FollowUpPanel lead={lead} onUpdate={handleFollowUpUpdate} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailLead(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">On Hold Detail</h3>
              <button onClick={() => setDetailLead(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3 py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">Lead Name</p>
                <p className="text-sm text-gray-800 font-medium">{detailLead.name}</p>
              </div>
              <div className="flex gap-3 py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">Phone</p>
                <p className="text-sm text-gray-800 font-medium">{detailLead.phone}</p>
              </div>
              {detailLead.assignedTo && (
                <div className="flex gap-3 py-2 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">Assigned To</p>
                  <p className="text-sm text-gray-800 font-medium">{detailLead.assignedTo.name}</p>
                </div>
              )}
              <div className="flex gap-3 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">On Hold Until</p>
                <p className="text-sm font-semibold text-gray-600">
                  {detailVerification?.onHoldUntil
                    ? new Date(detailVerification.onHoldUntil).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
