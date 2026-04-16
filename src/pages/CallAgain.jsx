import { useEffect, useState, useCallback } from 'react';
import { getLeads, updateLead } from '../services/lead.service';

export default function CallAgain() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getLeads({ status: 'follow_up', limit: 200 });
      setLeads(Array.isArray(res?.leads) ? res.leads : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (lead, status) => {
    setUpdating(lead._id);
    try { await updateLead(lead._id, { status }); load(); }
    catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1a1200, #3d2800, #1a1200)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Call Again</h2>
            </div>
            <p className="text-gray-400 text-sm">Leads marked for follow-up callback</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-white/10 border border-white/10">
            <p className="text-2xl font-bold text-amber-400">{leads.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Leads</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-semibold text-gray-700 text-sm">Call Again Leads</h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>
        </div>

        {leads.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">No call again leads</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leads.map((lead) => (
              <div key={lead._id} className="px-5 py-4 flex items-center gap-3 hover:bg-amber-50/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white shadow-sm">
                  {lead.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{lead.phone}</span>
                    {lead.assignedTo && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        {lead.assignedTo.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button disabled={updating === lead._id} onClick={() => handleStatus(lead, 'contacted')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 transition disabled:opacity-40">
                    Contacted
                  </button>
                  <button disabled={updating === lead._id} onClick={() => handleStatus(lead, 'interested')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 transition disabled:opacity-40">
                    Interested
                  </button>
                  <button disabled={updating === lead._id} onClick={() => handleStatus(lead, 'closed_won')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 transition disabled:opacity-40">
                    Converted
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
