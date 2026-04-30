import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Modal from '../components/ui/Modal';

const TruckIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 5v3h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
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
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">{label}</span>
    <div className="flex-1 h-px bg-amber-100" />
  </div>
);

export default function ReadyToShipment() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [repairing, setRepairing] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await API.get('/ready-to-shipment');
      const data = res.data.data;
      setRecords(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRepair = async () => {
    setRepairing(true);
    try {
      await load();
    } finally {
      setRepairing(false);
    }
  };

  const filtered = records.filter(r => {
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOf(new Date());
    if (dayFilter === 'today' && new Date(r.createdAt) < today) return false;
    if (dayFilter === 'yesterday') {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      const d = new Date(r.createdAt);
      if (d < y || d >= today) return false;
    }
    if (dayFilter === 'custom' && customDate) {
      const from = new Date(customDate);
      const to = new Date(from); to.setDate(to.getDate() + 1);
      const d = new Date(r.createdAt);
      if (d < from || d >= to) return false;
    }
    const q = search.toLowerCase();
    return !q ||
      r.title?.toLowerCase().includes(q) ||
      r.lead?.name?.toLowerCase().includes(q) ||
      r.lead?.phone?.includes(q) ||
      r.assignedTo?.name?.toLowerCase().includes(q) ||
      r.state?.toLowerCase().includes(q) ||
      r.district?.toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex gap-4 scroll-container-h overflow-hidden animate-slide-up mobile-p-safe">
      {/* ── LEFT PANEL ── */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selected ? 'w-full lg:w-[55%]' : 'w-full'} h-full overflow-hidden`}>
        
        {/* Header & Filters (Fixed) */}
        <div className="flex flex-col gap-4 shrink-0 glass p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Ready to Ship</h2>
              <p className="text-xs text-gray-400 mt-0.5">Orders confirmed · awaiting dispatch</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRepair}
                disabled={repairing}
                className="px-3 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition disabled:opacity-50 whitespace-nowrap">
                {repairing ? 'Syncing...' : '🔄 Sync Verified'}
              </button>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-white text-xs font-bold shadow-sm"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <TruckIcon />
                {records.length} pending
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[['all', 'All'], ['today', 'Today'], ['yesterday', 'Yesterday']].map(([val, label]) => (
              <button key={val} onClick={() => { setDayFilter(val); setCustomDate(''); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
                  dayFilter === val
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                }`}>{label}</button>
            ))}
            <input
              type="date"
              value={customDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => { setCustomDate(e.target.value); setDayFilter(e.target.value ? 'custom' : 'all'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer outline-none shrink-0 ${
                dayFilter === 'custom'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-white text-gray-400 border-gray-100'
              }`}
            />
          </div>

          {/* Search (Fixed) */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, location…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 transition"
            />
          </div>
        </div>

        {/* List (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3 text-amber-300">
                <TruckIcon className="w-6 h-6" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No orders found</p>
              <p className="text-gray-400 text-xs mt-1">{search ? 'Try a different search' : 'Nothing here yet'}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filtered.map((r, i) => {
                const color = PIN_COLORS[i % PIN_COLORS.length];
                const isActive = selected?._id === r._id;
                return (
                  <div
                    key={r._id}
                    onClick={() => setSelected(isActive ? null : r)}
                    className={`relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-4 sm:py-3.5 rounded-2xl cursor-pointer transition-all duration-200 border
                      ${isActive
                        ? 'bg-amber-50 border-amber-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-sm'}`}>

                    {/* Left color strip */}
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${color}`} />

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white text-sm sm:text-xs font-bold shrink-0 ${color}`}>
                        {initials(r.lead?.name || r.title)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <p className="text-sm font-bold text-gray-800 truncate">{r.title}</p>
                          <span className="sm:hidden text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {r.lead?.name && <span className="text-xs text-gray-500 font-medium">{r.lead.name}</span>}
                          {r.lead?.phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                              {r.lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Status/Price */}
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 shrink-0 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-gray-50 sm:border-0">
                      <div className="flex items-center gap-2">
                        {r.price && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                            ₹{r.price}
                          </span>
                        )}
                        <span className="sm:hidden text-[10px] font-bold text-gray-400">Order #{i + 1}</span>
                      </div>
                      
                      {(r.district || r.state) && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                          <span className="truncate max-w-[120px]">{[r.district, r.state].filter(Boolean).join(', ')}</span>
                        </span>
                      )}
                    </div>

                    {/* Chevron (Desktop only) */}
                    <svg className={`hidden sm:block w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${isActive ? 'rotate-90 text-amber-400' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
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
          {/* Panel header */}
          <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg,#f59e0b,#d97706,#f59e0b)' }} />
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${PIN_COLORS[filtered.findIndex(r => r._id === selected._id) % PIN_COLORS.length]}`}>
                {initials(selected.lead?.name || selected.title)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-tight">{selected.lead?.name || 'Order Detail'}</p>
                {selected.lead?.phone && <p className="text-xs text-gray-400">{selected.lead.phone}</p>}
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-lg">
              ×
            </button>
          </div>

          {/* Panel body */}
          <div className="px-5 py-3 overflow-y-auto flex-1 custom-scrollbar">
            <SectionHead label="Customer" />
            <DetailRow label="Task" value={selected.title} />
            <DetailRow label="Assigned To" value={selected.assignedTo?.name} />
            <DetailRow label="Description" value={selected.description} />

            <SectionHead label="Health Info" />
            <DetailRow label="Problem" value={selected.problem} />
            <DetailRow label="Duration" value={selected.problemDuration} />
            <DetailRow label="Age" value={selected.age ? `${selected.age} yrs` : null} />
            <DetailRow label="Weight" value={selected.weight ? `${selected.weight} kg` : null} />
            <DetailRow label="Height" value={selected.height ? `${selected.height} cm` : null} />
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
            <DetailRow label="Confirm Date" value={selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          </div>

          {/* Panel footer */}
          <div className="px-5 py-4 border-t border-gray-50 shrink-0">
            <button
              onClick={() => {
                setSelected(null);
                navigate('/shiprocket', {
                  state: { delivery_postcode: selected.pincode || '', rts: selected }
                });
              }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-900/10"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
              <TruckIcon />
              Check Serviceability & Ship
            </button>
          </div>
        </div>
      )}

      {/* Mobile Detail Modal */}
      {selected && (
        <div className="lg:hidden">
          <Modal hideHeader={true} onClose={() => setSelected(null)}>
            {/* Premium Header */}
            <div className="-mx-4 -mt-4 mb-5 px-6 py-6 rounded-b-3xl relative"
              style={{ background: 'linear-gradient(135deg, #0d1f0d, #1a3a1a)' }}>
              <button onClick={() => setSelected(null)}
                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-all text-xl">
                ×
              </button>
              <div className="flex items-center gap-4 pr-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-xl ${PIN_COLORS[filtered.findIndex(r => r._id === selected._id) % PIN_COLORS.length]}`}>
                  {initials(selected.lead?.name || selected.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg tracking-tight truncate">{selected.lead?.name || selected.title}</h3>
                  <p className="text-amber-300/70 text-sm font-medium">{selected.lead?.phone}</p>
                </div>
              </div>
            </div>

            <div className="space-y-0 px-2 pb-2">
              <SectionHead label="Customer Info" />
              <DetailRow label="Task" value={selected.title} />
              <DetailRow label="Assigned To" value={selected.assignedTo?.name} />
              <DetailRow label="Description" value={selected.description} />
              
              <SectionHead label="Health Info" />
              <DetailRow label="Problem" value={selected.problem} />
              <DetailRow label="Duration" value={selected.problemDuration} />
              <DetailRow label="Age" value={selected.age ? `${selected.age} yrs` : null} />
              <DetailRow label="Weight" value={selected.weight ? `${selected.weight} kg` : null} />
              <DetailRow label="Height" value={selected.height ? `${selected.height} cm` : null} />
              
              <SectionHead label="Shipping Address" />
              <DetailRow label={selected.cityVillageType === 'village' ? 'Village' : 'City'} value={selected.cityVillage} />
              <DetailRow label="House No" value={selected.houseNo} />
              <DetailRow label="Post Office" value={selected.postOffice} />
              <DetailRow label="District" value={selected.district} />
              <DetailRow label="State" value={selected.state} />
              <DetailRow label="Pincode" value={selected.pincode} />
              <DetailRow label="Landmark" value={selected.landmark} />
              
              <SectionHead label="Order Details" />
              <DetailRow label="Price" value={selected.price ? `₹${selected.price}` : null} />
              <DetailRow label="Confirm Date" value={selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
              
              <div className="pt-6">
                <button
                  onClick={() => {
                    setSelected(null);
                    navigate('/shiprocket', { state: { delivery_postcode: selected.pincode || '', rts: selected } });
                  }}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  <TruckIcon className="w-5 h-5" /> CHECK SERVICEABILITY
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
