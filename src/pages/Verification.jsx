import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerificationRecords, updateVerificationStatus, updateVerificationRecord, updateTask } from '../services/task.service';
import { updateLead } from '../services/lead.service';
import Modal from '../components/ui/Modal';

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-2 my-3">
    <span className="h-px flex-1 bg-gray-200" />
    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    <span className="h-px flex-1 bg-gray-200" />
  </div>
);

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
  const [onHoldDate, setOnHoldDate] = useState('');
  const [showOnHoldPicker, setShowOnHoldPicker] = useState(false);
  const [dayFilter, setDayFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');


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
      if (status === 'verified') {
        const record = records.find(r => r._id === id);
        const taskId = record?.task?._id || (typeof record?.task === 'string' ? record.task : null);
        if (taskId) await updateTask(taskId, { status: 'ready_to_shipment' });
        setRecords(prev => prev.filter(r => r._id !== id));
      } else {
        setRecords(prev => prev.map(r => r._id === id ? { ...r, status: updated.status } : r));
      }
    } catch { }
    finally { setUpdating(null); }
  };

  const flattenRecord = (r) => ({
    ...r,
    ...(r.task && typeof r.task === 'object' ? r.task : {}),
    _id: r._id,
    status: r.status,
    lead: r.lead,
    assignedTo: r.assignedTo || r.task?.assignedTo,
    title: r.title || r.task?.title,
    task: r.task,
  });

  const openDetail = (r) => { setSelected(flattenRecord(r)); setEditMode(false); };

  const startEdit = () => {
    setEditForm({
      description: selected.description || '',
      problem: selected.problem || '',
      age: selected.age || '',
      weight: selected.weight || '',
      height: selected.height || '',
      otherProblems: selected.otherProblems || '',
      problemDuration: selected.problemDuration || '',
      cityVillageType: selected.cityVillageType || 'city',
      cityVillage: selected.cityVillage || '',
      houseNo: selected.houseNo || '',
      postOffice: selected.postOffice || '',
      district: selected.district || '',
      landmark: selected.landmark || '',
      pincode: selected.pincode || '',
      state: selected.state || '',
      reminderAt: selected.reminderAt ? selected.reminderAt.slice(0, 10) : '',
      price: selected.price || '',
    });
    setEditMode(true);
    setTimeout(() => {
      document.querySelector('.modal-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await updateVerificationRecord(selected._id, editForm);
      const freshData = await getVerificationRecords();
      const freshRecords = Array.isArray(freshData) ? freshData : [];
      setRecords(freshRecords);
      const freshSelected = freshRecords.find(r => r._id === selected._id);
      setSelected(freshSelected ? flattenRecord(freshSelected) : prev => ({ ...prev, ...editForm }));
      setEditMode(false);
    } catch { }
    finally { setSaving(false); }
  };

  const sf = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const handleReadyToShipment = async () => {
    try {
      const taskId = selected.task?._id || (typeof selected.task === 'string' ? selected.task : null);
      if (taskId) await updateTask(taskId, { status: 'ready_to_shipment' });
      setSelected(null);
      navigate('/ready-to-shipment');
    } catch { }
  };

  const filterRecords = (recs) => {
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOf(new Date());
    if (dayFilter === 'today') return recs.filter(r => new Date(r.createdAt) >= today);
    if (dayFilter === 'yesterday') {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return recs.filter(r => { const d = new Date(r.createdAt); return d >= y && d < today; });
    }
    if (dayFilter === 'custom' && customDate) {
      const from = new Date(customDate);
      const to = new Date(from); to.setDate(to.getDate() + 1);
      return recs.filter(r => { const d = new Date(r.createdAt); return d >= from && d < to; });
    }
    return recs;
  };

  const filteredRecords = filterRecords(records);

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
        <div className="flex items-center gap-2 flex-wrap">
          {[['all','All'],['today','Today'],['yesterday','Yesterday']].map(([val, label]) => (
            <button key={val} onClick={() => { setDayFilter(val); setCustomDate(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                dayFilter === val
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600'
              }`}>{label}</button>
          ))}
          <input
            type="date"
            value={customDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => { setCustomDate(e.target.value); setDayFilter(e.target.value ? 'custom' : 'all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              dayFilter === 'custom'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'
            }`}
          />
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
            {filteredRecords.length} task{filteredRecords.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-blue-400" />
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">Verification List</h3>
          <span className="text-xs text-gray-400">{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</span>
        </div>
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No verification tasks</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredRecords.map(r => (
              <div key={r._id} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-500 font-bold text-sm">V</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.assignedTo && <p className="text-xs text-green-600">{r.assignedTo.name}</p>}
                      {r.lead && <p className="text-xs text-gray-400">{r.lead.name} — {r.lead.phone}</p>}
                    </div>
                  </div>
                </div>
                <button onClick={() => openDetail(r)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>View Detail</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title="" hideHeader onClose={() => { setSelected(null); setEditMode(false); }}>
          {!editMode ? (
            <>
              {/* Header */}
              <div className="-mx-6 -mt-5 mb-4 px-6 py-4 rounded-t-2xl flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #1e3a2f, #15803d)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-base">
                    {selected.lead?.name?.charAt(0)?.toUpperCase() || 'V'}
                  </div>
                  <div>
                    <p className="text-white font-bold text-base leading-tight">{selected.lead?.name || selected.title}</p>
                    <p className="text-green-200 text-xs">{selected.lead?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    selected.status === 'on_hold' ? 'bg-gray-500 text-white' :
                    selected.status === 'verified' ? 'bg-green-400 text-white' :
                    selected.status === 'rejected' ? 'bg-red-400 text-white' : 'bg-amber-400 text-white'
                  }`}>{selected.status?.replace(/_/g, ' ')}</span>
                  <button onClick={() => { setSelected(null); setEditMode(false); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 text-lg">×</button>
                </div>
              </div>

              {/* Invoice-style two-column info */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-3 mb-1 border-b border-gray-100">
                {[
                  ['Name', selected.lead?.name],
                  ['Task Title', selected.title],
                  ['Mobile No.', selected.lead?.phone],
                  ['Assigned To', selected.assignedTo?.name],
                  ['City', selected.cityVillage],
                  ['Call Date', selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString() : null],
                  ['Price', selected.price ? `₹${selected.price}` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex gap-1 text-sm">
                    <span className="text-gray-400 shrink-0 w-20">{label}</span>
                    <span className="font-semibold text-gray-800">: {value}</span>
                  </div>
                ))}
              </div>

              {/* Patient Info */}
              {(selected.age || selected.weight || selected.height) && (
                <>
                  <SectionDivider label="Patient Info" />
                  <div className="grid grid-cols-3 gap-2 mb-1">
                    {[
                      { label: 'Age', value: selected.age ? `${selected.age} yrs` : null },
                      { label: 'Weight', value: selected.weight ? `${selected.weight} kg` : null },
                      { label: 'Height', value: selected.height ? `${selected.height} cm` : null },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} className="rounded-xl px-3 py-2.5 text-center" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.15)' }}>
                        <p className="text-xs text-green-600 font-bold uppercase tracking-wide">{label}</p>
                        <p className="text-base font-bold text-gray-800 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Health Details */}
              {(selected.problem || selected.otherProblems || selected.problemDuration) && (
                <>
                  <SectionDivider label="Health Details" />
                  <div className="space-y-2 mb-1">
                    {selected.problem && (
                      <div className="flex gap-3 rounded-xl px-3 py-2.5" style={{ background: '#fff7ed', border: '1px solid rgba(251,146,60,0.2)' }}>
                        <div className="w-1 rounded-full bg-orange-400 shrink-0" />
                        <div><p className="text-xs text-orange-500 font-bold uppercase tracking-wide">Problem</p>
                          <p className="text-sm text-gray-700 mt-0.5">{selected.problem}</p></div>
                      </div>
                    )}
                    {selected.otherProblems && (
                      <div className="flex gap-3 rounded-xl px-3 py-2.5" style={{ background: '#fff7ed', border: '1px solid rgba(251,146,60,0.2)' }}>
                        <div className="w-1 rounded-full bg-orange-300 shrink-0" />
                        <div><p className="text-xs text-orange-500 font-bold uppercase tracking-wide">Other Problems</p>
                          <p className="text-sm text-gray-700 mt-0.5">{selected.otherProblems}</p></div>
                      </div>
                    )}
                    {selected.problemDuration && (
                      <div className="flex gap-3 rounded-xl px-3 py-2.5" style={{ background: '#fefce8', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <div className="w-1 rounded-full bg-yellow-400 shrink-0" />
                        <div><p className="text-xs text-yellow-600 font-bold uppercase tracking-wide">Problem Duration</p>
                          <p className="text-sm text-gray-700 mt-0.5">{selected.problemDuration}</p></div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Address */}
              {(selected.cityVillage || selected.district || selected.state || selected.pincode || selected.houseNo || selected.landmark || selected.postOffice) && (
                <>
                  <SectionDivider label="Address" />
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    {[
                      { label: selected.cityVillageType === 'village' ? 'Village' : 'City', value: selected.cityVillage },
                      { label: 'District', value: selected.district },
                      { label: 'State', value: selected.state },
                      { label: 'Pincode', value: selected.pincode },
                      { label: 'House No', value: selected.houseNo },
                      { label: 'Landmark', value: selected.landmark },
                      { label: 'Post Office', value: selected.postOffice },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="text-sm text-gray-800 font-semibold capitalize">{value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Task Info */}
              <SectionDivider label="Task Info" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Task Title', value: selected.title },
                  { label: 'Assigned To', value: selected.assignedTo?.name },
                  { label: 'Lead Status', value: selected.lead?.status?.replace(/_/g, ' ') },
                  { label: 'Call Date', value: selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString() : null },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm text-gray-800 font-semibold capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selected.description && (
                <div className="flex gap-3 rounded-xl px-3 py-2.5 mb-4" style={{ background: '#eff6ff', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <div className="w-1 rounded-full bg-blue-400 shrink-0" />
                  <div><p className="text-xs text-blue-500 font-bold uppercase tracking-wide">Description</p>
                    <p className="text-sm text-gray-700 mt-0.5">{selected.description}</p></div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                <button onClick={startEdit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>Edit</button>
                <button onClick={async () => {
                  setSaving(true);
                  try {
                    await updateVerificationRecord(selected._id, {
                      description: selected.description || '',
                      problem: selected.problem || '',
                      age: selected.age || '',
                      weight: selected.weight || '',
                      height: selected.height || '',
                      otherProblems: selected.otherProblems || '',
                      problemDuration: selected.problemDuration || '',
                      cityVillageType: selected.cityVillageType || 'city',
                      cityVillage: selected.cityVillage || '',
                      houseNo: selected.houseNo || '',
                      postOffice: selected.postOffice || '',
                      district: selected.district || '',
                      landmark: selected.landmark || '',
                      pincode: selected.pincode || '',
                      state: selected.state || '',
                      reminderAt: selected.reminderAt ? selected.reminderAt.slice(0, 10) : '',
                      price: selected.price || '',
                    });
                    setSelected(null);
                    load();
                  } catch { }
                  finally { setSaving(false); }
                }} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleReadyToShipment}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Ready to Shipment</button>
                {showOnHoldPicker ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input type="date" value={onHoldDate} onChange={e => setOnHoldDate(e.target.value)}
                      min={new Date().toISOString().slice(0,10)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400" />
                    <button onClick={async () => {
                      if (!onHoldDate) return;
                      setUpdating(selected._id);
                      try {
                        await updateVerificationStatus(selected._id, 'on_hold', onHoldDate);
                        if (selected.lead?._id) await updateLead(selected.lead._id, { status: 'on_hold' });
                        setSelected(null); setShowOnHoldPicker(false); setOnHoldDate('');
                        navigate('/pipeline', { state: { filter: 'on_hold' } });
                      } catch { }
                      finally { setUpdating(null); }
                    }}
                      disabled={!onHoldDate || updating === selected._id}
                      className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>Confirm</button>
                    <button onClick={() => { setShowOnHoldPicker(false); setOnHoldDate(''); }}
                      className="px-3 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowOnHoldPicker(true)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition"
                    style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>On Hold</button>
                )}
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-base">Edit Task</h3>
                <button onClick={() => setEditMode(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition text-lg">×</button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problem</label>
                  <textarea rows={2} className={`${inputCls} mt-1.5`} value={editForm.problem} onChange={e => sf('problem', e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                  <textarea rows={2} className={`${inputCls} mt-1.5`} value={editForm.description} onChange={e => sf('description', e.target.value)} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</label>
                    <input type="number" min="0" className={`${inputCls} mt-1.5`} placeholder="Age" value={editForm.age} onChange={e => sf('age', e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight (kg)</label>
                    <input type="number" min="0" className={`${inputCls} mt-1.5`} placeholder="Weight" value={editForm.weight} onChange={e => sf('weight', e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height (cm)</label>
                    <input type="number" min="0" className={`${inputCls} mt-1.5`} placeholder="Height" value={editForm.height} onChange={e => sf('height', e.target.value)} /></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Problems</label>
                  <textarea rows={2} className={`${inputCls} mt-1.5`} value={editForm.otherProblems} onChange={e => sf('otherProblems', e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problem Duration</label>
                  <input className={`${inputCls} mt-1.5`} placeholder="e.g. 2 years, 6 months" value={editForm.problemDuration} onChange={e => sf('problemDuration', e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</label>
                  <input type="number" min="0" className={`${inputCls} mt-1.5`} placeholder="Price" value={editForm.price || ''} onChange={e => sf('price', e.target.value)} /></div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City / Village</label>
                  <div className="flex items-center gap-3 mt-1.5 mb-1.5">
                    <span className={`text-xs font-semibold ${editForm.cityVillageType === 'city' ? 'text-green-600' : 'text-gray-400'}`}>City</span>
                    <div onClick={() => sf('cityVillageType', editForm.cityVillageType === 'city' ? 'village' : 'city')}
                      className="relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300"
                      style={{ background: editForm.cityVillageType === 'village' ? '#16a34a' : '#d1d5db' }}>
                      <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                        style={{ left: editForm.cityVillageType === 'village' ? '28px' : '4px' }} />
                    </div>
                    <span className={`text-xs font-semibold ${editForm.cityVillageType === 'village' ? 'text-green-600' : 'text-gray-400'}`}>Village</span>
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
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
