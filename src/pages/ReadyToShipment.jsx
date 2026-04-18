import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Modal from '../components/ui/Modal';

export default function ReadyToShipment() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Ready to Shipment</h2>
          <p className="text-sm text-gray-400 mt-0.5">Orders ready for shipment</p>
        </div>
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
          {records.length} order{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-amber-400" />
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">Shipment List</h3>
          <span className="text-xs text-gray-400">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        </div>
        {records.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <p className="text-gray-400 text-sm">No shipment orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map(r => (
              <div key={r._id} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 text-amber-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.assignedTo && <p className="text-xs text-green-600">{r.assignedTo.name}</p>}
                      {r.lead && <p className="text-xs text-gray-400">{r.lead.name} — {r.lead.phone}</p>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(r)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>View Detail</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal title="Shipment Detail" onClose={() => setSelected(null)}>
          <div className="space-y-0">
            {[
              { label: 'Task Title', value: selected.title },
              { label: 'Assigned To', value: selected.assignedTo?.name },
              { label: 'Lead Name', value: selected.lead?.name },
              { label: 'Lead Phone', value: selected.lead?.phone },
              { label: 'Description', value: selected.description },
              { label: 'Problem', value: selected.problem },
              { label: 'Age', value: selected.age ? `${selected.age} yrs` : null },
              { label: 'Weight', value: selected.weight ? `${selected.weight} kg` : null },
              { label: 'Height', value: selected.height ? `${selected.height} cm` : null },
              { label: 'Other Problems', value: selected.otherProblems },
              { label: 'Problem Duration', value: selected.problemDuration },
              { label: 'Price', value: selected.price ? `₹${selected.price}` : null },
              { label: selected.cityVillageType === 'village' ? 'Village' : 'City', value: selected.cityVillage },
              { label: 'House No', value: selected.houseNo },
              { label: 'Post Office', value: selected.postOffice },
              { label: 'District', value: selected.district },
              { label: 'Landmark', value: selected.landmark },
              { label: 'Pincode', value: selected.pincode },
              { label: 'State', value: selected.state },
              { label: 'Confirmation Call Date', value: selected.reminderAt ? new Date(selected.reminderAt).toLocaleDateString() : null },
            ].filter(f => f.value).map(({ label, value }) => (
              <div key={label} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0 mt-0.5">{label}</p>
                <p className="text-sm text-gray-800 font-medium capitalize">{value}</p>
              </div>
            ))}
          </div>
          <div className="pt-4 flex gap-2">
            <button
              onClick={() => {
                setSelected(null);
                navigate('/shiprocket', {
                  state: {
                    delivery_postcode: selected.pincode || '',
                    rts: selected,
                  }
                });
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              🚚 Check Serviceability
            </button>
            <button onClick={() => setSelected(null)}
              className="flex-1 border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium text-gray-600 transition">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
