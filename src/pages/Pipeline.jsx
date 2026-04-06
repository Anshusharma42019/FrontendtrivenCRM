import { useEffect, useState, useCallback } from 'react';
import { getLeads, updateLead } from '../services/lead.service';

const STAGES = [
  { key: 'new',         label: 'New',         bar: 'bg-blue-500' },
  { key: 'contacted',   label: 'Contacted',   bar: 'bg-amber-500' },
  { key: 'interested',  label: 'Interested',  bar: 'bg-purple-500' },
  { key: 'follow_up',   label: 'Follow Up',   bar: 'bg-orange-500' },
  { key: 'closed_won',  label: 'Closed Won',  bar: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', bar: 'bg-red-400' },
];

const NEXT_STAGES = {
  new:         ['contacted', 'interested', 'follow_up', 'closed_won', 'closed_lost'],
  contacted:   ['new', 'interested', 'follow_up', 'closed_won', 'closed_lost'],
  interested:  ['new', 'contacted', 'follow_up', 'closed_won', 'closed_lost'],
  follow_up:   ['new', 'contacted', 'interested', 'closed_won', 'closed_lost'],
  closed_won:  ['new', 'contacted', 'interested', 'follow_up', 'closed_lost'],
  closed_lost: ['new', 'contacted', 'interested', 'follow_up', 'closed_won'],
};

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('new');
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

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

  const handleMove = async (lead, newStage) => {
    setUpdating(lead._id);
    try {
      await updateLead(lead._id, { status: newStage });
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: newStage } : l));
    } catch { load(); }
    finally { setUpdating(null); }
  };

  const currentStage = STAGES.find(s => s.key === activeStage);
  const currentLeads = byStage(activeStage);

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
      {/* Header — title left, stage tabs right */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Sales Pipeline</h2>

        {/* Stage tab buttons */}
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map(({ key, label, bar }) => {
            const count = byStage(key).length;
            const isActive = activeStage === key;
            return (
              <button key={key} onClick={() => setActiveStage(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : bar}`} />
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead list card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        {/* Card header */}
        <div className={`h-1 ${currentStage?.bar}`} />
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">{currentStage?.label}</h3>
          <span className="text-xs text-gray-400">{currentLeads.length} lead{currentLeads.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Leads */}
        {currentLeads.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <p className="text-gray-400 text-sm">No leads in {currentStage?.label}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {currentLeads.map(lead => (
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
                {/* Move buttons — all stages except current */}
                <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                  {STAGES.filter(s => s.key !== activeStage).map(s => (
                    <button key={s.key}
                      disabled={updating === lead._id}
                      onClick={() => handleMove(lead, s.key)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-40">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
