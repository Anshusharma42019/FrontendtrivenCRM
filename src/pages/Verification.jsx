import { useEffect, useState, useCallback } from 'react';
import { getVerificationRecords, updateVerificationStatus } from '../services/task.service';

const STATUS_STYLES = {
  pending:  'bg-amber-50 text-amber-600 border-amber-200',
  verified: 'bg-green-50 text-green-600 border-green-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
  on_hold:  'bg-gray-50 text-gray-500 border-gray-200',
};

export default function Verification() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getVerificationRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      const updated = await updateVerificationStatus(id, status);
      setRecords(prev => prev.map(r => r._id === id ? { ...r, status: updated.status } : r));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Verification</h2>
          <p className="text-sm text-gray-400 mt-0.5">Tasks pending verification</p>
        </div>
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
          {records.length} task{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-blue-400" />
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">Verification List</h3>
          <span className="text-xs text-gray-400">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        </div>
        {records.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <p className="text-gray-400 text-sm">No verification tasks</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map(r => (
              <div key={r._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-500 font-bold text-sm">V</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {r.assignedTo && <p className="text-xs text-green-600">{r.assignedTo.name}</p>}
                    {r.lead && <p className="text-xs text-gray-400">{r.lead.name} — {r.lead.phone}</p>}
                    {r.dueDate && <p className="text-xs text-gray-400">{new Date(r.dueDate).toLocaleDateString()}</p>}
                  </div>
                  {r.address && <p className="text-xs text-gray-400 mt-0.5">{r.address}</p>}
                </div>
                <select
                  disabled={updating === r._id}
                  value={r.status || 'pending'}
                  onChange={(e) => handleStatusChange(r._id, e.target.value)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-300 transition disabled:opacity-50 shrink-0 ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
