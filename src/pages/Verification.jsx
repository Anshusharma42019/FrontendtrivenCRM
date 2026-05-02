import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerificationRecords, syncVerificationRecords, updateVerificationStatus, updateVerificationRecord, updateTask, deleteVerificationRecord } from '../services/task.service';
import { updateLead } from '../services/lead.service';
import API from '../api';
import Modal from '../components/ui/Modal';

const VerifyIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

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
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-green-500">{label}</span>
    <div className="flex-1 h-px bg-green-100" />
  </div>
);

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

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
  const [onHoldReason, setOnHoldReason] = useState('');
  const [showOnHoldPicker, setShowOnHoldPicker] = useState(false);
  const [dayFilter, setDayFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getVerificationRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Sync + repair in background, then refresh
    Promise.allSettled([
      syncVerificationRecords(),
      API.post('/verification/repair'),
    ])
      .then(() => getVerificationRecords())
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [load]);

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

  const filterRecords = (recs) => {
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOf(new Date());
    let filtered = recs;

    if (dayFilter === 'today') filtered = recs.filter(r => new Date(r.createdAt) >= today);
    else if (dayFilter === 'yesterday') {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      filtered = recs.filter(r => { const d = new Date(r.createdAt); return d >= y && d < today; });
    }
    else if (dayFilter === 'custom' && customDate) {
      const from = new Date(customDate);
      const to = new Date(from); to.setDate(to.getDate() + 1);
      filtered = recs.filter(r => { const d = new Date(r.createdAt); return d >= from && d < to; });
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.lead?.name?.toLowerCase().includes(q) ||
        r.lead?.phone?.includes(q) ||
        r.assignedTo?.name?.toLowerCase().includes(q) ||
        r.district?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredRecords = filterRecords(records);

  const startEdit = () => {
    setEditForm({
      name: selected.lead?.name || '',
      phone: selected.lead?.phone || '',
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
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const { name, phone, ...verificationFields } = editForm;
      await updateVerificationRecord(selected._id, verificationFields);
      if (selected.lead?._id) await updateLead(selected.lead._id, { name, phone });
      
      const freshData = await getVerificationRecords();
      const freshRecords = Array.isArray(freshData) ? freshData : [];
      setRecords(freshRecords);
      
      const freshSelected = freshRecords.find(r => r._id === selected._id);
      const flattened = freshSelected ? flattenRecord(freshSelected) : { ...selected, ...verificationFields };
      setSelected({ ...flattened, lead: { ...(flattened.lead || selected.lead || {}), name, phone } });
      setEditMode(false);
    } catch { }
    finally { setSaving(false); }
  };

  const handleStatusUpdate = async (status, holdDate = null, holdReason = null) => {
    setUpdating(selected._id);
    try {
      await updateVerificationStatus(selected._id, status, holdDate, holdReason);
      if (status === 'verified' || status === 'on_hold') {
        setRecords(prev => prev.filter(r => r._id !== selected._id));
        setSelected(null);
        if (status === 'on_hold') {
          await API.post('/verification/repair').catch(() => {});
        }
      } else {
        setRecords(prev => prev.map(r => r._id === selected._id ? { ...r, status } : r));
        setSelected(prev => ({ ...prev, status }));
      }
    } catch { }
    finally { setUpdating(null); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this verification record?')) return;
    try {
      await deleteVerificationRecord(id);
      setRecords(prev => prev.filter(r => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch { }
  };

  const handleReadyToShipment = async () => {
    try {
      const taskId = selected.task?._id || (typeof selected.task === 'string' ? selected.task : null);
      if (taskId) await updateTask(taskId, { status: 'ready_to_shipment' });
      setSelected(null);
      navigate('/ready-to-shipment');
    } catch { }
  };

  const sf = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const handlePincodeChange = async (val) => {
    sf('pincode', val);
    if (val.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
      const data = await res.json();
      if (data[0]?.Status === 'Success') {
        const office = data[0].PostOffice?.[0];
        if (office) {
          setEditForm(f => ({ ...f, district: office.District, state: office.State }));
        }
      }
    } catch { }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex gap-4 scroll-container-h overflow-hidden animate-slide-up mobile-p-safe">
      {/* ── LEFT PANEL ── */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selected ? 'w-full lg:w-[55%]' : 'w-full'} h-full overflow-hidden`}>
        
        {/* Header & Filters (Fixed) */}
        <div className="flex items-center gap-3 shrink-0 glass px-4 py-3 rounded-2xl border border-white/50 shadow-sm">
          {/* Day filters */}
          {[['all', 'All'], ['today', 'Today'], ['yesterday', 'Yesterday']].map(([val, label]) => (
            <button key={val} onClick={() => { setDayFilter(val); setCustomDate(''); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all shrink-0 ${
                dayFilter === val ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
              }`}>{label}</button>
          ))}
          <input type="date" value={customDate} max={new Date().toISOString().slice(0, 10)}
            onChange={e => { setCustomDate(e.target.value); setDayFilter(e.target.value ? 'custom' : 'all'); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer outline-none shrink-0 ${
              dayFilter === 'custom' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-400 border-gray-100'
            }`} />
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, task..."
              className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-gray-100 bg-white text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400/20 focus:border-green-400 transition shadow-sm" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300">{filteredRecords.length}</span>
          </div>
          {/* Pending badge */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md shrink-0"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
            <VerifyIcon className="w-3.5 h-3.5" />
            {filteredRecords.length} Pending
          </div>
        </div>

        {/* List (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3 text-green-300">
                <VerifyIcon className="w-6 h-6" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No tasks found</p>
              <p className="text-gray-400 text-xs mt-1">{search ? 'Try a different search' : 'Nothing here yet'}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredRecords.map((r, i) => {
                const color = PIN_COLORS[i % PIN_COLORS.length];
                const isActive = selected?._id === r._id;
                const flattened = flattenRecord(r);
                return (
                  <div
                    key={r._id}
                    onClick={() => setSelected(isActive ? null : flattened)}
                    className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 border
                      ${isActive
                        ? 'bg-green-50 border-green-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-green-200 hover:bg-green-50/30 hover:shadow-sm'}`}>

                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${color}`} />
                    <span className="text-[11px] font-bold text-gray-300 w-5 text-center shrink-0 ml-2">{i + 1}</span>

                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
                      {initials(flattened.lead?.name || flattened.title)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{flattened.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {flattened.lead?.name && <span className="text-xs text-gray-500">{flattened.lead.name}</span>}
                        {flattened.lead?.phone && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            {flattened.lead.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        flattened.status === 'on_hold' ? 'bg-gray-50 text-gray-600 border-gray-100' :
                        flattened.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        flattened.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {flattened.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {flattened.assignedTo?.name && (
                        <span className="text-[10px] text-gray-400 hidden sm:block">Assigned: {flattened.assignedTo.name}</span>
                      )}
                    </div>

                    <button onClick={(e) => handleDelete(r._id, e)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition shrink-0 font-bold text-base">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT DETAIL PANEL ── */}
      {selected && (
        <div className="hidden lg:flex flex-col w-[45%] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
          <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg,#16a34a,#15803d,#16a34a)' }} />
          
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${PIN_COLORS[filteredRecords.findIndex(r => r._id === selected._id) % PIN_COLORS.length]}`}>
                {initials(selected.lead?.name || selected.title)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-tight">{selected.lead?.name || 'Task Detail'}</p>
                {selected.lead?.phone && <p className="text-xs text-gray-400">{selected.lead.phone}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <button onClick={startEdit} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition">Edit</button>
              )}
              <button onClick={() => { setSelected(null); setEditMode(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-lg">×</button>
            </div>
          </div>

          <div className="px-5 py-3 overflow-y-auto flex-1 custom-scrollbar">
            {editMode ? (
              <form onSubmit={handleSave} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                    <input className={`${inputCls} mt-1`} value={editForm.name} onChange={e => sf('name', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                    <input className={`${inputCls} mt-1`} value={editForm.phone} onChange={e => sf('phone', e.target.value)} /></div>
                </div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Problem</label>
                  <textarea rows={2} className={`${inputCls} mt-1`} value={editForm.problem} onChange={e => sf('problem', e.target.value)} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Age</label>
                    <input type="number" className={`${inputCls} mt-1`} value={editForm.age} onChange={e => sf('age', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weight</label>
                    <input type="number" className={`${inputCls} mt-1`} value={editForm.weight} onChange={e => sf('weight', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Height</label>
                    <input type="number" step="0.1" className={`${inputCls} mt-1`} value={editForm.height} onChange={e => sf('height', e.target.value)} /></div>
                </div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Other Problems</label>
                  <textarea rows={2} className={`${inputCls} mt-1`} value={editForm.otherProblems} onChange={e => sf('otherProblems', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</label>
                    <input type="number" className={`${inputCls} mt-1`} value={editForm.price} onChange={e => sf('price', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Call Date</label>
                    <input type="date" className={`${inputCls} mt-1`} value={editForm.reminderAt} onChange={e => sf('reminderAt', e.target.value)} /></div>
                </div>
                
                <SectionHead label="Address" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City / Village Type</label>
                    <select className={`${inputCls} mt-1`} value={editForm.cityVillageType} onChange={e => sf('cityVillageType', e.target.value)}>
                      <option value="city">City</option>
                      <option value="village">Village</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City Name</label>
                    <input className={`${inputCls} mt-1`} value={editForm.cityVillage} onChange={e => sf('cityVillage', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pincode</label>
                    <input className={`${inputCls} mt-1`} value={editForm.pincode} onChange={e => handlePincodeChange(e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">House No</label>
                    <input className={`${inputCls} mt-1`} value={editForm.houseNo} onChange={e => sf('houseNo', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Post Office</label>
                    <input className={`${inputCls} mt-1`} value={editForm.postOffice} onChange={e => sf('postOffice', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Landmark</label>
                    <input className={`${inputCls} mt-1`} value={editForm.landmark} onChange={e => sf('landmark', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">District</label>
                    <input className={`${inputCls} mt-1`} value={editForm.district} onChange={e => sf('district', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">State</label>
                    <input className={`${inputCls} mt-1`} value={editForm.state} onChange={e => sf('state', e.target.value)} /></div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <SectionHead label="Customer" />
                <DetailRow label="Task" value={selected.title} />
                <DetailRow label="Assigned To" value={selected.assignedTo?.name} />
                <DetailRow label="Description" value={selected.description} />

                <SectionHead label="Health Info" />
                <DetailRow label="Problem" value={selected.problem} />
                <DetailRow label="Duration" value={selected.problemDuration} />
                <DetailRow label="Age" value={selected.age ? `${selected.age} yrs` : null} />
                <DetailRow label="Weight" value={selected.weight ? `${selected.weight} kg` : null} />
                <DetailRow label="Height" value={selected.height ? `${selected.height} ft` : null} />
                <DetailRow label="Other Problems" value={selected.otherProblems} />

                <SectionHead label="Address" />
                <DetailRow label={selected.cityVillageType === 'village' ? 'Village' : 'City'} value={selected.cityVillage} />
                <DetailRow label="House No" value={selected.houseNo} />
                <DetailRow label="Post Office" value={selected.postOffice} />
                <DetailRow label="District" value={selected.district} />
                <DetailRow label="State" value={selected.state} />
                <DetailRow label="Pincode" value={selected.pincode} />
                <DetailRow label="Landmark" value={selected.landmark} />

                <SectionHead label="Order" />
                <DetailRow label="Price" value={selected.price ? `₹${selected.price}` : null} />
                <DetailRow label="Call Date" value={selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
              </>
            )}
          </div>

          {!editMode && (
            <div className="px-5 py-4 border-t border-gray-50 flex flex-col gap-2 shrink-0 bg-white">
              <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate('verified')}
                    disabled={updating}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-900/10 bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:opacity-50">
                    <VerifyIcon /> Verified
                  </button>
                
                {showOnHoldPicker ? (
                  <div className="flex-[1.5] flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <input
                      placeholder="Reason (e.g. call back later)"
                      value={onHoldReason}
                      onChange={e => setOnHoldReason(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                    <input type="date" value={onHoldDate} onChange={e => setOnHoldDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none" />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { handleStatusUpdate('on_hold', onHoldDate, onHoldReason); setShowOnHoldPicker(false); setOnHoldReason(''); setOnHoldDate(''); }}
                        disabled={!onHoldDate || !onHoldReason}
                        className="flex-1 py-1.5 bg-gray-800 text-white text-[10px] font-bold rounded-lg disabled:opacity-40 transition">
                        Confirm
                      </button>
                      <button onClick={() => { setShowOnHoldPicker(false); setOnHoldReason(''); setOnHoldDate(''); }} className="px-2 text-gray-400 hover:text-gray-600 text-sm">×</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowOnHoldPicker(true)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 bg-gradient-to-r from-gray-500 to-gray-600">
                    On Hold
                  </button>
                )}
              </div>
              
              <button onClick={handleReadyToShipment}
                className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-amber-900/10 bg-gradient-to-r from-amber-500 to-amber-600">
                Ready to Shipment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal (Mobile) */}
      {selected && (
        <div className="lg:hidden">
          <Modal hideHeader={true} onClose={() => { setSelected(null); setEditMode(false); }}>
            <div className="-mx-4 -mt-4 mb-5 px-6 py-6 rounded-b-3xl relative" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
              <button onClick={() => { setSelected(null); setEditMode(false); }}
                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-all text-xl">
                ×
              </button>
              <div className="flex items-center gap-4 pr-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-xl ${PIN_COLORS[filteredRecords.findIndex(r => r._id === selected._id) % PIN_COLORS.length]}`}>
                  {initials(selected.lead?.name || selected.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg tracking-tight truncate">{selected.lead?.name || selected.title}</h3>
                  <p className="text-emerald-300/70 text-sm font-medium">{selected.lead?.phone}</p>
                </div>
              </div>
            </div>

            <div className="space-y-0 px-2">
              {editMode ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                      <input className={`${inputCls} mt-1`} value={editForm.name} onChange={e => sf('name', e.target.value)} /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                      <input className={`${inputCls} mt-1`} value={editForm.phone} onChange={e => sf('phone', e.target.value)} /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Problem</label>
                      <textarea rows={1} className={`${inputCls} mt-1`} value={editForm.problem} onChange={e => sf('problem', e.target.value)} /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="Age" className={inputCls} value={editForm.age} onChange={e => sf('age', e.target.value)} />
                      <input type="number" placeholder="Wt" className={inputCls} value={editForm.weight} onChange={e => sf('weight', e.target.value)} />
                      <input type="number" step="0.1" placeholder="Ht" className={inputCls} value={editForm.height} onChange={e => sf('height', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 pb-2">
                    <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-green-600 shadow-md">Save</button>
                    <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 bg-gray-100">Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <SectionHead label="Customer Info" />
                  <DetailRow label="Task" value={selected.title} />
                  <DetailRow label="Assigned" value={selected.assignedTo?.name} />
                  <DetailRow label="Problem" value={selected.problem} />
                  <DetailRow label="Duration" value={selected.problemDuration} />
                  
                  <SectionHead label="Address Details" />
                  <DetailRow label="City/Village" value={selected.cityVillage} />
                  <DetailRow label="Pincode" value={selected.pincode} />
                  <DetailRow label="Landmark" value={selected.landmark} />
                  
                  <SectionHead label="Order Details" />
                  <DetailRow label="Price" value={selected.price ? `₹${selected.price}` : null} />
                  
                  <div className="flex flex-col gap-3 pt-6 pb-4">
                    <div className="flex gap-2.5">
                      <button onClick={() => handleStatusUpdate('verified')} 
                        className="flex-1 py-4 rounded-xl text-[11px] font-bold text-white shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <VerifyIcon className="w-4 h-4" /> VERIFY RECORD
                      </button>
                      <button onClick={() => setEditMode(true)} 
                        className="px-6 py-4 rounded-xl text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 transition-all active:scale-[0.98]">
                        EDIT
                      </button>
                    </div>
                    <button onClick={handleReadyToShipment} 
                      className="w-full py-4 rounded-xl text-[11px] font-bold text-white shadow-lg shadow-amber-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
                      </svg>
                      READY TO SHIPMENT
                    </button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
