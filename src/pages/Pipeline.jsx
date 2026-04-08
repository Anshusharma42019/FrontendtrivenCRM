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

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
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
      const res = await getLeads({ limit: 200 });
      setLeads(Array.isArray(res?.leads) ? res.leads : []);
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
    } catch { /* ignore */ }
  };

  const handleMove = async (lead, newStage) => {
    setUpdating(lead._id);
    try {
      await updateLead(lead._id, { status: newStage });
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: newStage } : l));
    } catch { load(); }
    finally { setUpdating(null); }
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
              if (stageLeads.length === 0) return (
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
                    {stageLeads.map(lead => (
                      <div key={lead._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
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
                              <button
                                onClick={() => openDetail(lead)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all"
                                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                                View Detail
                              </button>
                              <button
                                disabled={updating === lead._id}
                                onClick={() => handleMove(lead, 'interested')}
                                className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                Verification
                              </button>
                              <button
                                disabled={updating === lead._id}
                                onClick={() => handleMove(lead, 'closed_lost')}
                                className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                Not Interested
                              </button>
                            </>
                          ) : (
                            <>
                              {key !== 'closed_lost' && (
                                <button
                                  disabled={updating === lead._id}
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
