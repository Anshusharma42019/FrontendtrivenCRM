import { useEffect, useState, useCallback } from "react";
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
} from "../services/task.service";

export default function CNP() {
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [cnpTasks, setCnpTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [tab, setTab] = useState("tasks");

  const load = useCallback(async () => {
    try {
      const [cnpRes, allRes, tasksRes] = await Promise.all([
        getLeads({ cnp: "true", limit: 200 }),
        getLeads({ limit: 200 }),
        getCnpRecords(),
      ]);
      setLeads(Array.isArray(cnpRes?.leads) ? cnpRes.leads : []);
      setAllLeads(Array.isArray(allRes?.leads) ? allRes.leads : []);
      setCnpTasks(Array.isArray(tasksRes) ? tasksRes : []);
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

  const handleIncrementCnp = async (id) => {
    setUpdating(id);
    try {
      const updated = await incrementCnpCount(id);
      setCnpTasks((prev) =>
        prev.map((t) => t._id === id ? { ...t, cnpCount: updated.cnpCount, lastCnpAt: updated.lastCnpAt } : t)
      );
    } catch { /* ignore */ } finally { setUpdating(null); }
  };

  const displayed = tab === "cnp" ? leads : allLeads.filter((l) => !l.cnp);

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
    { key: "cnp", label: "CNP Leads", count: leads.length, color: "orange" },
    { key: "all", label: "Mark CNP", count: null, color: "gray" },
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
                  ? t.color === "red" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
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
            <div className={`w-2 h-2 rounded-full ${tab === "tasks" ? "bg-red-500" : tab === "cnp" ? "bg-orange-500" : "bg-gray-400"}`} />
            <h3 className="font-semibold text-gray-700 text-sm">
              {tab === "tasks" ? "CNP Tasks" : tab === "cnp" ? "CNP Leads" : "All Leads — Mark as CNP"}
            </h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {tab === "tasks" ? cnpTasks.length : displayed.length} {tab === "tasks" ? "task" : "lead"}{(tab === "tasks" ? cnpTasks.length : displayed.length) !== 1 ? "s" : ""}
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
                    {task.lead && (
                      <select
                        disabled={updating === task._id}
                        value={task.lead.status || ""}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setUpdating(task._id);
                          try {
                            await updateLead(task.lead._id, { status: val });
                            if (val === "closed_won") {
                              const taskId = task.task?._id || task.task;
                              if (taskId) await updateTask(taskId, { status: "verification" });
                            }
                            load();
                          } catch { /* ignore */ } finally { setUpdating(null); }
                        }}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 transition disabled:opacity-50 cursor-pointer"
                      >
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="closed_won">Converted</option>
                        <option value="closed_lost">Lost</option>
                      </select>
                    )}
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
        ) : displayed.length === 0 ? (
          <EmptyState message={tab === "cnp" ? "No CNP leads" : "No leads available"} />
        ) : (
          <div className="divide-y divide-gray-50">
            {displayed.map((lead) => (
              <div key={lead._id} className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase text-white shadow-sm ${
                  lead.cnp
                    ? "bg-gradient-to-br from-red-400 to-red-600"
                    : "bg-gradient-to-br from-green-400 to-green-600"
                }`}>
                  {lead.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{lead.name}</p>
                    {lead.cnpCount > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold border border-red-100">
                        CNP ×{lead.cnpCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                      {lead.phone}
                    </span>
                    {lead.assignedTo && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        {lead.assignedTo.name}
                      </span>
                    )}
                    {lead.cnpAt && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(lead.cnpAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {tab === "cnp" ? (
                    <>
                      <button
                        disabled={updating === lead._id}
                        onClick={() => handleStatusChange(lead, "contacted")}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 transition disabled:opacity-40"
                      >
                        Contacted
                      </button>
                      <button
                        disabled={updating === lead._id}
                        onClick={() => handleStatusChange(lead, "interested")}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 transition disabled:opacity-40"
                      >
                        Interested
                      </button>
                      <button
                        disabled={updating === lead._id}
                        onClick={() => handleUnmarkCNP(lead)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={updating === lead._id}
                      onClick={() => handleMarkCNP(lead)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-40 shadow-sm shadow-red-200"
                    >
                      Mark CNP
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
