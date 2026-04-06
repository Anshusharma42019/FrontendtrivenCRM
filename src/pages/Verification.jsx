import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerificationRecords, updateVerificationStatus, updateTask } from '../services/task.service';
import { updateLead } from '../services/lead.service';
import Modal from '../components/ui/Modal';

const STATUS_STYLES = {
  pending:  'bg-amber-50 text-amber-600 border-amber-200',
  verified: 'bg-green-50 text-green-600 border-green-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
  on_hold:  'bg-gray-50 text-gray-500 border-gray-200',
};

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

export default function Verification() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getVerificationRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally { setLoading(false); }
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

  const openDetail = (r) => { setSelected(r); setEditMode(false); };

  const startEdit = () => {
    setEditForm({
      description: selected.description || '',
      cityVillageType: selected.cityVillageType || 'city',
      cityVillage: selected.cityVillage || '',
      houseNo: selected.houseNo || '',
      postOffice: selected.postOffice || '',
      district: selected.district || '',
      landmark: selected.landmark || '',
      pincode: selected.pincode || '',
      state: selected.state || '',
      reminderAt: selected.reminderAt ? selected.reminderAt.slice(0, 10) : '',
    });
    setEditMode(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const taskId = selected.task?._id || selected.task;
      await updateTask(taskId, editForm);
      // update selected with new values so detail view shows updated data
      setSelected(prev => ({ ...prev, ...editForm }));
      setEditMode(false);
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const sf = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const handleReadyToShipment = async () => {
    try {
      const taskId = selected.task?._id || selected.task;
      await updateTask(taskId, { status: 'ready_to_shipment' });
      setSelected(null);
      navigate('/ready-to-shipment');
    } catch { /* ignore */ }
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
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openDetail(r)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>View Detail</button>
                  {r.lead && (
                    <select disabled={updating === r._id} value={r.lead.status || ''}
                      onChange={async (e) => {
                        const val = e.target.value; setUpdating(r._id);
                        try {
                          await updateLead(r.lead._id, { status: val });
                          if (val === 'closed_won') setRecords(prev => prev.filter(rec => rec._id !== r._id));
                          else load();
                        } catch { /* ignore */ } finally { setUpdating(null); }
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 transition disabled:opacity-50">
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="closed_won">Converted</option>
                      <option value="closed_lost">Lost</option>
                    </select>
                  )}
                  <select disabled={updating === r._id} value={r.status || 'pending'}
                    onChange={(e) => handleStatusChange(r._id, e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-300 transition disabled:opacity-50 ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title={editMode ? 'Edit Task' : 'Verification Detail'} onClose={() => { setSelected(null); setEditMode(false); }}>
          {!editMode ? (
            <>
              <div className="space-y-0">
                {[
                  { label: 'Task Title', value: selected.title },
                  { label: 'Verification Status', value: selected.status },
                  { label: 'Assigned To', value: selected.assignedTo?.name },
                  { label: 'Lead Name', value: selected.lead?.name },
                  { label: 'Lead Phone', value: selected.lead?.phone },
                  { label: 'Lead Status', value: selected.lead?.status?.replace(/_/g, ' ') },
                  { label: 'Description', value: selected.description },
                  { label: selected.cityVillageType === 'village' ? 'Village' : 'City', value: selected.cityVillage },
                  { label: 'House No', value: selected.houseNo },
                  { label: 'Post Office', value: selected.postOffice },
                  { label: 'District', value: selected.district },
                  { label: 'Landmark', value: selected.landmark },
                  { label: 'Pincode', value: selected.pincode },
                  { label: 'State', value: selected.state },
                  { label: 'Confirmation Call Date', value: selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString() : null },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0 mt-0.5">{label}</p>
                    <p className="text-sm text-gray-800 font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={startEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>Edit</button>
                <button onClick={handleReadyToShipment}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Ready to Shipment</button>
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition">Cancel</button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                <textarea rows={2} className={`${inputCls} mt-1.5`} value={editForm.description} onChange={e => sf('description', e.target.value)} /></div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City / Village</label>
                <div className="flex items-center gap-3 mt-1.5 mb-1.5">
                  <span className={`text-xs font-semibold transition ${editForm.cityVillageType === 'city' ? 'text-green-600' : 'text-gray-400'}`}>City</span>
                  <div onClick={() => sf('cityVillageType', editForm.cityVillageType === 'city' ? 'village' : 'city')}
                    className="relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300"
                    style={{ background: editForm.cityVillageType === 'village' ? '#16a34a' : '#d1d5db' }}>
                    <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                      style={{ left: editForm.cityVillageType === 'village' ? '28px' : '4px' }} />
                  </div>
                  <span className={`text-xs font-semibold transition ${editForm.cityVillageType === 'village' ? 'text-green-600' : 'text-gray-400'}`}>Village</span>
                </div>
                <input className={inputCls} placeholder={`Enter ${editForm.cityVillageType} name`} value={editForm.cityVillage} onChange={e => sf('cityVillage', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">House No</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="House No" value={editForm.houseNo} onChange={e => sf('houseNo', e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Post Office</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="Post Office" value={editForm.postOffice} onChange={e => sf('postOffice', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="District" value={editForm.district} onChange={e => sf('district', e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Landmark</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="Landmark" value={editForm.landmark} onChange={e => sf('landmark', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="Pincode" value={editForm.pincode} onChange={e => sf('pincode', e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="State" value={editForm.state} onChange={e => sf('state', e.target.value)} /></div>
              </div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmation Call Date</label>
                <input type="date" className={`${inputCls} mt-1.5`} value={editForm.reminderAt} onChange={e => sf('reminderAt', e.target.value)} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditMode(false)}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">Back</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
