import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeads, getLead, createLead, updateLead, deleteLead, assignLead, addLeadNote } from '../services/lead.service';
import { getUsers } from '../services/user.service';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

const STATUSES = ['new', 'contacted', 'follow_up', 'closed_won', 'closed_lost'];
const SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email', 'walk_in', 'other'];
const TYPES = ['general', 'ayurveda', 'panchakarma', 'consultation', 'product', 'other'];
const EMPTY = { name: '', phone: '', email: '', address: '', source: 'other', status: 'new', type: 'general', problem: '', note: '', revenue: '' };

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

export default function Leads() {
  const { user } = useAuth();
  const [data, setData] = useState({ leads: [], total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', status: '', page: 1 });
  const [salesUsers, setSalesUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [assignTo, setAssignTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const params = { page: filters.page, limit: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.status) params.status = filters.status;

      const res = await getLeads(params);
      setData(res ?? { leads: [], total: 0, totalPages: 1 });
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Failed to load leads');
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (canManage) getUsers({ role: 'sales' }).then(r => setSalesUsers(r.users || [])).catch(() => {});
  }, [canManage]);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal('create'); };
  const openEdit = (lead) => {
    setSelected(lead);
    setForm({ name: lead.name, phone: lead.phone, email: lead.email || '', address: lead.address || '',
      source: lead.source, status: lead.status, type: lead.type || 'general',
      problem: lead.problem || '', note: lead.note || '', revenue: lead.revenue || '' });
    setError(''); setModal('edit');
  };
  const openAssign = (lead) => { setSelected(lead); setAssignTo(lead.assignedTo?._id || ''); setModal('assign'); };
  const openDetail = async (lead) => {
    setError(''); setModal('detail');
    try {
      const full = await getLead(lead._id);
      setSelected(full);
      setForm({ name: full.name, phone: full.phone, email: full.email || '', address: full.address || '',
        source: full.source, status: full.status, type: full.type || 'general',
        problem: full.problem || '', note: '', revenue: full.revenue || '' });
    } catch {
      setSelected(lead);
      setForm({ name: lead.name, phone: lead.phone, email: lead.email || '', address: lead.address || '',
        source: lead.source, status: lead.status, type: lead.type || 'general',
        problem: lead.problem || '', note: '', revenue: lead.revenue || '' });
    }
  };
  const openAddNote = (lead) => { setSelected(lead); setForm({ note: '' }); setError(''); setModal('note'); };

  const handleSaveNote = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.note?.trim()) return;
    setLoading(true); setError('');
    try {
      const updated = await addLeadNote(selected._id, form.note.trim());
      setSelected(updated); setForm(f => ({ ...f, note: '' })); load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save note'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, revenue: form.revenue ? Number(form.revenue) : 0 };
      if (modal === 'edit' || modal === 'detail') await updateLead(selected._id, payload);
      else await createLead(payload);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await deleteLead(id).catch(() => {}); load();
  };

  const handleAssign = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await assignLead(selected._id, assignTo); setModal(null); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to assign'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    await updateLead(id, { status }).catch(() => {}); load();
  };

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            Leads <span className="text-base font-normal text-gray-400">({data.total})</span>
          </h2>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <span className="text-base leading-none">+</span> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input placeholder="Search name, phone, email..."
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 flex-1 shadow-sm"
          value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
        <input type="date" title="From date"
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
          value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} />
        <input type="date" title="To date"
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
          value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} />
        <div className="flex gap-2">
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>

        </div>
      </div>

      {loadError && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{loadError}</div>}

      {/* List */}
      <div className="space-y-2">
        {data.leads.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-gray-400 text-sm">No leads found</p>
          </div>
        )}
        {data.leads.map((lead, i) => (
          <div key={lead._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
            style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
            {/* colored left bar by status */}
            <div className="flex">
              <div className={`w-1 shrink-0 rounded-l-2xl ${
                lead.status === 'closed_won' ? 'bg-green-500' :
                lead.status === 'closed_lost' ? 'bg-red-400' :
                lead.status === 'interested' ? 'bg-purple-500' :
                lead.status === 'follow_up' ? 'bg-orange-400' :
                lead.status === 'contacted' ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              <div className="flex-1 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Left */}
                  <div className="flex gap-3 items-start flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      {lead.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                        <Badge value={lead.status} />
                      </div>
                      {lead.assignedTo && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {lead.assignedTo.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Right */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(lead)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>View</button>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Showing {data.leads.length} of {data.total} leads</span>
        {data.totalPages > 1 && (
          <div className="flex gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1.5 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 text-xs font-medium transition">← Prev</button>
            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-semibold">{filters.page} / {data.totalPages}</span>
            <button disabled={filters.page >= data.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1.5 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 text-xs font-medium transition">Next →</button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit Lead' : 'Add New Lead'} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</label>
                <input required className={`${inputCls} mt-1.5`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone *</label>
                <input required className={`${inputCls} mt-1.5`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problem / Inquiry</label>
              <textarea rows={2} className={`${inputCls} mt-1.5`} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Note</label>
              <textarea rows={2} className={`${inputCls} mt-1.5`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select className={`${inputCls} mt-1.5`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-md hover:shadow-lg transition"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Saving...' : modal === 'edit' ? 'Update Lead' : 'Create Lead'}
              </button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal - Premium */}
      {modal === 'detail' && selected && (
        <Modal title="" onClose={() => setModal(null)}>
          {/* Header banner */}
          <div className="-mx-6 -mt-5 mb-5 px-6 py-5 rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white uppercase shadow-lg"
                style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
                {selected.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg tracking-tight">{selected.name}</h3>
                <p className="text-green-300/70 text-sm">{selected.phone}</p>
              </div>
              <div className="ml-auto">
                <Badge value={selected.status} />
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-0">
            {[
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Address', value: selected.address },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, label: 'Problem', value: selected.problem },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Assigned To', value: selected.assignedTo?.name },
              { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'Note', value: selected.note },
            ].filter(f => f.value).map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800 font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Notes history */}
          {selected.notes?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notes History</p>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {[...selected.notes].reverse().map((n, i) => (
                  <div key={i} className="rounded-xl px-3 py-2.5"
                    style={{ background: 'linear-gradient(135deg, #f0fdf4, #f7fef7)', border: '1px solid rgba(22,163,74,0.1)' }}>
                    <p className="text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Add Note Modal */}
      {modal === 'note' && selected && (
        <Modal title={`Notes: ${selected.name}`} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
            {(selected.notes?.length > 0) ? [...(selected.notes ?? [])].reverse().map((n, i) => (
              <div key={i} className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-sm text-gray-700">{n.text}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            )) : <p className="text-xs text-gray-400 text-center py-4">No notes yet</p>}
          </div>
          <form onSubmit={handleSaveNote} className="space-y-3">
            <textarea rows={3} placeholder="Write a new note..." className={inputCls}
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-md transition"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Saving...' : 'Add Note'}
              </button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">Close</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Modal */}
      {modal === 'assign' && (
        <Modal title={`Assign: ${selected?.name}`} onClose={() => setModal(null)}>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}
          <form onSubmit={handleAssign} className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign To</label>
              <select required className={`${inputCls} mt-1.5`} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Select sales person</option>
                {salesUsers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select></div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-md transition"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Assigning...' : 'Assign'}
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
