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
  NEW: 'bg-blue-50 text-blue-700',
  SHIPPED: 'bg-green-50 text-green-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  CANCELED: 'bg-red-50 text-red-700',
  RTO_INITIATED: 'bg-orange-50 text-orange-700',
  IN_TRANSIT: 'bg-yellow-50 text-yellow-700',
  'PICKUP SCHEDULED': 'bg-purple-50 text-purple-700',
};

function UpdateOrderForm({ setError, setResult, setLoading, loading }) {
  const [form, setForm] = useState({
    order_id: '', order_date: new Date().toISOString().split('T')[0],
    billing_customer_name: '', billing_last_name: '', billing_phone: '',
    billing_address: '', billing_city: '', billing_state: '',
    billing_pincode: '', billing_country: 'India', billing_email: '',
    shipping_is_billing: 1, payment_method: 'prepaid',
    sub_total: '', length: 10, breadth: 10, height: 10, weight: 0.5,
    order_items: [{ name: '', sku: '', units: 1, selling_price: 0 }],
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (k, v) => setForm(p => ({ ...p, order_items: [{ ...p.order_items[0], [k]: v }] }));

  const submit = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      if (!form.order_id) throw new Error('Shiprocket Order ID is required');
      const payload = {
        ...form,
        order_id: Number(form.order_id),
        billing_pincode: String(form.billing_pincode),
        billing_phone: String(form.billing_phone).replace(/\D/g, ''),
        order_date: form.order_date.includes(' ') ? form.order_date : `${form.order_date} 10:00`,
        sub_total: Number(form.sub_total),
        length: Number(form.length), breadth: Number(form.breadth),
        height: Number(form.height), weight: Number(form.weight),
        order_items: form.order_items.map(i => ({ ...i, units: Number(i.units), selling_price: Number(i.selling_price) })),
      };
      const res = await srSvc.updateOrder(payload);
      setResult(res.data);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        ⚠️ Shiprocket update requires ALL fields. Enter the <strong>numeric Shiprocket Order ID</strong> (e.g. 1279117157) from the Orders List, not ORD-001.
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-yellow-500" />
        <div className="px-5 py-4 grid grid-cols-3 gap-3">
          <Field label="Shiprocket Order ID *"><input className={inp} placeholder="e.g. 1279117157" value={form.order_id} onChange={e => set('order_id', e.target.value)} /></Field>
          <Field label="Order Date *"><input className={inp} type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} /></Field>
          <Field label="Payment Method">
            <select className={inp} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              <option value="prepaid">Prepaid</option>
              <option value="COD">COD</option>
            </select>
          </Field>
          {[['billing_customer_name','First Name *'],['billing_last_name','Last Name'],['billing_phone','Phone *'],
            ['billing_email','Email'],['billing_address','Address *'],['billing_city','City *'],
            ['billing_state','State *'],['billing_pincode','Pincode *'],['billing_country','Country'],
          ].map(([k, label]) => (
            <Field key={k} label={label}><input className={inp} value={form[k]} onChange={e => set(k, e.target.value)} /></Field>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-purple-500" />
        <div className="px-5 py-4 grid grid-cols-4 gap-3">
          <Field label="Product Name *"><input className={inp} value={form.order_items[0].name} onChange={e => setItem('name', e.target.value)} /></Field>
          <Field label="SKU"><input className={inp} value={form.order_items[0].sku} onChange={e => setItem('sku', e.target.value)} /></Field>
          <Field label="Units"><input className={inp} type="number" value={form.order_items[0].units} onChange={e => setItem('units', Number(e.target.value))} /></Field>
          <Field label="Price (₹)"><input className={inp} type="number" value={form.order_items[0].selling_price} onChange={e => setItem('selling_price', Number(e.target.value))} /></Field>
        </div>
        <div className="px-5 pb-4 grid grid-cols-5 gap-3">
          {[['length','L (cm)'],['breadth','B (cm)'],['height','H (cm)'],['weight','Weight (kg)'],['sub_total','Sub Total (₹) *']].map(([k, l]) => (
            <Field key={k} label={l}><input className={inp} type="number" value={form[k]} onChange={e => set(k, Number(e.target.value))} /></Field>
          ))}
        </div>
      </div>
      <button onClick={submit} disabled={loading} className="btn-primary disabled:opacity-50">
        {loading ? 'Updating...' : 'Update Order'}
      </button>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function ShiprocketOrders() {
  const [tab, setTab] = useState('list');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [actionId, setActionId] = useState(null);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const totalPages = Math.ceil(orders.length / PAGE_SIZE);
  const paged = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fetchOrders = async (from = fromDate, to = toDate) => {
    setLoading(true); setError(''); setSelected(new Set()); setPage(1);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await srSvc.getOrders(params);
      setOrders(res.data?.data?.data || []);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'list') fetchOrders(); }, [tab]);

  const cancelOne = async (oid) => {
    if (!window.confirm(`Cancel order ${oid} on Shiprocket?`)) return;
    setActionId(`cancel-${oid}`);
    try {
      await srSvc.cancelOrders([Number(oid)]);
      setOrders(prev => prev.map(o => String(o.id) === String(oid) ? { ...o, status: 'CANCELLED' } : o));
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setActionId(null); }
  };

  const deleteOne = async (oid) => {
    if (!window.confirm(`Delete order ${oid} from local DB?\n\nNote: Still exists on Shiprocket.`)) return;
    setActionId(`delete-${oid}`);
    try {
      await srSvc.deleteLocalOrder(oid);
      setOrders(prev => prev.filter(o => String(o.id) !== String(oid)));
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setActionId(null); }
  };

  const cancelSelected = async () => {
    if (!selected.size || !window.confirm(`Cancel ${selected.size} order(s)?`)) return;
    setLoading(true); setError('');
    try {
      await srSvc.cancelOrders([...selected].map(Number));
      setOrders(prev => prev.map(o => selected.has(String(o.id)) ? { ...o, status: 'CANCELLED' } : o));
      setSelected(new Set());
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(String(id)) ? next.delete(String(id)) : next.add(String(id));
    return next;
  });

  const toggleAll = () =>
    setSelected(selected.size === paged.length ? new Set() : new Set(paged.map(o => String(o.id))));

  const canCancel = (status) => !['CANCELLED', 'CANCELED', 'DELIVERED', 'RTO_DELIVERED'].includes(status);

  const TABS = [
    { id: 'list', label: '📦 Orders List' },
    { id: 'update', label: '✏️ Update Order' },
  ];

  return (
    <div className="flex flex-col h-full gap-4">

      <div className="flex gap-2 flex-wrap shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab === t.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-green-500" />
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-gray-700 text-sm">All Orders</span>
              {selected.size > 0 && (
                <button onClick={cancelSelected} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-xl hover:bg-red-700 font-semibold">
                  ❌ Cancel Selected ({selected.size})
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-semibold">From</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500 bg-white" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-semibold">To</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500 bg-white" />
              </div>
              <button onClick={() => fetchOrders(fromDate, toDate)}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 font-semibold">
                🔍 Search
              </button>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); fetchOrders('', ''); }}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200 font-semibold">
                  ✕ Clear
                </button>
              )}
              <button onClick={() => fetchOrders(fromDate, toDate)}
                className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-xl hover:bg-gray-700 font-semibold">
                {loading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="px-5 py-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              Loading orders...
            </div>
          )}
          {!loading && orders.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No orders found.</div>
          )}
          {!loading && orders.length > 0 && (
            <>
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">
                        <input type="checkbox" className="rounded"
                          checked={selected.size === paged.length && paged.length > 0}
                          onChange={toggleAll} />
                      </th>
                      {['Order ID', 'Date', 'Customer', 'AWB', 'Courier', 'Status', 'Amount', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.map((o) => {
                      const oid = o.id || o.order_id;
                      return (
                        <tr key={oid} className={`hover:bg-gray-50/50 transition-colors ${['CANCELLED','CANCELED'].includes(o.status) ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" className="rounded"
                              checked={selected.has(String(oid))}
                              onChange={() => toggleSelect(oid)}
                              disabled={!canCancel(o.status)} />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.channel_order_id || o.order_id}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{o.created_at?.split(',')[0]}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{o.customer_name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.shipments?.[0]?.awb || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{o.shipments?.[0]?.courier || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                              {o.status || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">₹{o.total}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {canCancel(o.status) && (
                                <button onClick={() => cancelOne(oid)} disabled={actionId === `cancel-${oid}`}
                                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all disabled:opacity-50 whitespace-nowrap">
                                  {actionId === `cancel-${oid}` ? '...' : '❌ Cancel'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, orders.length)} of {orders.length} orders
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={page === 1}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">«</button>
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) => p === '...' ? (
                        <span key={`e${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                      ) : (
                        <button key={p} onClick={() => setPage(p)}
                          className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${
                            page === p ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}>{p}</button>
                      ))}
                    <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">›</button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                      className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'update' && (
        <UpdateOrderForm setError={setError} setResult={setResult} setLoading={setLoading} loading={loading} />
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="text-red-600 text-sm font-medium">{error}</span>
        </div>
      )}
      {result && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          <span className="text-green-700 text-sm font-semibold">Success</span>
        </div>
      )}
    </div>
  );
}
