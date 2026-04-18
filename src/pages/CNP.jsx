import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLeads,
  updateLead,
  markCNP,
  unmarkCNP,
} from "../services/lead.service";
import {
  getCnpRecords,
  incrementCnpCount,
  updateTask,
  deleteCnpRecord,
} from "../services/task.service";

export default function CNP() {
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [callAgainLeads, setCallAgainLeads] = useState([]);
  const [cnpTasks, setCnpTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [leadDetail, setLeadDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const [cnpRes, allRes, tasksRes, callAgainRes] = await Promise.all([
        getLeads({ cnp: "true", limit: 200 }),
        getLeads({ limit: 200 }),
        getCnpRecords(),
        getLeads({ status: "follow_up", limit: 200 }),
      ]);
      setLeads(Array.isArray(cnpRes?.leads) ? cnpRes.leads : []);
      setAllLeads(Array.isArray(allRes?.leads) ? allRes.leads : []);
      setCnpTasks(Array.isArray(tasksRes) ? tasksRes.filter(t => t.lead?.status !== 'closed_lost') : []);
      setCallAgainLeads(Array.isArray(callAgainRes?.leads) ? callAgainRes.leads : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkCNP = async (lead) => {
    setUpdating(lead._id);
    try { await markCNP(lead._id); load(); } catch { /* ignore */ } finally { setUpdating(null); }
  };

  const handleUnmarkCNP = async (lead) => {
    setUpdating(lead._id);
    try { await unmarkCNP(lead._id); load(); } catch { /* ignore */ } finally { setUpdating(null); }
  };

  const handleStatusChange = async (lead, status) => {
    setUpdating(lead._id);
    try { await updateLead(lead._id, { status, cnp: false }); load(); } catch { /* ignore */ } finally { setUpdating(null); }
  };

  const handleNotInterested = async (task) => {
    if (!task.lead?._id) return;
    setUpdating(task._id);
    try {
      await updateLead(task.lead._id, { status: 'closed_lost' });
      await deleteCnpRecord(task._id);
      setCnpTasks(prev => prev.filter(t => t._id !== task._id));
      navigate('/pipeline', { state: { filter: 'closed_lost' } });
    } catch { /* ignore */ } finally { setUpdating(null); }
  };

  const handleIncrementCnp = async (id) => {
    setUpdating(id);
    try {
      const updated = await incrementCnpCount(id);
      setCnpTasks((prev) =>
        prev.map((t) => t._id === id ? { ...t, cnpCount: updated.cnpCount, lastCnpAt: updated.lastCnpAt } : t)
      );
    } catch { /* ignore */ } finally { setUpdating(null); }
  };

  const navigate = useNavigate();

  const handleGoToTask = (task) => {
    navigate('/tasks', {
      state: {
        leadId: task.lead?._id || '',
        assignedTo: task.assignedTo?._id || '',
        cnpId: task._id,
        leadData: {
          name: task.lead?.name || task.title || '',
          phone: task.lead?.phone || '',
        },
      },
    });
  };

  const displayed = allLeads.filter((l) => !l.cnp);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading CNP data...</p>
        </div>
      </div>
    );

  const tabs = [
    { key: "tasks", label: "CNP Tasks", count: cnpTasks.length, color: "red" },
    { key: "callAgain", label: "Call Again", count: callAgainLeads.length, color: "amber" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #ef4444 0%, transparent 60%)" }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Call Not Picked</h2>
            </div>
            <p className="text-gray-400 text-sm">Manage unanswered call leads & tasks</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-400">{cnpTasks.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Tasks</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-orange-400">{leads.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Leads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              tab === t.key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.key
                  ? t.color === "red" ? "bg-red-100 text-red-600" : t.color === "amber" ? "bg-amber-100 text-amber-600" : "bg-orange-100 text-orange-600"
                  : "bg-gray-200 text-gray-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${tab === "tasks" ? "bg-red-500" : tab === "callAgain" ? "bg-amber-500" : "bg-gray-400"}`} />
            <h3 className="font-semibold text-gray-700 text-sm">
              {tab === "tasks" ? "CNP Tasks" : "Call Again Leads"}
            </h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {tab === "tasks" ? cnpTasks.length : callAgainLeads.length} {tab === "tasks" ? "task" : "lead"}{(tab === "tasks" ? cnpTasks.length : callAgainLeads.length) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tasks Tab */}
        {tab === "tasks" ? (
          cnpTasks.length === 0 ? (
            <EmptyState message="No CNP tasks found" />
          ) : (
            <div className="divide-y divide-gray-50">
              {cnpTasks.map((task) => (
                <div key={task._id} className="px-5 py-4 flex items-center gap-3 hover:bg-red-50/30 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm">
                    C
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.assignedTo && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                          </svg>
                          {task.assignedTo.name}
                        </span>
                      )}
                      {task.lead && (
                        <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                          {task.lead.name} · {task.lead.phone}
                        </span>
                      )}
                      {task.lastCnpAt && (
                        <span className="text-[11px] text-gray-400">
                          Last: {new Date(task.lastCnpAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleGoToTask(task)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm shadow-blue-200"
                    >
                      + Task
                    </button>
                    <button
                      disabled={updating === task._id}
                      onClick={() => handleNotInterested(task)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition disabled:opacity-40"
                    >
                      Not Interested
                    </button>
                    <button
                      disabled={updating === task._id || (task.cnpCount || 1) >= 3}
                      onClick={() => handleIncrementCnp(task._id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-40 shadow-sm shadow-red-200"
                    >
                      CNP
                      <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                        {task.cnpCount || 1}/3
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : callAgainLeads.length === 0 ? (
          <EmptyState message="No call again leads" />
        ) : (
          <div className="divide-y divide-gray-50">
            {callAgainLeads.map((lead) => (
              <div key={lead._id} className="px-5 py-4 flex items-center gap-3 hover:bg-amber-50/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white shadow-sm">
                  {lead.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{lead.phone}</span>
                    {lead.assignedTo && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        {lead.assignedTo.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setLeadDetail(lead)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl text-white transition shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >View Detail</button>
                  <button
                    disabled={updating === lead._id}
                    onClick={async () => {
                      setUpdating(lead._id);
                      try {
                        await updateLead(lead._id, { status: 'contacted' });
                        setCallAgainLeads(prev => prev.filter(l => l._id !== lead._id));
                        navigate('/tasks', { state: { leadId: lead._id, assignedTo: lead.assignedTo?._id || '', leadName: lead.name, leadPhone: lead.phone, leadData: lead } });
                      } catch { /* ignore */ } finally { setUpdating(null); }
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm disabled:opacity-40"
                  >+ Task</button>
                  <button
                    disabled={updating === lead._id}
                    onClick={async () => {
                      setUpdating(lead._id);
                      try {
                        await updateLead(lead._id, { status: 'closed_lost' });
                        setCallAgainLeads(prev => prev.filter(l => l._id !== lead._id));
                        navigate('/pipeline', { state: { filter: 'closed_lost' } });
                      } catch { /* ignore */ } finally { setUpdating(null); }
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition disabled:opacity-40"
                  >Not Interested</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {leadDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLeadDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="rounded-t-2xl px-6 py-5" style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white uppercase"
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
              {[['Phone', leadDetail.phone], ['Email', leadDetail.email], ['Address', leadDetail.address],
                ['Source', leadDetail.source], ['Status', leadDetail.status?.replace(/_/g, ' ')],
                ['Problem', leadDetail.problem], ['Assigned To', leadDetail.assignedTo?.name],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">{label}</p>
                  <p className="text-sm text-gray-800 font-medium">{value}</p>
                </div>
              ))}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-red-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>
      <p className="text-gray-400 text-sm font-medium">{message}</p>
    </div>
  );
}
