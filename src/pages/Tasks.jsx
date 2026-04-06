import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTasks, getDailyTasks, createTask, updateTask, deleteTask, addTaskNote } from '../services/task.service';
import API from '../api';
import { getLeads, updateLead } from '../services/lead.service';
import { getUsers } from '../services/user.service';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

const TYPES = ['call', 'follow_up', 'meeting', 'email', 'task'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['verification', 'cnp', 'cancel_call'];
const EMPTY = { title: '', description: '', type: 'task', lead: '', assignedTo: '', dueDate: '', priority: 'medium', reminderAt: '', cityVillageType: 'city', cityVillage: '', houseNo: '', postOffice: '', district: '', landmark: '', pincode: '', state: '', status: 'pending' };

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

const TYPE_SVG = {
  call:      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  follow_up: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>,
  meeting:   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  email:     <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  task:      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
};
const STATUS_STYLE = {
  overdue:   { bar: 'bg-red-400',    bg: 'bg-red-50',    dot: 'bg-red-400' },
  completed: { bar: 'bg-green-400',  bg: 'bg-green-50',  dot: 'bg-green-400' },
  pending:   { bar: 'bg-amber-400',  bg: 'bg-amber-50',  dot: 'bg-amber-400' },
  cancelled: { bar: 'bg-gray-300',   bg: 'bg-gray-50',   dot: 'bg-gray-300' },
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [daily, setDaily] = useState([]);
  const [leads, setLeads] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [tab, setTab] = useState('all');
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      const [all, day] = await Promise.all([getTasks(params), getDailyTasks()]);
      setTasks(Array.isArray(all) ? all : []);
      setDaily(Array.isArray(day) ? day : []);
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Failed to load tasks');
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // All roles need leads list (sales sees their own leads via backend filter)
    getLeads({ limit: 200 }).then(r => setLeads(r.leads || [])).catch(() => {});
    if (canManage) {
      getUsers({ role: 'sales' }).then(r => setSalesUsers(r.results || [])).catch(() => {});
    }
  }, [canManage]);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit = (task) => {
    setSelected(task);
    setForm({ title: task.title, description: task.description || '', type: task.type,
      lead: task.lead?._id || '', assignedTo: task.assignedTo?._id || '',
      dueDate: task.dueDate?.slice(0, 16) || '', priority: task.priority,
      reminderAt: task.reminderAt?.slice(0, 16) || '',
      cityVillageType: task.cityVillageType || 'city', cityVillage: task.cityVillage || '', houseNo: task.houseNo || '',
      postOffice: task.postOffice || '', district: task.district || '',
      landmark: task.landmark || '', pincode: task.pincode || '', state: task.state || '',
      status: task.status || 'pending' });
    setError(''); setModal('edit');
  };

  const openDetail = async (task) => {
    setSelected(task);
    setModal('detail');
    try {
      const res = await API.get(`/tasks/${task._id}`);
      setSelected(res.data.data);
    } catch { /* use list data */ }
  };

  const [noteText, setNoteText] = useState('');

  const handleAddNote = async () => {
    if (!noteText.trim() || !selected) return;
    try {
      const updated = await addTaskNote(selected._id, noteText.trim());
      setSelected(updated);
      setNoteText('');
      load();
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.lead) delete payload.lead;
      if (!payload.assignedTo) delete payload.assignedTo;
      if (!payload.reminderAt) delete payload.reminderAt;
      if (modal === 'edit') await updateTask(selected._id, payload);
      else await createTask(payload);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleComplete = async (id) => { await updateTask(id, { status: 'completed' }).catch(() => {}); load(); };
  const handleLeadStatus = async (leadId, status) => { await updateLead(leadId, { status }).catch(() => {}); load(); };
  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(id).catch(() => {}); load();
  };

  const displayed = tab === 'daily' ? daily : tasks;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Tasks & Follow-ups</h2>
        </div>
        <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <span className="text-base leading-none">+</span> Add Task
          </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['all', 'All Tasks'], ['daily', "Today"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            {key === 'daily' && daily.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded-full font-bold">{daily.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === 'all' && (
        <div className="flex justify-end">
          <select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
            className="w-fit border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm">
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      )}

      {loadError && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{loadError}</div>}

      {/* Task List */}
      <div className="space-y-2">
        {displayed.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
            <p className="text-gray-400 text-sm">No tasks found</p>
          </div>
        )}
        {displayed.map(task => {
          const s = STATUS_STYLE[task.status] || STATUS_STYLE.pending;
          return (
            <div key={task._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className={`h-1 ${s.bar}`} />
              <div className="px-4 py-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  {TYPE_SVG[task.type] || TYPE_SVG.task}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm text-gray-800 ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                    </span>
                    <Badge value={task.status} />
                    <Badge value={task.priority} />
                  </div>

                </div>
                <div className="flex flex-row gap-1 shrink-0 items-center">
                  <button onClick={() => openDetail(task)}
                    className="text-xs font-semibold px-2 py-1.5 rounded-xl text-white transition"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>View</button>
                  {task.status === 'pending' && (
                    <button onClick={() => handleComplete(task._id)}
                      className="text-xs font-medium px-2 py-1.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition">✓</button>
                  )}
                  <button onClick={() => openEdit(task)}
                    className="text-xs font-medium px-2 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Edit</button>
                  {canManage && (
                    <button onClick={() => handleDelete(task._id)}
                      className="text-xs font-medium px-2 py-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition">Del</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {modal === 'detail' && selected && (
        <Modal title="" onClose={() => setModal(null)}>
          {/* Header */}
          <div className="-mx-6 -mt-5 mb-5 px-6 py-5 rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                selected.status === 'overdue' ? 'bg-red-500' :
                selected.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'
              }`}>
                <span className="text-white">{TYPE_SVG[selected.type] || TYPE_SVG.task}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-white font-bold text-base tracking-tight ${selected.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                  {selected.title}
                </h3>
                <div className="flex gap-2 mt-1">
                  <Badge value={selected.status} />
                  <Badge value={selected.priority} />
                </div>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-0">
            {[
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Due Date', value: new Date(selected.dueDate).toLocaleString() },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, label: 'Type', value: selected.type?.replace(/_/g, ' ') },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Assigned To', value: selected.assignedTo?.name },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Lead', value: selected.lead?.name },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'Description', value: selected.description },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: selected.cityVillageType === 'village' ? 'Village' : 'City', value: selected.cityVillage },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'House No', value: selected.houseNo },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Post Office', value: selected.postOffice },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'District', value: selected.district },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Landmark', value: selected.landmark },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Pincode', value: selected.pincode },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: 'Reminder', value: selected.reminderAt ? new Date(selected.reminderAt).toLocaleString() : null },
            ].filter(f => f.value).map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800 font-medium capitalize">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {selected.status === 'pending' && (
            <button onClick={() => { handleComplete(selected._id); setModal(null); }}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              Mark as Complete
            </button>
          )}

          {/* Notes */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notes</p>
            {selected.notes?.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...selected.notes].reverse().map((n, i) => (
                  <div key={i} className="rounded-xl px-3 py-2.5"
                    style={{ background: 'linear-gradient(135deg, #f0fdf4, #f7fef7)', border: '1px solid rgba(22,163,74,0.1)' }}>
                    <p className="text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No notes yet</p>
            )}
          </div>
        </Modal>
      )}

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit Task' : 'New Task'} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Row 1: Title + Confirmation Call Date */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
                <input required className={`${inputCls} mt-1.5`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmation Call Date</label>
                <input type="date" className={`${inputCls} mt-1.5`} value={form.reminderAt ? form.reminderAt.slice(0, 10) : ''} onChange={(e) => setForm({ ...form, reminderAt: e.target.value })} /></div>
            </div>

            {/* Description full width */}
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
              <textarea rows={2} className={`${inputCls} mt-1.5`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            {/* City/Village toggle + input */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City / Village</label>
              <div className="flex items-center gap-3 mt-1.5 mb-1.5">
                <span className={`text-xs font-semibold transition ${form.cityVillageType === 'city' ? 'text-green-600' : 'text-gray-400'}`}>City</span>
                <div onClick={() => setForm({ ...form, cityVillageType: form.cityVillageType === 'city' ? 'village' : 'city' })}
                  className="relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300"
                  style={{ background: form.cityVillageType === 'village' ? '#16a34a' : '#d1d5db' }}>
                  <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                    style={{ left: form.cityVillageType === 'village' ? '28px' : '4px' }} />
                </div>
                <span className={`text-xs font-semibold transition ${form.cityVillageType === 'village' ? 'text-green-600' : 'text-gray-400'}`}>Village</span>
              </div>
              <input className={`${inputCls}`} placeholder={`Enter ${form.cityVillageType} name`} value={form.cityVillage} onChange={(e) => setForm({ ...form, cityVillage: e.target.value })} />
            </div>

            {/* Row: House No + Post Office */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">House No</label>
                <input className={`${inputCls} mt-1.5`} placeholder="House No" value={form.houseNo} onChange={(e) => setForm({ ...form, houseNo: e.target.value })} /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Post Office</label>
                <input className={`${inputCls} mt-1.5`} placeholder="Post Office" value={form.postOffice} onChange={(e) => setForm({ ...form, postOffice: e.target.value })} /></div>
            </div>

            {/* Row: District + Landmark */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District</label>
                <input className={`${inputCls} mt-1.5`} placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Landmark</label>
                <input className={`${inputCls} mt-1.5`} placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} /></div>
            </div>

            {/* Pincode + State */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode</label>
                <input className={`${inputCls} mt-1.5`} placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
                <input className={`${inputCls} mt-1.5`} placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>

            {modal === 'edit' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <div className="flex gap-2 mt-1.5">
                  {STATUSES.map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm({ ...form, status: s })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        form.status === s
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-400'
                      }`}>
                      {s === 'cnp' ? 'CNP' : s === 'cancel_call' ? 'Cancel Call' : 'Verification'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes section — only in edit mode */}
            {modal === 'edit' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
                {selected?.notes?.length > 0 && (
                  <div className="mt-1.5 space-y-2 max-h-32 overflow-y-auto mb-2">
                    {[...selected.notes].reverse().map((n, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl px-3 py-2" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                        <p className="text-sm text-gray-700">{n.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-1.5">
                  <input placeholder="Add a note and press Enter..."
                    className={`${inputCls} flex-1`}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-md hover:shadow-lg transition"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Saving...' : modal === 'edit' ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
