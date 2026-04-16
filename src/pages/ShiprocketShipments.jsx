import { useState, useEffect } from 'react';
import * as srSvc from '../services/shiprocket.service';

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white';
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const STATUS_COLORS = {
  'DELIVERED':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'RTO DELIVERED':  'bg-orange-50 text-orange-700 border-orange-200',
  'IN TRANSIT':     'bg-blue-50 text-blue-700 border-blue-200',
  'OUT FOR DELIVERY': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'PICKUP SCHEDULED': 'bg-purple-50 text-purple-700 border-purple-200',
  'CANCELED':       'bg-red-50 text-red-700 border-red-200',
  'CANCELLED':      'bg-red-50 text-red-700 border-red-200',
  'NEW':            'bg-gray-50 text-gray-600 border-gray-200',
};

export default function ShiprocketShipments() {
  const [tab, setTab] = useState('list');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [awbInput, setAwbInput] = useState('');
  const [shipmentIdInput, setShipmentIdInput] = useState('');
  const [trackData, setTrackData] = useState(null);
  const [cancelAwbs, setCancelAwbs] = useState('');

  const call = async (fn) => {
    setLoading(true); setError(''); setResult(null); setTrackData(null);
    try { const r = await fn(); setResult(r); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  const fetchShipments = async () => {
    setLoading(true); setError('');
    try {
      // /shipments endpoint returns: id, order_id, awb, status, created_at, charges
      // No courier/city/pincode — those come from /orders
      const res = await srSvc.getShipments();
      setShipments(res.data?.data?.data || []);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'list') fetchShipments(); }, [tab]);

  const TABS = [
    { id: 'list', label: '🚚 Shipments' },
    { id: 'track', label: '📍 Track' },
    { id: 'cancel', label: '❌ Cancel Shipment' },
  ];

  const trackActivities = trackData?.tracking_data?.shipment_track_activities || [];
  const currentStatus = trackData?.tracking_data?.current_status;

  return (
    <div className="space-y-4">

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(''); setTrackData(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab === t.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Shipments List */}
      {tab === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-green-500" />
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">All Shipments</span>
            <button onClick={fetchShipments} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 font-semibold">
              {loading ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>

          {loading && (
            <div className="px-5 py-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              Loading shipments...
            </div>
          )}
          {!loading && shipments.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No shipments found.</div>
          )}
          {!loading && shipments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    {['Shipment ID', 'Order ID', 'AWB', 'Courier', 'Status', 'City', 'Pincode', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shipments.map((s) => {
                    // /orders response structure:
                    // s.id = order id, s.shipments[0].id = shipment id
                    // s.shipments[0].awb = AWB code
                    // s.shipments[0].courier = courier name
                    // s.customer_city, s.customer_pincode = delivery address
                    const ship = Array.isArray(s.shipments) ? s.shipments[0] : null;
                    const awb = ship?.awb || '';
                    const courier = ship?.courier || ship?.sr_courier_name || '';
                    const shipmentId = ship?.id || '—';
                    const city = s.customer_city || '';
                    const pincode = s.customer_pincode || '';
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{shipmentId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 cursor-pointer hover:text-red-500"
                          onClick={() => { setCancelAwbs(String(s.id)); setTab('cancel'); }}>
                          {s.id}
                        </td>
                        <td
                          className={`px-4 py-3 font-mono text-xs ${awb ? 'text-blue-600 cursor-pointer hover:underline' : 'text-gray-400'}`}
                          onClick={() => { if (awb) { setAwbInput(awb); setTab('track'); } }}>
                          {awb || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{courier || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {s.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{city || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{pincode || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{s.created_at?.split(',')[0] || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Track */}
      {tab === 'track' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-blue-500" />
            <div className="px-5 py-4 grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Field label="Track by AWB Code">
                  <input className={inp} placeholder="e.g. 1234567890" value={awbInput}
                    onChange={e => setAwbInput(e.target.value)} />
                </Field>
                <button onClick={() => call(async () => {
                  if (!awbInput) throw new Error('Enter AWB code');
                  const res = await srSvc.trackByAWB(awbInput);
                  setTrackData(res.data?.data);
                  return res.data;
                })} className="btn-primary w-full">Track by AWB</button>
              </div>
              <div className="space-y-3">
                <Field label="Track by Shipment ID">
                  <input className={inp} placeholder="e.g. 123456" value={shipmentIdInput}
                    onChange={e => setShipmentIdInput(e.target.value)} />
                </Field>
                <button onClick={() => call(async () => {
                  if (!shipmentIdInput) throw new Error('Enter Shipment ID');
                  const res = await srSvc.trackByShipment(shipmentIdInput);
                  setTrackData(res.data?.data);
                  return res.data;
                })} className="btn-primary w-full">Track by Shipment ID</button>
              </div>
            </div>
          </div>

          {trackData && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="h-1 bg-blue-500" />
              <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-sm">Tracking Timeline</span>
                {currentStatus && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[currentStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {currentStatus}
                  </span>
                )}
              </div>
              {trackActivities.length > 0 ? (
                <div className="px-5 py-4 space-y-3">
                  {trackActivities.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${i === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {i < trackActivities.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-semibold text-gray-800">{a.activity}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.date} · {a.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-gray-400">No tracking activities yet.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cancel Shipment */}
      {tab === 'cancel' && (
        <div className="space-y-4 max-w-md">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-red-500" />
            <div className="px-5 py-4 space-y-3">
              <Field label="Order IDs (comma separated)">
                <input className={inp} placeholder="e.g. 1202689352, 1202741886" value={cancelAwbs}
                  onChange={e => setCancelAwbs(e.target.value)} />
              </Field>
              <p className="text-xs text-gray-400">Enter Shiprocket Order IDs to cancel shipments. AWB-based cancellation is not supported by Shiprocket.</p>
            </div>
          </div>
          <button onClick={() => call(async () => {
            const ids = cancelAwbs.split(',').map(s => s.trim()).filter(Boolean).map(Number);
            if (!ids.length) throw new Error('Enter at least one Order ID');
            const res = await srSvc.cancelShipment(ids);
            return res.data;
          })} className="btn-primary bg-red-600 hover:bg-red-700">Cancel Shipment</button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="text-red-600 text-sm font-medium">{error}</span>
        </div>
      )}
      {result && !trackData && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          <span className="text-green-700 text-sm font-semibold">Success</span>
        </div>
      )}
    </div>
  );
}
