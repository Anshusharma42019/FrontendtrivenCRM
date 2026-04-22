import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as srSvc from '../services/shiprocket.service';
import OrderStatusBoard from '../components/OrderStatusBoard';

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white';
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const NDR_ATTEMPT_OPTIONS = [
  { value: 'all', label: 'All Attempts' },
  { value: '1', label: '1st Attempt' },
  { value: '2', label: '2nd Attempt' },
  { value: '3', label: '3rd Attempt' },
  { value: '4+', label: '4+ Attempts' },
];

const NDR_DETAIL_PRIORITY = [
  'awb_code',
  'channel_order_id',
  'order_id',
  'shipment_id',
  'customer_name',
  'customer_phone',
  'customer_email',
  'reason',
  'remarks',
  'comment',
  'action',
  'attempts',
  'ndr_raised_at',
  'current_status',
  'status',
  'courier_name',
  'payment_method',
  'pickup_date',
  'edd',
  'delivered_date',
  'address',
  'city',
  'state',
  'pincode',
];

const formatDetailLabel = (key) => String(key || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, ch => ch.toUpperCase());

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const detailCardCls = 'rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:px-5';

export default function ShiprocketReturns({ initialTab = 'returns' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Returns
  const [returns, setReturns] = useState([]);
  const [returnForm, setReturnForm] = useState({
    order_id: '', channel_id: '', pickup_customer_name: '', pickup_phone: '',
    pickup_address: '', pickup_city: '', pickup_state: '', pickup_pincode: '',
    pickup_country: 'India', shipping_customer_name: '', shipping_phone: '',
    shipping_address: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
    shipping_country: 'India', payment_method: 'prepaid', sub_total: '',
    order_items: [{ name: '', sku: '', units: 1, selling_price: '' }],
    weight: 0.5, length: 10, breadth: 10, height: 10,
  });

  // Wallet
  const [walletBalance, setWalletBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // NDR
  const [ndrs, setNdrs] = useState([]);
  const [ndrAction, setNdrAction] = useState({ awb: '', action: 'reattempt', comment: '' });
  const [ndrFrom, setNdrFrom] = useState('');
  const [ndrTo, setNdrTo] = useState('');
  const [ndrLoading, setNdrLoading] = useState(false);
  const [ndrAttemptFilter, setNdrAttemptFilter] = useState('all');
  const [selectedNdr, setSelectedNdr] = useState(null);
  const [ndrDetailOpen, setNdrDetailOpen] = useState(false);

  const fetchNDR = (from = ndrFrom, to = ndrTo) => {
    setNdrLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    srSvc.getNDR(params).then(r => {
      const list = r.data?.data?.data || [];
      setNdrs(list);
      setSelectedNdr(current => {
        if (!current) return list[0] || null;
        const match = list.find(item => item.awb_code === current.awb_code && item.channel_order_id === current.channel_order_id);
        return match || list[0] || null;
      });
    }).catch(e => setError(e?.response?.data?.message || e.message))
      .finally(() => setNdrLoading(false));
  };

  // Create Return - orders list
  const [crOrders, setCrOrders] = useState([]);
  const [crLoading, setCrLoading] = useState(false);
  const [crSelected, setCrSelected] = useState(null);

  const loadOrdersForReturn = () => {
    setCrLoading(true);
    srSvc.getOrders().then(r => {
      const all = r.data?.data?.data || [];
      setCrOrders(all);
    }).catch(() => {}).finally(() => setCrLoading(false));
  };

  const call = async (fn) => {
    setLoading(true); setError(''); setResult(null);
    try { const r = await fn(); setResult(r); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  const setRF = (k, v) => setReturnForm(p => ({ ...p, [k]: v }));
  const setRI = (k, v) => setReturnForm(p => ({ ...p, order_items: [{ ...p.order_items[0], [k]: v }] }));
  const filteredNdrs = ndrs.filter((item) => {
    if (ndrAttemptFilter === 'all') return true;
    const attempts = Number(item.attempts ?? 1);
    if (ndrAttemptFilter === '4+') return attempts >= 4;
    return attempts === Number(ndrAttemptFilter);
  });
  const selectedNdrDetails = selectedNdr
    ? [
        ...NDR_DETAIL_PRIORITY.filter(key => key in selectedNdr).map(key => [key, selectedNdr[key]]),
        ...Object.entries(selectedNdr).filter(([key]) => !NDR_DETAIL_PRIORITY.includes(key)),
      ]
    : [];

  useEffect(() => {
    setTab(initialTab);
    setResult(null);
    setError('');
    setNdrDetailOpen(false);
  }, [initialTab]);

  useEffect(() => {
    if (!location.state?.prefillAwb) return;
    setNdrAction(p => ({ ...p, awb: location.state.prefillAwb }));
    window.history.replaceState({}, '');
  }, [location.state]);

  useEffect(() => {
    if (!filteredNdrs.length) {
      setSelectedNdr(null);
      return;
    }
    if (!selectedNdr) {
      setSelectedNdr(filteredNdrs[0]);
      return;
    }
    const stillVisible = filteredNdrs.some(item => item.awb_code === selectedNdr.awb_code && item.channel_order_id === selectedNdr.channel_order_id);
    if (!stillVisible) setSelectedNdr(filteredNdrs[0]);
  }, [filteredNdrs, selectedNdr]);

  useEffect(() => {
    if (tab === 'returns') {
      srSvc.getReturns().then(r => {
        setReturns(r.data?.data?.data || []);
      }).catch(e => { setError(e?.response?.data?.message || e.message); });
    }
    if (tab === 'create_return') {
      loadOrdersForReturn();
    }
    if (tab === 'wallet') {
      srSvc.getWalletBalance().then(r => {
        setWalletBalance(r.data?.data?.data);
      }).catch(e => { setError(e?.response?.data?.message || e.message); });
      srSvc.getWalletTransactions().then(r => {
        const d = r.data?.data;
        setTransactions(d?.data || (Array.isArray(d) ? d : []));
      }).catch(e => setError(e?.response?.data?.message || e.message));
    }
    if (tab === 'ndr') {
      fetchNDR();
    }
    if (tab !== 'ndr') {
      setNdrDetailOpen(false);
    }
  }, [tab]);

  const TABS = [
    { id: 'returns', label: '↩️ Returns' },
    { id: 'create_return', label: '➕ Create Return' },
    { id: 'wallet', label: '💰 Wallet' },
    { id: 'ndr', label: '⚠️ NDR' },
  ];

  return (
    <div className="space-y-4">

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${tab === t.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Returns List */}
      {tab === 'returns' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-orange-500" />
          <div className="px-5 py-3 border-b border-gray-50">
            <span className="font-semibold text-gray-700 text-sm">Return Orders</span>
          </div>
          {returns.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No returns found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    {['Order ID', 'AWB', 'Customer', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {returns.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs">{r.channel_order_id || r.order_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.awb_code || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.customer_name || '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-semibold">{r.status || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.created_at?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Return */}
      {tab === 'create_return' && (
        <div className="space-y-4">
          {/* Orders list to pick from */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-orange-500" />
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <span className="font-semibold text-gray-700 text-sm">Select Order to Return</span>
              <button onClick={loadOrdersForReturn} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-xl hover:bg-orange-700 font-semibold">
                {crLoading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>
            {crOrders.length === 0 ? (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">{crLoading ? 'Loading orders...' : 'No orders found.'}</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-auto">
                {crOrders.map((o, i) => (
                  <div key={i} onClick={() => {
                    setCrSelected(o);
                    setRF('order_id', String(o.channel_order_id || o.id || ''));
                    setRF('channel_id', String(o.channel_id || ''));
                    setRF('pickup_customer_name', o.customer_name || '');
                    setRF('pickup_phone', o.customer_phone || '');
                    setRF('pickup_address', o.customer_address || '');
                    setRF('pickup_city', o.customer_city || '');
                    setRF('pickup_state', o.customer_state || '');
                    setRF('pickup_pincode', String(o.customer_pincode || ''));
                    setRF('shipping_customer_name', o.customer_name || '');
                    setRF('shipping_phone', o.customer_phone || '');
                    setRF('shipping_address', o.customer_address || '');
                    setRF('shipping_city', o.customer_city || '');
                    setRF('shipping_state', o.customer_state || '');
                    setRF('shipping_pincode', String(o.customer_pincode || ''));
                    setRF('sub_total', o.total || '');
                    if (o.products?.[0]) {
                      setRI('name', o.products[0].name || '');
                      setRI('sku', o.products[0].channel_sku || '');
                      setRI('units', o.products[0].quantity || 1);
                      setRI('selling_price', o.products[0].selling_price || '');
                    }
                  }}
                    className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-orange-50/50 transition-colors ${crSelected?.id === o.id ? 'bg-orange-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{o.customer_name} <span className="font-mono text-xs text-gray-400 ml-1">{o.channel_order_id}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">{o.customer_city}, {o.customer_state} · ₹{o.total} · <span className={`font-semibold ${o.status === 'DELIVERED' ? 'text-green-600' : 'text-gray-500'}`}>{o.status}</span></p>
                    </div>
                    {crSelected?.id === o.id && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">✓ Selected</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-orange-500" />
            <div className="px-5 py-3 border-b border-gray-50"><span className="font-semibold text-gray-700 text-sm">Return Details</span></div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {[['order_id','Order ID'],['channel_id','Channel ID'],['payment_method','Payment Method']].map(([k,l]) => (
                <Field key={k} label={l}>
                  {k === 'payment_method'
                    ? <select className={inp} value={returnForm[k]} onChange={e => setRF(k, e.target.value)}><option value="prepaid">Prepaid</option><option value="COD">COD</option></select>
                    : <input className={inp} value={returnForm[k]} onChange={e => setRF(k, e.target.value)} />}
                </Field>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-blue-500" />
            <div className="px-5 py-3 border-b border-gray-50"><span className="font-semibold text-gray-700 text-sm">Pickup Address</span></div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {[['pickup_customer_name','Name'],['pickup_phone','Phone'],['pickup_address','Address'],
                ['pickup_city','City'],['pickup_state','State'],['pickup_pincode','Pincode']].map(([k,l]) => (
                <Field key={k} label={l}><input className={inp} value={returnForm[k]} onChange={e => setRF(k, e.target.value)} /></Field>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-purple-500" />
            <div className="px-5 py-3 border-b border-gray-50"><span className="font-semibold text-gray-700 text-sm">Product</span></div>
            <div className="px-5 py-4 grid grid-cols-4 gap-3">
              <Field label="Name"><input className={inp} value={returnForm.order_items[0].name} onChange={e => setRI('name', e.target.value)} /></Field>
              <Field label="SKU"><input className={inp} value={returnForm.order_items[0].sku} onChange={e => setRI('sku', e.target.value)} /></Field>
              <Field label="Units"><input className={inp} type="number" value={returnForm.order_items[0].units} onChange={e => setRI('units', Number(e.target.value))} /></Field>
              <Field label="Price"><input className={inp} type="number" value={returnForm.order_items[0].selling_price} onChange={e => setRI('selling_price', e.target.value)} /></Field>
            </div>
            <div className="px-5 pb-4 grid grid-cols-5 gap-3">
              {[['weight','Weight (kg)'],['length','L (cm)'],['breadth','B (cm)'],['height','H (cm)'],['sub_total','Sub Total']].map(([k,l]) => (
                <Field key={k} label={l}><input className={inp} type="number" value={returnForm[k]} onChange={e => setRF(k, Number(e.target.value))} /></Field>
              ))}
            </div>
          </div>

          <button onClick={() => call(async () => {
            const res = await srSvc.createReturn(returnForm);
            return res.data;
          })} className="btn-primary">Create Return Order</button>
        </div>
      )}

      {/* Wallet */}
      {tab === 'wallet' && (
        <div className="space-y-4">
          {walletBalance && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="h-1 bg-green-500" />
                <div className="px-5 py-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Wallet Balance</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">₹{walletBalance.balance_amount ?? walletBalance.wallet_balance ?? '—'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-green-500" />
            <div className="px-5 py-3 border-b border-gray-50"><span className="font-semibold text-gray-700 text-sm">Transactions</span></div>
            {transactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No transactions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>{['Date', 'Type', 'Amount', 'Closing Balance', 'Note'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs text-gray-400">{t.created_at?.split('T')[0]}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${t.type === 'credit' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{t.type}</span></td>
                        <td className="px-4 py-3 font-semibold text-gray-800">₹{t.amount}</td>
                        <td className="px-4 py-3 text-gray-600">₹{t.closing_balance}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{t.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NDR */}
      {tab === 'ndr' && (
        <div className="space-y-4">
          <OrderStatusBoard title="Order Status" />

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-red-500" />
            <div className="px-5 py-3 border-b border-gray-50"><span className="font-semibold text-gray-700 text-sm">NDR Action</span></div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              <Field label="AWB Code">
                <input className={inp} placeholder="AWB number" value={ndrAction.awb}
                  onChange={e => setNdrAction(p => ({ ...p, awb: e.target.value }))} />
              </Field>
              <Field label="Action">
                <select className={inp} value={ndrAction.action}
                  onChange={e => setNdrAction(p => ({ ...p, action: e.target.value }))}>
                  <option value="reattempt">Re-attempt Delivery</option>
                  <option value="return">Return to Origin</option>
                </select>
              </Field>
              <Field label="Comment">
                <input className={inp} placeholder="Optional comment" value={ndrAction.comment}
                  onChange={e => setNdrAction(p => ({ ...p, comment: e.target.value }))} />
              </Field>
            </div>
            <div className="px-5 pb-4">
              <button onClick={() => call(async () => {
                if (!ndrAction.awb) throw new Error('Enter AWB code');
                const res = await srSvc.ndrAction(ndrAction);
                return res.data;
              })} className="btn-primary">Submit NDR Action</button>
            </div>
          </div>

          {ndrDetailOpen && selectedNdr && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="h-1 bg-red-500" />
              <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <button
                    onClick={() => setNdrDetailOpen(false)}
                    className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to NDR List
                  </button>
                  <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Full Details</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedNdr.customer_name?.trim() || 'Unknown Customer'} - {selectedNdr.awb_code || '-'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNdrAction(p => ({ ...p, awb: selectedNdr.awb_code || p.awb }));
                    setNdrDetailOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-sm bg-white text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 font-semibold border border-red-100"
                >
                  Use AWB in Action
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {selectedNdrDetails.map(([key, value]) => (
                    <div key={key} className={detailCardCls}>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{formatDetailLabel(key)}</p>
                      <p className="text-lg sm:text-[1.05rem] font-bold text-slate-800 mt-2 break-words">{formatDetailValue(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!ndrDetailOpen && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-red-500" />
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
              <span className="font-semibold text-gray-700 text-sm">NDR List</span>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={ndrAttemptFilter}
                  onChange={e => setNdrAttemptFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-red-400 bg-white"
                >
                  {NDR_ATTEMPT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input type="date" value={ndrFrom} onChange={e => setNdrFrom(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-red-400 bg-white" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={ndrTo} onChange={e => setNdrTo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-red-400 bg-white" />
                <button onClick={() => fetchNDR(ndrFrom, ndrTo)}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-xl hover:bg-red-700 font-semibold">
                  {ndrLoading ? 'Loading...' : '🔍 Search'}
                </button>
                {(ndrFrom || ndrTo) && (
                  <button onClick={() => { setNdrFrom(''); setNdrTo(''); fetchNDR('', ''); }}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200 font-semibold">✕ Clear</button>
                )}
              </div>
            </div>
            {false && selectedNdr && (
              <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/70">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Full Details</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedNdr.customer_name?.trim() || 'Unknown Customer'} · {selectedNdr.awb_code || 'No AWB'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNdrAction(p => ({ ...p, awb: selectedNdr.awb_code || p.awb }));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs bg-white text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 font-semibold border border-red-100"
                  >
                    Use AWB in Action
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {selectedNdrDetails.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{formatDetailLabel(key)}</p>
                      <p className="text-sm font-semibold text-gray-700 break-words mt-1">{formatDetailValue(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {filteredNdrs.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No NDR records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>{['AWB', 'Order ID', 'Customer', 'Reason', 'Attempts', 'Date', 'Action'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredNdrs.map((n, i) => (
                      <tr key={i} className={`hover:bg-gray-50/50 ${selectedNdr?.awb_code === n.awb_code && selectedNdr?.channel_order_id === n.channel_order_id ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                          onClick={() => {
                            setNdrAction(p => ({ ...p, awb: n.awb_code }));
                            setSelectedNdr(n);
                          }}>{n.awb_code}</td>
                        <td className="px-4 py-3 font-mono text-xs">{n.channel_order_id}</td>
                        <td className="px-4 py-3 text-gray-700">{n.customer_name?.trim() || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{n.reason || '—'}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{n.attempts ?? 1}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{n.ndr_raised_at?.split(' ')[0]}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelectedNdr(n);
                              navigate('/shiprocket/ndr/detail', { state: { ndr: n } });
                            }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 whitespace-nowrap mr-2"
                          >
                            View
                          </button>
                          <button onClick={() => {
                            setSelectedNdr(n);
                            setNdrAction({ awb: n.awb_code, action: 'return', comment: 'Return to Origin' });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100 whitespace-nowrap">
                            ↩ RTO
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </div>
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
