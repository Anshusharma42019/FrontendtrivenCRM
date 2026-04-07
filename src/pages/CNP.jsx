import { useEffect, useState, useCallback } from 'react';
import { getLeads, updateLead, markCNP, unmarkCNP } from '../services/lead.service';
import { getCnpRecords, incrementCnpCount, updateTask } from '../services/task.service';

export default function CNP() {
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [cnpTasks, setCnpTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [tab, setTab] = useState('tasks');

  const load = useCallback(async () => {
    try {
      const [cnpRes, allRes, tasksRes] = await Promise.all([
        getLeads({ cnp: 'true', limit: 200 }),
        getLeads({ limit: 200 }),
        getCnpRecords(),
      ]);
      setLeads(Array.isArray(cnpRes?.leads) ? cnpRes.leads : []);
      setAllLeads(Array.isArray(allRes?.leads) ? allRes.leads : []);
      setCnpTasks(Array.isArray(tasksRes) ? tasksRes : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkCNP = async (lead) => {
    setUpdating(lead._id);
    try { await markCNP(lead._id); load(); } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const handleUnmarkCNP = async (lead) => {
    setUpdating(lead._id);
    try { await unmarkCNP(lead._id); load(); } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const handleStatusChange = async (lead, status) => {
    setUpdating(lead._id);
    try { await updateLead(lead._id, { status, cnp: false }); load(); } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const handleIncrementCnp = async (id) => {
    setUpdating(id);
    try {
      const updated = await incrementCnpCount(id);
      setCnpTasks(prev => prev.map(t => t._id === id ? { ...t, cnpCount: updated.cnpCount, lastCnpAt: updated.lastCnpAt } : t));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const displayed = tab === 'cnp' ? leads : allLeads.filter(l => !l.cnp);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">CNP</h2>
          <p className="text-sm text-gray-400 mt-0.5">Call Not Picked</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setTab('tasks')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${tab === 'tasks' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            CNP Tasks <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">{cnpTasks.length}</span>
          </button>
          <button onClick={() => setTab('cnp')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${tab === 'cnp' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            CNP Leads <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">{leads.length}</span>
          </button>
          <button onClick={() => setTab('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${tab === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            Mark CNP
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-red-400" />
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">
            {tab === 'tasks' ? 'CNP Tasks' : tab === 'cnp' ? 'Call Not Picked Leads' : 'All Leads — Mark as CNP'}
          </h3>
          <p className="text-xs text-gray-400">
            {tab === 'tasks' ? cnpTasks.length : displayed.length} {tab === 'tasks' ? 'task' : 'lead'}{(tab === 'tasks' ? cnpTasks.length : displayed.length) !== 1 ? 's' : ''}
          </p>
        </div>

        {tab === 'tasks' ? (
          cnpTasks.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">No CNP tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cnpTasks.map(task => (
                <div key={task._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-red-500 font-bold text-sm">C</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{task.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {task.assignedTo && <p className="text-xs text-green-600">{task.assignedTo.name}</p>}
                      {task.lead && <p className="text-xs text-gray-400">{task.lead.name} — {task.lead.phone}</p>}
                      {task.lastCnpAt && <p className="text-xs text-gray-400">Last: {new Date(task.lastCnpAt).toLocaleDateString()}</p>}
                    </div>
                    {task.address && <p className="text-xs text-gray-400 mt-0.5">{task.address}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.lead && (
                      <select
                        disabled={updating === task._id}
                        value={task.lead.status || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setUpdating(task._id);
                          try {
                            await updateLead(task.lead._id, { status: val });
                            if (val === 'closed_won') {
                              const taskId = task.task?._id || task.task;
                              if (taskId) await updateTask(taskId, { status: 'verification' });
                            }
                            load();
                          } catch { /* ignore */ }
                          finally { setUpdating(null); }
                        }}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 transition disabled:opacity-50">
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="closed_won">Converted</option>
                        <option value="closed_lost">Lost</option>
                      </select>
                    )}
                    <button
                    disabled={updating === task._id || (task.cnpCount || 1) >= 3}
                    onClick={() => handleIncrementCnp(task._id)}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition disabled:opacity-40">
                    CNP
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                      {task.cnpCount || 1}
                    </span>
                  </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          displayed.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </div>
              <p className="text-gray-400 text-sm">{tab === 'cnp' ? 'No CNP leads' : 'No leads available'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {displayed.map(lead => (
                <div key={lead._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white ${lead.cnp ? 'bg-red-400' : 'bg-gradient-to-br from-green-500 to-green-700'}`}>
                    {lead.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                      {lead.cnpCount > 0 && (
                        <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-bold border border-red-100">
                          CNP ×{lead.cnpCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-gray-400">{lead.phone}</p>
                      {lead.assignedTo && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {lead.assignedTo.name}
                        </p>
                      )}
                      {lead.cnpAt && <p className="text-xs text-gray-400">{new Date(lead.cnpAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {tab === 'cnp' ? (
                      <>
                        <button disabled={updating === lead._id} onClick={() => handleStatusChange(lead, 'contacted')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-40">Contacted</button>
                        <button disabled={updating === lead._id} onClick={() => handleStatusChange(lead, 'interested')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition disabled:opacity-40">Interested</button>
                        <button disabled={updating === lead._id} onClick={() => handleUnmarkCNP(lead)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-40">Remove CNP</button>
                      </>
                    ) : (
                      <button disabled={updating === lead._id} onClick={() => handleMarkCNP(lead)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-40">Mark CNP</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
