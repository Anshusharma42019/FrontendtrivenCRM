import { useEffect, useState, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getStaffShipmentCounts } from '../services/user.service';
import API from '../api';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

const ROLES = ['manager', 'sales'];
const EMPTY = { name: '', phone: '', password: '', role: 'manager' };

const ROLE_GRADIENT = {
  admin:   'from-purple-500 to-violet-600',
  manager: 'from-blue-500 to-cyan-500',
  sales:   'from-green-500 to-emerald-500',
};

export default function Users() {
  const [data, setData] = useState({ results: [], totalResults: 0 });
  const [shipmentCounts, setShipmentCounts] = useState({});
  const [viewUser, setViewUser] = useState(null);
  const [viewTasks, setViewTasks] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    getUsers().then(res => setData(res)).catch(() => {});
    // Load shipment counts by fetching all ready_to_shipment tasks and grouping by assignedTo
    API.get('/tasks', { params: { status: 'ready_to_shipment' } })
      .then(res => {
        const tasks = Array.isArray(res.data.data) ? res.data.data : [];
        const counts = tasks.reduce((acc, t) => {
          const id = t.assignedTo?._id || t.assignedTo;
          if (id) acc[String(id)] = (acc[String(id)] || 0) + 1;
          return acc;
        }, {});
        setShipmentCounts(counts);
      }).catch(() => {
        getStaffShipmentCounts().then(counts => setShipmentCounts(counts || {})).catch(() => {});
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openView = async (u) => {
    setViewUser(u); setViewTasks([]); setViewLoading(true); setModal('view');
    try {
      // Try dedicated endpoint first, fallback to tasks endpoint
      let tasks = [];
      try {
        const res = await API.get(`/ready-to-shipment/by-user/${u._id}`);
        tasks = res.data.data || [];
      } catch {
        const res = await API.get('/tasks', { params: { status: 'ready_to_shipment', assignedTo: u._id } });
        tasks = Array.isArray(res.data.data) ? res.data.data : [];
      }
      setViewTasks(tasks);
    } catch (e) {
      console.error('shipment fetch error:', e.response?.data || e.message);
    } finally {
      setViewLoading(false);
    }
  };

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit = (u) => {
    setSelected(u);
    setForm({ name: u.name, phone: u.phone || '', password: '', role: u.role });
    setError(''); setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (modal === 'edit' && !payload.password) delete payload.password;
      if (modal === 'edit') await updateUser(selected._id, payload);
      else await createUser(payload);
      setModal(null); load();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    await deleteUser(id).catch(() => {});
    load();
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Staff</h2>
          <p className="text-sm text-gray-400 mt-0.5">{data.totalResults} team members</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <span className="text-base leading-none">+</span> Add User
        </button>
      </div>

      {/* Cards */}
      {data.results?.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="text-gray-400 text-sm">No staff members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {data.results?.map(u => (
            <div key={u._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
              {/* Top gradient strip */}
              <div className={`h-1.5 bg-gradient-to-r ${ROLE_GRADIENT[u.role] || 'from-gray-300 to-gray-400'}`} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ROLE_GRADIENT[u.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-lg font-bold shadow-sm uppercase`}>
                    {u.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-sm">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.phone || u.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <Badge value={u.role} />
                  <span className="text-xs text-gray-300">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                {shipmentCounts[u._id] > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-xl bg-green-50 border border-green-100">
                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="text-xs font-semibold text-green-700">{shipmentCounts[u._id]} Ready to Shipment</span>
                  </div>
                )}
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => openView(u)}
                    className="flex-1 text-xs font-semibold text-white py-2 rounded-xl transition"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    View
                  </button>
                  <button onClick={() => openEdit(u)}
                    className="flex-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-xl transition">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(u._id)}
                    className="flex-1 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 py-2 rounded-xl transition">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Shipment Tasks Modal */}
      {modal === 'view' && viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            {/* Dark header with close button */}
            <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ROLE_GRADIENT[viewUser.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-lg font-bold shadow-lg uppercase`}>
                  {viewUser.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-base">{viewUser.name}</p>
                  <p className="text-green-300 text-xs mt-0.5">{viewUser.phone || viewUser.email}</p>
                </div>
                <button onClick={() => setModal(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-green-300 hover:text-white hover:bg-white/10 transition text-xl leading-none">
                  ×
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-96 overflow-y-auto">
              {viewLoading ? (
                <div className="space-y-2">
                  {[1,2].map(i => (
                    <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="h-1 bg-green-200" />
                      <div className="px-4 py-3">
                        <div className="flex justify-between mb-2"><div className="h-3 w-32 bg-gray-200 rounded-full" /><div className="h-4 w-12 bg-gray-100 rounded-full" /></div>
                        <div className="h-2.5 w-24 bg-gray-100 rounded-full mb-1.5" />
                        <div className="h-2.5 w-40 bg-gray-100 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No ready to shipment tasks</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {viewTasks.map((t, i) => (
                    <div key={t._id || i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                      <div className="px-4 py-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            t.priority === 'high' ? 'bg-red-50 text-red-500' :
                            t.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>{t.priority}</span>
                        </div>
                        {t.lead?.name && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span className="text-xs text-gray-500">{t.lead.name}</span>
                            {t.lead.phone && <span className="text-xs text-gray-400"> · {t.lead.phone}</span>}
                          </div>
                        )}
                        {(t.cityVillage || t.district) && (
                          <div className="flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span className="text-xs text-gray-400">{[t.houseNo, t.cityVillage, t.district, t.state, t.pincode].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit User' : 'Add New User'} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</label>
              <input required className={`${inputCls} mt-1.5`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone *</label>
              <input required type="tel" className={`${inputCls} mt-1.5`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {modal === 'edit' ? 'New Password (leave blank to keep)' : 'Password *'}
              </label>
              <input type="password" required={modal === 'create'} minLength={8} className={`${inputCls} mt-1.5`}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</label>
              <select className={`${inputCls} mt-1.5`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Saving...' : modal === 'edit' ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
