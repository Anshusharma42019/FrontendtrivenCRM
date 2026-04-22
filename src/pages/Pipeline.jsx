import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLeads, updateLead, getCallAgains, updateCallAgain } from '../services/lead.service';
import { createTask, getCnpRecords, deleteCnpRecord } from '../services/task.service';
import API from '../api';

const TASK_EMPTY = { title: '', description: '', problem: '', dueDate: '', priority: 'medium', reminderAt: '', cityVillageType: 'city', cityVillage: '', houseNo: '', postOffice: '', district: '', landmark: '', pincode: '', state: '', age: '', weight: '', height: '', otherProblems: '', problemDuration: '' };
const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition";

function TaskModal({ lead, assignedTo, onClose }) {
  const [form, setForm] = useState({ ...TASK_EMPTY, lead: lead?._id || '', assignedTo: assignedTo || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form, type: 'task', status: 'pending' };
      if (!payload.assignedTo) delete payload.assignedTo;
      if (!payload.reminderAt) delete payload.reminderAt;
      await createTask(payload);
      onClose();
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">New Task — {lead?.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</label>
              <input required className={`${inputCls} mt-1.5`} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmation Call Date</label>
              <input type="date" className={`${inputCls} mt-1.5`} value={form.reminderAt} onChange={e => setForm({ ...form, reminderAt: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problem</label>
            <textarea rows={2} className={`${inputCls} mt-1.5`} value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea rows={2} className={`${inputCls} mt-1.5`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</label>
              <input type="number" min="0" className={`${inputCls} mt-1.5`} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight (kg)</label>
              <input type="number" min="0" className={`${inputCls} mt-1.5`} value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height (ft)</label>
              <input type="number" min="0" step="0.1" className={`${inputCls} mt-1.5`} value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Problems</label>
            <textarea rows={2} className={`${inputCls} mt-1.5`} value={form.otherProblems} onChange={e => setForm({ ...form, otherProblems: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problem Duration</label>
            <input className={`${inputCls} mt-1.5`} placeholder="e.g. 2 years" value={form.problemDuration} onChange={e => setForm({ ...form, problemDuration: e.target.value })} /></div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City / Village</label>
            <div className="flex items-center gap-3 mt-1.5 mb-1.5">
              <span className={`text-xs font-semibold ${form.cityVillageType === 'city' ? 'text-green-600' : 'text-gray-400'}`}>City</span>
              <div onClick={() => setForm({ ...form, cityVillageType: form.cityVillageType === 'city' ? 'village' : 'city' })}
                className="relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300"
                style={{ background: form.cityVillageType === 'village' ? '#16a34a' : '#d1d5db' }}>
                <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                  style={{ left: form.cityVillageType === 'village' ? '28px' : '4px' }} />
              </div>
              <span className={`text-xs font-semibold ${form.cityVillageType === 'village' ? 'text-green-600' : 'text-gray-400'}`}>Village</span>
            </div>
            <input className={inputCls} placeholder={`Enter ${form.cityVillageType} name`} value={form.cityVillage} onChange={e => setForm({ ...form, cityVillage: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">House No</label>
              <input className={`${inputCls} mt-1.5`} value={form.houseNo} onChange={e => setForm({ ...form, houseNo: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Post Office</label>
              <input className={`${inputCls} mt-1.5`} value={form.postOffice} onChange={e => setForm({ ...form, postOffice: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District</label>
              <input className={`${inputCls} mt-1.5`} value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Landmark</label>
              <input className={`${inputCls} mt-1.5`} value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode</label>
              <input className={`${inputCls} mt-1.5`} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
              <input className={`${inputCls} mt-1.5`} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-md transition"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              {loading ? 'Saving...' : 'Create Task'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STAGES = [
  { key: 'new',         label: 'New',         bar: 'bg-blue-500' },
  { key: 'contacted',   label: 'Contacted',   bar: 'bg-amber-500' },
  { key: 'interested',  label: 'Interested',  bar: 'bg-purple-500' },
  { key: 'follow_up',   label: 'Follow Up',   bar: 'bg-orange-500' },
  { key: 'closed_won',  label: 'Closed Won',  bar: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', bar: 'bg-red-400' },
  { key: 'on_hold',     label: 'On Hold',     bar: 'bg-gray-400' },
];

function FollowUpPanel({ lead, onUpdate }) {
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState(
    lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);
  const followUps = lead.follow_ups || [];

  const add = async () => {
    if (!note.trim() && !nextDate) return;
    setSaving(true);
    try {
      const res = await API.post(`/leads/${lead._id}/follow-up`, { note, next_date: nextDate || undefined });
      onUpdate(lead._id, res.data.data);
      setNote('');
    } finally { setSaving(false); }
  };

  const setDate = async (date) => {
    setNextDate(date);
    const res = await API.patch(`/leads/${lead._id}/next-follow-up`, { next_follow_up: date || null });
    onUpdate(lead._id, res.data.data);
  };

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Follow Up</span>
        {followUps.length > 0 && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{followUps.length}</span>
        )}
        {lead.next_follow_up && (
          <span className="text-xs text-orange-600 font-semibold ml-auto">
            Next: {new Date(lead.next_follow_up).toLocaleDateString('en-IN')}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        <input type="date" value={nextDate} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white" />
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Note…"
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white flex-1 min-w-32" />
        <button onClick={add} disabled={saving || (!note.trim() && !nextDate)}
          className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-40">
          {saving ? '…' : '+ Add'}
        </button>
      </div>
      {followUps.length > 0 && (
        <div className="space-y-0.5 max-h-20 overflow-auto">
          {[...followUps].reverse().slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-gray-400 whitespace-nowrap shrink-0">{new Date(f.date).toLocaleDateString('en-IN')}</span>
              <span className="text-gray-600 truncate">{f.note || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [closedLostLeads, setClosedLostLeads] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [cnpLeads, setCnpLeads] = useState([]);
  const [callAgainLeads, setCallAgainLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [detailVerification, setDetailVerification] = useState(null);
  const [taskModal, setTaskModal] = useState(null); // { lead, assignedTo }
  const [leadDetail, setLeadDetail] = useState(null); // for CNP/CallAgain detail popup
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');

  const openLeadDetail = async (lead) => {
    const leadId = lead?._id || lead?.id || lead;
    if (!leadId) return;
    setLeadDetail(typeof lead === 'object' ? lead : { _id: leadId });
    setLeadDetailLoading(true);
    try {
      const res = await API.get(`/leads/${leadId}`);
      setLeadDetail(res.data.data);
    } catch { /* keep partial data */ }
    finally { setLeadDetailLoading(false); }
  };
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
      const [leadsRes, interestedRes, closedLostRes, ordersRes, cnpRes, callAgainRes] = await Promise.all([
        getLeads({ limit: 200 }),
        getLeads({ limit: 200, status: 'interested' }),
        getLeads({ limit: 200, status: 'closed_lost' }),
        API.get('/shiprocket/orders/with-followups'),
        getCnpRecords(),
        getCallAgains(),
      ]);
      const allLeads = [
        ...(Array.isArray(leadsRes?.leads) ? leadsRes.leads : []),
        ...(Array.isArray(interestedRes?.leads) ? interestedRes.leads : []),
      ];
      setLeads(allLeads);
      setClosedLostLeads(Array.isArray(closedLostRes?.leads) ? closedLostRes.leads : []);
      setDeliveredOrders(Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : []);
      setCnpLeads(Array.isArray(cnpRes) ? cnpRes : []);
      setCallAgainLeads(Array.isArray(callAgainRes) ? callAgainRes : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byStage = (stage) => {
    if (stage === 'closed_lost') return closedLostLeads;
    return leads.filter(l => l.status === stage);
  };

  const openDetail = async (lead) => {
    setDetailLead(lead);
    setDetailVerification(null);
    try {
      const res = await API.get('/verification');
      const records = res.data.data || [];
      const rec = records.find(r => r.lead?._id === lead._id || r.lead === lead._id);
      setDetailVerification(rec || null);
    } catch { }
  };

  const handleCallAgainStatus = async (record, status) => {
    setUpdating(record._id);
    try { await updateCallAgain(record._id, { status }); load(); }
    catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const handleMove = async (lead, newStage) => {
    setUpdating(lead._id);
    try {
      await updateLead(lead._id, { status: newStage });
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: newStage } : l));
    } catch { load(); }
    finally { setUpdating(null); }
  };

  const [doneLoading, setDoneLoading] = useState(null);
  const [completedMap, setCompletedMap] = useState({}); // orderId → completedCount

  const handleFollowUpDone = async (orderId) => {
    const oid = String(orderId);
    setDoneLoading(oid);
    try {
      const res = await API.post(`/shiprocket/orders/${oid}/complete-followup`);
      console.log('[FollowUp] response:', res.data);
      const { next_follow_up, completedCount } = res.data.data;
      setCompletedMap(prev => ({ ...prev, [oid]: completedCount }));
      setDeliveredOrders(prev => prev.map(o => {
        if (String(o._id) !== oid) return o;
        if (completedCount >= 5 && !next_follow_up) return null;
        const updatedFUs = (o.followups || []).map(f =>
          f.followup_number === completedCount ? { ...f, completed: true } : f
        );
        return { ...o, next_follow_up, followups: updatedFUs };
      }).filter(Boolean));
    } catch(err) {
      console.error('[FollowUp] error:', err.response?.data || err.message);
    } finally { setDoneLoading(null); }
  };

  const handleFollowUpUpdate = (id, updated) => {
    setLeads(prev => prev.map(l => l._id === id ? { ...l, ...updated } : l));
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
        <input
          type="text"
          placeholder="Search by phone..."
          value={phoneSearch}
          onChange={e => setPhoneSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 w-48"
        />
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'on_hold',     label: 'On Hold',        color: 'bg-gray-500' },
            { key: 'interested',  label: 'Interested',     color: 'bg-purple-500' },
            { key: 'closed_lost', label: 'Not Interested', color: 'bg-red-400' },
            { key: 'cnp',         label: 'CNP',            color: 'bg-red-600' },
            { key: 'call_again',  label: 'Call Again',     color: 'bg-amber-500' },
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
        ) : filter === 'cnp' ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-red-500" />
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 text-sm">CNP Leads</h3>
              <span className="text-xs text-gray-400">{cnpLeads.length} lead{cnpLeads.length !== 1 ? 's' : ''}</span>
            </div>
            {cnpLeads.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No CNP leads</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cnpLeads.filter(r => !phoneSearch || r.lead?.phone?.includes(phoneSearch)).map(record => (
                  <div key={record._id} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-red-50/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white bg-gradient-to-br from-red-400 to-red-600">{record.lead?.name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{record.lead?.name || record.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{record.lead?.phone}</p>
                          {record.assignedTo && <p className="text-xs text-green-600">{record.assignedTo.name}</p>}
                          <span className="text-xs text-red-500 font-semibold">{record.cnpCount || 1}/3 CNP</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => openLeadDetail(record.lead)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>View Detail</button>
                      <button onClick={async () => {
                        navigate('/tasks', { state: { leadId: record.lead?._id, assignedTo: record.assignedTo?._id || '', leadName: record.lead?.name, leadPhone: record.lead?.phone, leadData: record.lead, cnpId: record._id } });
                      }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition">+ Task</button>
                      <button disabled={updating === record._id} onClick={async () => {
                        setUpdating(record._id);
                        try {
                          await updateLead(record.lead._id, { status: 'interested', cnp: false });
                          await deleteCnpRecord(record._id).catch(() => {});
                          setFilter('interested');
                          load();
                        } catch { load(); }
                        finally { setUpdating(null); }
                      }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 transition disabled:opacity-40">Interested</button>
                      <button disabled={updating === record._id} onClick={async () => {
                        setUpdating(record._id);
                        try {
                          await updateLead(record.lead._id, { status: 'closed_lost', cnp: false });
                          await deleteCnpRecord(record._id).catch(() => {});
                          setFilter('closed_lost');
                          load();
                        } catch { load(); }
                        finally { setUpdating(null); }
                      }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 transition disabled:opacity-40">Not Interested</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filter === 'call_again' ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-amber-500" />
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 text-sm">Call Again Leads</h3>
              <span className="text-xs text-gray-400">{callAgainLeads.length} lead{callAgainLeads.length !== 1 ? 's' : ''}</span>
            </div>
            {callAgainLeads.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No call again leads</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {callAgainLeads.filter(r => !phoneSearch || r.lead?.phone?.includes(phoneSearch)).map(record => (
                  <div key={record._id} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-amber-50/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white bg-gradient-to-br from-amber-400 to-amber-600">{record.lead?.name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{record.lead?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{record.lead?.phone}</p>
                          {record.assignedTo && <p className="text-xs text-green-600">{record.assignedTo.name}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => openLeadDetail(record.lead)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>View Detail</button>
                      <button disabled={updating === record._id} onClick={async () => {
                        const lead = record.lead;
                        await updateCallAgain(record._id, { status: 'contacted' }).catch(() => {});
                        navigate('/tasks', { state: { leadId: lead?._id, assignedTo: record.assignedTo?._id || '', leadName: lead?.name, leadPhone: lead?.phone, leadData: lead } });
                      }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition">+ Task</button>
                      <button disabled={updating === record._id} onClick={() => handleCallAgainStatus(record, 'interested')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 transition disabled:opacity-40">Interested</button>
                      <button disabled={updating === record._id} onClick={async () => {
                        setUpdating(record._id);
                        try {
                          await updateCallAgain(record._id, { status: 'closed_lost' });
                          if (record.lead?._id) await updateLead(record.lead._id, { status: 'closed_lost' });
                          setFilter('closed_lost');
                          load();
                        } catch { load(); }
                        finally { setUpdating(null); }
                      }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 transition disabled:opacity-40">Not Interested</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {STAGES.map(({ key, label, bar }) => {
              if (key !== filter) return null;
              const stageLeads = byStage(key);
              const showDelivered = key === 'follow_up' && deliveredOrders.length > 0;
              if (stageLeads.length === 0 && !showDelivered) return (
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
                    {showDelivered && deliveredOrders.map(o => {
                      const oid = String(o._id);
                      const allFUs = (o.followups || []).sort((a, b) => a.followup_number - b.followup_number);
                      const completed = completedMap[oid] ?? allFUs.filter(f => f.completed).length;
                      const activeIdx = completed;
                      const activeFU = allFUs[activeIdx];
                      const product = o.order_items?.[0];
                      const ordinal = n => ['1st','2nd','3rd','4th','5th'][n] || `${n+1}th`;
                      const allDone = completed >= 5;
                      const displayFUs = allFUs.length > 0 ? allFUs : Array.from({ length: 5 }, (_, i) => ({
                        followup_number: i + 1, scheduled_date: new Date(o.delivered_at || o.createdAt || new Date()), completed: false,
                      }));
                      return (
                        <div key={o._id} className="px-4 py-3.5 hover:bg-orange-50/30 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white"
                              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                              {(o.billing_customer_name || '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800 text-sm">{o.billing_customer_name || '—'}</p>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">DELIVERED</span>
                                {!allDone && activeFU && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
                                    {ordinal(activeIdx)} Follow-up Due
                                  </span>
                                )}
                                {allDone && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">✓ All Done</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <p className="text-xs text-gray-400">{o.billing_phone || '—'}</p>
                                <p className="text-xs text-gray-400">{o.billing_city || '—'}</p>
                                {product && <p className="text-xs text-gray-500">{product.name} ×{product.units || 1}</p>}
                                <p className="text-xs font-semibold text-gray-700">₹{o.sub_total || '—'}</p>
                                {o.awb_code && <p className="text-xs font-mono text-blue-500">{o.awb_code}</p>}
                                {o.delivered_at && (
                                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/></svg>
                                    {new Date(o.delivered_at).toLocaleDateString('en-IN')}
                                  </p>
                                )}
                                {!allDone && activeFU && (
                                  <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                    Next: {new Date(activeFU.scheduled_date).toLocaleDateString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              {activeFU && !allDone && (
                                <p className="text-xs font-semibold text-orange-600">
                                  {ordinal(activeIdx)}: {new Date(activeFU.scheduled_date).toLocaleDateString('en-IN')}
                                </p>
                              )}
                              {allFUs[activeIdx + 1] && !allDone && (
                                <p className="text-xs text-blue-500">
                                  Next: {new Date(allFUs[activeIdx + 1].scheduled_date).toLocaleDateString('en-IN')}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Follow-up steps */}
                          <div className="mt-2 pt-2 border-t border-orange-50 flex items-center gap-2 flex-wrap">
                            {displayFUs.map((fu, i) => {
                              const isDone = i < completed;
                              const isActive = i === activeIdx && !allDone;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isActive && doneLoading !== oid) handleFollowUpDone(oid);
                                  }}
                                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                                    isDone
                                      ? 'bg-gray-100 text-gray-400 line-through'
                                      : isActive
                                      ? 'text-white'
                                      : 'bg-gray-50 text-gray-300 border border-gray-100'
                                  }`}
                                  style={isActive ? { background: 'linear-gradient(135deg, #16a34a, #15803d)', cursor: 'pointer' } : { cursor: 'default' }}
                                >
                                  {isDone ? `✓ ${ordinal(i)}` : doneLoading === oid && isActive ? '…' : `${ordinal(i)} Follow-up`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {stageLeads.filter(l => !phoneSearch || l.phone?.includes(phoneSearch)).map(lead => (
                      <div key={lead._id} className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                        {/* Lead info + action buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
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
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {key === 'on_hold' ? (
                              <>
                                <button onClick={() => openDetail(lead)}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all"
                                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                                  View Detail
                                </button>
                                <button
                                  onClick={() => navigate('/tasks', { state: { leadId: lead._id, assignedTo: lead.assignedTo?._id || '', leadName: lead.name, leadPhone: lead.phone, leadData: lead, afterCreateStatus: 'interested' } })}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-all">
                                  + Task
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'interested')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                  Verification
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'closed_lost')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                  Not Interested
                                </button>
                              </>
                            ) : key === 'interested' ? (
                              <>
                                <button
                                  onClick={() => navigate('/tasks', { state: { leadId: lead._id, assignedTo: lead.assignedTo?._id || '', leadName: lead.name, leadPhone: lead.phone, leadData: lead, afterCreateStatus: 'on_hold' } })}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-all">
                                  + Task
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'on_hold')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                                  On Hold
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={async () => {
                                    setUpdating(lead._id);
                                    try {
                                      const { getTasks, updateTask } = await import('../services/task.service');
                                      const tasks = await getTasks({ lead: lead._id, status: 'interested' });
                                      const task = Array.isArray(tasks) ? tasks[0] : null;
                                      if (task) await updateTask(task._id, { status: 'verification' });
                                      navigate('/verification');
                                    } catch { navigate('/verification'); }
                                    finally { setUpdating(null); }
                                  }}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                  Verification
                                </button>
                                <button disabled={updating === lead._id}
                                  onClick={() => handleMove(lead, 'closed_lost')}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all disabled:opacity-40"
                                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                  Not Interested
                                </button>
                              </>
                            ) : (
                              <>
                                {key !== 'closed_lost' && (
                                  <button disabled={updating === lead._id}
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
                        {/* Follow Up Panel */}
                        <FollowUpPanel lead={lead} onUpdate={handleFollowUpUpdate} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {taskModal && (
        <TaskModal lead={taskModal.lead} assignedTo={taskModal.assignedTo} onClose={() => setTaskModal(null)} />
      )}

      {leadDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLeadDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="-mx-0 rounded-t-2xl px-6 py-5" style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white uppercase shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
                  {leadDetail.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base">{leadDetail.name}</h3>
                  <p className="text-green-300/70 text-sm">{leadDetail.phone}</p>
                </div>
                <button onClick={() => setLeadDetail(null)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-0">
              {leadDetailLoading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : (
                <>
                  {[['Email', leadDetail.email], ['Phone', leadDetail.phone], ['Address', leadDetail.address],
                    ['Source', leadDetail.source], ['Status', leadDetail.status?.replace(/_/g,' ')],
                    ['Type', leadDetail.type], ['Problem', leadDetail.problem],
                    ['Revenue', leadDetail.revenue ? `₹${leadDetail.revenue}` : null],
                    ['Assigned To', leadDetail.assignedTo?.name],
                    ['Created By', leadDetail.createdBy?.name],
                    ['CNP Count', leadDetail.cnpCount > 0 ? leadDetail.cnpCount : null],
                    ['CNP At', leadDetail.cnpAt ? new Date(leadDetail.cnpAt).toLocaleString() : null],
                    ['Created', leadDetail.createdAt ? new Date(leadDetail.createdAt).toLocaleDateString('en-IN') : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">{label}</p>
                      <p className="text-sm text-gray-800 font-medium">{value}</p>
                    </div>
                  ))}

                  {/* Note */}
                  {leadDetail.note && (
                    <div className="flex gap-3 py-2.5 border-b border-gray-50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">Note</p>
                      <p className="text-sm text-gray-800">{leadDetail.note}</p>
                    </div>
                  )}

                  {/* Notes history */}
                  {leadDetail.notes?.length > 0 && (
                    <div className="pt-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notes History</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {[...leadDetail.notes].reverse().map((n, i) => (
                          <div key={i} className="rounded-xl px-3 py-2.5"
                            style={{ background: 'linear-gradient(135deg, #f0fdf4, #f7fef7)', border: '1px solid rgba(22,163,74,0.1)' }}>
                            <p className="text-sm text-gray-700">{n.text}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
