import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import * as srSvc from '../services/shiprocket.service';

const TOKEN_KEY = 'sr_token';
const TOKEN_EXP_KEY = 'sr_token_exp';
const TOKEN_TTL = 24 * 60 * 60 * 1000;

const getSavedToken = () => {
  const exp = localStorage.getItem(TOKEN_EXP_KEY);
  if (exp && Date.now() < Number(exp)) return localStorage.getItem(TOKEN_KEY) || '';
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
  return '';
};

const saveToken = (t) => {
  localStorage.setItem(TOKEN_KEY, t);
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + TOKEN_TTL));
};

const STEPS = [
  'Login', 'Serviceability', 'Create Order', 'Assign AWB',
  'Generate Pickup', 'Generate Manifest', 'Print Manifest',
  'Generate Label', 'Print Invoice', 'Track AWB',
];

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white placeholder-gray-400';
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const MEDICINES = [
  { name: 'Migraine Medicines', sku: 'MIG-001' },
  { name: 'Ayurvedic Oil', sku: 'AYU-001' },
  { name: 'Triven Wellness Kit', sku: 'TWK-001' },
  { name: 'Pain Relief Oil', sku: 'PRO-001' },
  { name: 'Immunity Booster', sku: 'IMB-001' },
  { name: 'Digestive Care', sku: 'DGC-001' },
  { name: 'Joint Care Oil', sku: 'JCO-001' },
  { name: 'Stress Relief Kit', sku: 'SRK-001' },
];

export default function Shiprocket() {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState(() => getSavedToken());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  const [svc, setSvc] = useState({ pickup_postcode: '', delivery_postcode: '', weight: '0.5', cod: 0 });
  const [couriers, setCouriers] = useState([]);
  const [recommendedCourierId, setRecommendedCourierId] = useState(null);

  const [order, setOrder] = useState({
    order_id: '', order_date: new Date().toISOString().split('T')[0], pickup_location: 'home',
    billing_customer_name: '', billing_last_name: '',
    billing_address: '', billing_city: '', billing_pincode: '',
    billing_state: '', billing_country: 'India',
    billing_email: '', billing_phone: '',
    shipping_is_billing: true,
    order_items: [{ name: 'Migraine Medicines', sku: 'MIG-001', units: 1, selling_price: '' }],
    payment_method: 'prepaid',
    sub_total: '', length: 15, breadth: 10, height: 6, weight: 0.5,
    lead_id: '',
  });

  const [shipmentId, setShipmentId] = useState('');
  const [courierId, setCourierId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [awbCode, setAwbCode] = useState('');
  const [rtsId, setRtsId] = useState('');
  const [rtsRecords, setRtsRecords] = useState([]);
  const [rtsLoading, setRtsLoading] = useState(false);
  const [pickupLocations, setPickupLocations] = useState([]);

  // Load pickup locations on mount
  useEffect(() => {
      api.get('/shiprocket/next-order-id')
      .then(res => setOrder(p => ({ ...p, order_id: res.data.data.order_id })))
      .catch(() => {});

    api.get('/shiprocket/pickup-locations')
      .then(res => {
        const locs = res.data?.data?.shipping_address || [];
        setPickupLocations(locs);
        if (locs.length > 0) {
          // Prefer 'Home-1', fallback to first location
          const preferred = locs.find(l => l.pickup_location === 'Home-1') || locs[0];
          setOrder(p => ({ ...p, pickup_location: preferred.pickup_location }));
          if (preferred.pin_code) setSvc(p => ({ ...p, pickup_postcode: String(preferred.pin_code) }));
        }
      }).catch(() => {});
  }, []);

  // Pre-fill from ReadyToShipment navigation
  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.rts) {
      const r = state.rts;
      const nameParts = (r.lead?.name || '').trim().split(' ');
      const address = [r.houseNo, r.postOffice, r.landmark].filter(Boolean).join(', ');
      setOrder(p => ({
        ...p,
        billing_customer_name: nameParts[0] || '',
        billing_last_name: nameParts.slice(1).join(' ') || '',
        billing_phone: r.lead?.phone || '',
        billing_email: r.lead?.email || '',
        billing_address: address || r.lead?.address || '',
        billing_city: r.cityVillage || r.district || '',
        billing_pincode: r.pincode || '',
        billing_state: r.state || '',
        lead_id: r.lead?._id || '',
        ...(r.title || r.task?.title ? { order_items: [{ name: r.title || r.task?.title, sku: '', units: 1, selling_price: r.price || '' }] } : {}),
        ...(r.price ? { sub_total: r.price } : {}),
      }));
      setRtsRecords([r]);
      if (r._id) setRtsId(r._id);
    }
    if (state.delivery_postcode) {
      const deliveryPostcode = state.delivery_postcode;
      const svcParams = { pickup_postcode: svc.pickup_postcode, delivery_postcode: deliveryPostcode, weight: '0.5', cod: 0 };
      setSvc(svcParams);
      setStep(1);
      // Auto-trigger serviceability check
      setLoading(true); setError(''); setResult(null);
      srSvc.checkServiceability({ pickup_postcode: svc.pickup_postcode, delivery_postcode: deliveryPostcode, weight: '0.5', cod: 0 })
        .then(res => {
          const list = res.data?.data?.data?.available_courier_companies || [];
          const recommended = res.data?.data?.data?.recommended_courier_company_id;
          setCouriers(list);
          if (recommended) { setCourierId(String(recommended)); setRecommendedCourierId(recommended); }
          setResult(res.data);
        })
        .catch(e => setError(e?.response?.data?.message || e.message))
        .finally(() => setLoading(false));
    }
    window.history.replaceState({}, '');
  }, []);

  const getValidToken = async () => {
    const saved = getSavedToken();
    if (saved) return saved;
    const res = await srSvc.login();
    const t = res.data.data.token;
    saveToken(t);
    setToken(t);
    return t;
  };

  const call = async (fn) => {
    setLoading(true); setError(''); setResult(null);
    try { setResult(await fn()); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setLoading(false); }
  };

  const goStep = (i) => { setStep(i); setResult(null); setError(''); };
  const setO = (k, v) => setOrder(p => ({ ...p, [k]: v }));
  const setItem = (k, v) => setOrder(p => ({ ...p, order_items: [{ ...p.order_items[0], [k]: v }] }));

  const renderStep = () => {
    if (step === 0) return (
      <div className="space-y-4 max-w-md">
        <p className="text-sm text-gray-500">Logs in using Shiprocket API user credentials from the server .env file.</p>
        <button onClick={() => call(async () => {
          const res = await srSvc.login();
          saveToken(res.data.data.token);
          setToken(res.data.data.token);
          return res.data;
        })} className="btn-primary">Get Token</button>
        {token && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            <div>
              <span className="text-green-700 text-sm font-semibold">Token active — valid for 24 hours</span>
              <p className="text-green-600 text-xs mt-0.5">Expires: {new Date(Number(localStorage.getItem(TOKEN_EXP_KEY))).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    );

    if (step === 1) return (
      <div className="space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pickup Pincode">
            {pickupLocations.length > 0 ? (
              <select className={inp} value={svc.pickup_postcode}
                onChange={e => setSvc(p => ({ ...p, pickup_postcode: e.target.value }))}>
                {pickupLocations.map(l => (
                  <option key={l.id} value={String(l.pin_code)}>
                    {l.pickup_location} | {l.address}{l.address_2 ? ', ' + l.address_2 : ''}, {l.city}, {l.state}-{l.pin_code}
                  </option>
                ))}
              </select>
            ) : (
              <input className={inp} placeholder="e.g. 110001" value={svc.pickup_postcode}
                onChange={e => setSvc(p => ({ ...p, pickup_postcode: e.target.value }))} />
            )}
          </Field>
          <Field label="Delivery Pincode">
            <input className={inp} placeholder="e.g. 226021" value={svc.delivery_postcode}
              onChange={e => setSvc(p => ({ ...p, delivery_postcode: e.target.value }))} />
          </Field>
          <Field label="Weight (kg)">
            <input className={inp} placeholder="e.g. 0.5" value={svc.weight}
              onChange={e => setSvc(p => ({ ...p, weight: e.target.value }))} />
          </Field>
          <Field label="Payment Type">
            <select className={inp} value={svc.cod} onChange={e => setSvc(p => ({ ...p, cod: e.target.value }))}>
              <option value={0}>Prepaid</option>
              <option value={1}>COD</option>
            </select>
          </Field>
        </div>
        <button onClick={() => call(async () => {
          const res = await srSvc.checkServiceability(svc);
          const list = res.data?.data?.data?.available_courier_companies || [];
          const recommended = res.data?.data?.data?.recommended_courier_company_id;
          setCouriers(list);
          if (recommended) { setCourierId(String(recommended)); setRecommendedCourierId(recommended); }
          return res.data;
        })} className="btn-primary">Check Serviceability</button>

        {couriers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="h-1 bg-green-500" />
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 text-sm">Available Couriers</h3>
              <span className="text-xs text-gray-400">{couriers.length} couriers found</span>
            </div>
            <div className="divide-y divide-gray-50">
              {couriers.map(c => (
                <div key={c.courier_company_id} className={`px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors ${courierId === String(c.courier_company_id) ? 'bg-green-50/60' : ''}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    {c.courier_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{c.courier_name} {recommendedCourierId === c.courier_company_id && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">★ Recommended</span>}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">₹{c.rate} · ETD: {c.etd}</span>
                      <span className={`text-xs font-semibold ${c.rating >= 4 ? 'text-green-600' : c.rating >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>★ {c.rating}</span>
                      {c.cod ? <span className="text-xs text-blue-600 font-medium">COD</span> : null}
                    </div>
                  </div>
                  <button onClick={() => { setCourierId(String(c.courier_company_id)); setO('weight', Number(svc.weight) || 1.23); setTimeout(() => goStep(2), 300); }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all ${courierId === String(c.courier_company_id) ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}>
                    {courierId === String(c.courier_company_id) ? '✓ Selected' : 'Select →'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    if (step === 2) return (
      <div className="space-y-5">
        {/* RTS Auto-fill */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-blue-500" />
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Auto-fill from Ready to Shipment</h3>
            <button onClick={async () => {
              setRtsLoading(true);
              try { const res = await api.get('/ready-to-shipment/for-shipment'); setRtsRecords(res.data.data || []); }
              catch { } finally { setRtsLoading(false); }
            }} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 transition-all font-semibold">
              {rtsLoading ? 'Loading...' : 'Load People'}
            </button>
          </div>
          {rtsRecords.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400">Click "Load People" to fetch Ready to Shipment records.</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-48 overflow-auto">
              {rtsRecords.map(r => {
                const nameParts = (r.lead?.name || '').trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                const address = [r.houseNo, r.postOffice, r.landmark].filter(Boolean).join(', ');
                return (
                  <div key={r._id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white uppercase"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                      {r.lead?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{r.lead?.name || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.lead?.phone} · {r.cityVillage}, {r.state} - {r.pincode}</p>
                    </div>
                    <button onClick={() => {
                      setO('billing_customer_name', firstName);
                      setO('billing_last_name', lastName);
                      setO('billing_phone', r.lead?.phone || '');
                      setO('billing_email', r.lead?.email || '');
                      setO('billing_address', address || r.lead?.address || '');
                      setO('billing_city', r.cityVillage || r.district || '');
                      setO('billing_pincode', r.pincode || '');
                      setO('billing_state', r.state || '');
                      setO('lead_id', r.lead?._id || '');
                      const productName = r.title || r.task?.title || 'Migraine Medicines';
                      const price = r.price || '';
                      setItem('name', productName);
                      if (price) { setItem('selling_price', price); setO('sub_total', price); }
                    }} className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white bg-green-600 hover:bg-green-700 transition-all whitespace-nowrap">
                      Fill →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Form */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-green-500" />
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">Order Info</h3>
          </div>
          <div className="px-5 py-4 grid grid-cols-4 gap-3">
            <Field label="Order ID (auto-assigned)">
              <input className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`} value={order.order_id || 'Will be assigned on create'} readOnly />
            </Field>
            <Field label="Order Date *"><input className={inp} type="date" value={order.order_date} onChange={e => setO('order_date', e.target.value)} /></Field>
            <Field label="Payment Method">
              <select className={inp} value={order.payment_method} onChange={e => setO('payment_method', e.target.value)}>
                <option value="prepaid">Prepaid</option>
                <option value="COD">COD</option>
              </select>
            </Field>
            <Field label="Pickup Location *">
              {pickupLocations.length > 0 ? (
                <select className={inp} value={order.pickup_location} onChange={e => setO('pickup_location', e.target.value)}>
                  {pickupLocations.map(l => (
                    <option key={l.id} value={l.pickup_location}>{l.pickup_location} — {l.address}, {l.city}</option>
                  ))}
                </select>
              ) : (
                <input className={inp} placeholder="Primary" value={order.pickup_location} onChange={e => setO('pickup_location', e.target.value)} />
              )}
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-blue-500" />
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">Delivery Details</h3>
            <p className="text-xs text-gray-400 mt-0.5">Enter the delivery details of your buyer</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Mobile Number *">
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">+91</span>
                  <input className={`${inp} rounded-l-none`} placeholder="Enter mobile number" value={order.billing_phone} onChange={e => setO('billing_phone', e.target.value)} />
                </div>
              </Field>
              <Field label="Full Name *">
                <input className={inp} placeholder="Enter Full Name" value={`${order.billing_customer_name}${order.billing_last_name ? ' ' + order.billing_last_name : ''}`}
                  onChange={e => {
                    const parts = e.target.value.trim().split(' ');
                    setO('billing_customer_name', parts[0] || '');
                    setO('billing_last_name', parts.slice(1).join(' ') || '');
                  }} />
              </Field>
              <Field label="Complete Address *">
                <input className={inp} placeholder="Enter Buyer's full address" value={order.billing_address} onChange={e => setO('billing_address', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Landmark (Optional)">
                <input className={inp} placeholder="Enter any nearby landmark" value={order.billing_address_2 || ''} onChange={e => setO('billing_address_2', e.target.value)} />
              </Field>
              <Field label="Pincode *">
                <input className={inp} placeholder="Enter pincode" value={order.billing_pincode} onChange={e => setO('billing_pincode', e.target.value)} />
              </Field>
              <Field label="City *">
                <input className={inp} placeholder="City" value={order.billing_city} onChange={e => setO('billing_city', e.target.value)} />
              </Field>
              <Field label="State *">
                <input className={inp} placeholder="State" value={order.billing_state} onChange={e => setO('billing_state', e.target.value)} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="billing_email_row" className="w-3.5 h-3.5 accent-green-600" checked />
              <label htmlFor="billing_email_row" className="text-xs text-gray-500">Billing Details are same as Delivery Details</label>
              <input className={`${inp} max-w-xs ml-4`} placeholder="Email (optional)" value={order.billing_email} onChange={e => setO('billing_email', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-purple-500" />
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Product Details</h3>
          </div>
          <div className="px-5 py-4 grid grid-cols-4 gap-3">
            <Field label="Product Name *">
              <select className={inp} value={order.order_items[0].name}
                onChange={e => {
                  const med = MEDICINES.find(m => m.name === e.target.value);
                  setItem('name', e.target.value);
                  if (med) setItem('sku', med.sku);
                }}>
                {MEDICINES.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="SKU"><input className={inp} placeholder="SKU-001" value={order.order_items[0].sku} onChange={e => setItem('sku', e.target.value)} /></Field>
            <Field label="Units *"><input className={inp} type="number" min="1" value={order.order_items[0].units} onChange={e => setItem('units', Number(e.target.value))} /></Field>
            <Field label="Price (₹) *"><input className={inp} type="number" value={order.order_items[0].selling_price} onChange={e => setItem('selling_price', Number(e.target.value))} /></Field>
          </div>
          <div className="px-5 pb-4 grid grid-cols-5 gap-3">
            {[['length','Length (cm)'],['breadth','Breadth (cm)'],['height','Height (cm)'],['weight','Weight (kg)'],['sub_total','Sub Total (₹) *']].map(([k,label]) => (
              <Field key={k} label={label}><input className={inp} type="number" value={order[k]} onChange={e => setO(k, Number(e.target.value))} /></Field>
            ))}
          </div>
        </div>

        <button onClick={() => call(async () => {
          // Validate required fields
          const missing = [];
          if (!order.order_date) missing.push('Order Date');
          if (!order.billing_customer_name) missing.push('First Name');
          if (!order.billing_phone) missing.push('Phone');
          if (String(order.billing_phone).replace(/\D/g,'').length !== 10) missing.push('Phone must be exactly 10 digits');
          if (!order.billing_address) missing.push('Address');
          if (!order.billing_city) missing.push('City');
          if (!order.billing_state) missing.push('State');
          if (!order.billing_pincode) missing.push('Pincode');
          if (!order.order_items[0].name) missing.push('Product Name');
          if (!order.order_items[0].selling_price) missing.push('Selling Price');
          if (!order.sub_total) missing.push('Sub Total');
          if (missing.length) throw new Error(`Please fill: ${missing.join(', ')}`);

          const payload = {
            billing_customer_name: order.billing_customer_name,
            billing_last_name: order.billing_last_name,
            billing_address: order.billing_address,
            billing_city: order.billing_city,
            billing_pincode: order.billing_pincode,
            billing_state: order.billing_state,
            billing_country: order.billing_country,
            billing_email: order.billing_email,
            billing_phone: order.billing_phone,
            order_date: order.order_date,
            pickup_location: order.pickup_location,
            payment_method: order.payment_method,
            order_items: order.order_items.map(i => ({ ...i, units: Number(i.units), selling_price: Number(i.selling_price) })),
            sub_total: Number(order.sub_total),
            weight: Number(order.weight),
            length: Number(order.length),
            breadth: Number(order.breadth),
            height: Number(order.height),
            ...(order.lead_id ? { lead_id: order.lead_id } : {}),
          };
          const res = await srSvc.createOrder(payload);
          const d = res.data.data;
          if (d?.status_code >= 400) throw new Error(d?.message || 'Order creation failed');
          const sid = d?.shipment_id ?? d?.payload?.shipment_id;
          const oid = d?.order_id ?? d?.payload?.order_id;
          // Use recommended courier from serviceability or already selected
          const recommended = d?.courier_company_id ?? d?.payload?.courier_company_id;
          if (recommended) setCourierId(String(recommended));
          if (sid) setShipmentId(String(sid));
          if (oid) setOrderId(String(oid));
          if (sid || oid) setTimeout(() => goStep(3), 1500);
          if (rtsId) api.patch(`/ready-to-shipment/${rtsId}/sent`).catch(() => {});
          return res.data;
        })} className="btn-primary">Create Order → Auto-proceed to Assign AWB</button>
      </div>
    );

    const simpleStep = (title, fields, btnLabel, onSubmit) => (
      <div className="space-y-4 max-w-md">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-green-500" />
          <div className="px-5 py-4 space-y-3">
            {fields.map(([label, val, setter]) => (
              <Field key={label} label={label}>
                <input className={inp} value={val} onChange={e => setter(e.target.value)} placeholder={val || '—'} />
              </Field>
            ))}
          </div>
        </div>
        <button onClick={onSubmit} className="btn-primary">{btnLabel}</button>
      </div>
    );

    if (step === 3) return (
      <div className="space-y-4 max-w-md">
        {!shipmentId && !orderId && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="text-red-600 text-sm font-medium">Complete Step 3 (Create Order) first.</span>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="h-1 bg-green-500" />
          <div className="px-5 py-4 space-y-3">
            <Field label="Shipment ID (auto-filled)"><input className={inp} value={shipmentId} onChange={e => setShipmentId(e.target.value)} placeholder="e.g. 123456" /></Field>
            <Field label="Courier ID">
              <input className={inp} value={courierId} onChange={e => setCourierId(e.target.value)} placeholder="e.g. 33" />
            </Field>
            {couriers.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select a courier</p>
                <div className="space-y-1 max-h-52 overflow-auto">
                  {couriers.map(c => (
                    <button key={c.courier_company_id}
                      onClick={() => setCourierId(String(c.courier_company_id))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                        courierId === String(c.courier_company_id) ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}>
                      <span className="font-medium">{c.courier_name} {recommendedCourierId === c.courier_company_id && <span className="text-green-600">★</span>}</span>
                      <span className="text-gray-400">ID: {c.courier_company_id} · ₹{c.rate}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={async () => {
                  const pincode = svc.delivery_postcode || order.billing_pincode;
                  if (!pincode) return;
                  setLoading(true);
                  try {
                    const svcRes = await srSvc.checkServiceability({
                      pickup_postcode: svc.pickup_postcode, delivery_postcode: pincode,
                      weight: svc.weight || order.weight, cod: order.payment_method === 'COD' ? 1 : 0
                    });
                    const list = svcRes.data?.data?.data?.available_courier_companies || [];
                    const recommended = svcRes.data?.data?.data?.recommended_courier_company_id;
                    setCouriers(list);
                    if (recommended) { setRecommendedCourierId(recommended); setCourierId(String(recommended)); }
                  } catch (e) { setError(e?.response?.data?.message || e.message); }
                  finally { setLoading(false); }
                }}
                disabled={!svc.delivery_postcode && !order.billing_pincode}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-all">
                🔄 Load available couriers
              </button>
            )}
          </div>
        </div>
        <button onClick={() => call(async () => {
          await getValidToken();
          const res = await srSvc.assignAWB(Number(shipmentId), Number(courierId));
          console.log('[AWB] full response:', JSON.stringify(res.data));
          const d = res.data.data;
          // Check failure: awb_assign_status=0 OR message indicates failure
          const assignStatus = d?.awb_assign_status ?? d?.response?.data?.awb_assign_status;
          const isFailure = assignStatus === 0 || (res.data.message && res.data.message !== 'AWB assigned successfully');
          if (isFailure) {
            // Auto-fetch couriers using billing pincode so user can pick a different one
            const pincode = order.billing_pincode || svc.delivery_postcode;
            if (pincode) {
              try {
                const svcRes = await srSvc.checkServiceability({
                  pickup_postcode: svc.pickup_postcode, delivery_postcode: pincode,
                  weight: svc.weight || order.weight, cod: order.payment_method === 'COD' ? 1 : 0
                });
                const list = svcRes.data?.data?.data?.available_courier_companies || [];
                const recommended = svcRes.data?.data?.data?.recommended_courier_company_id;
                if (list.length) { setCouriers(list); if (recommended) setRecommendedCourierId(recommended); }
              } catch { }
            }
            const errMsg = res.data.message
              || (typeof d?.response?.data === 'string' ? d.response.data : null)
              || d?.message
              || 'AWB failed. Select a different courier below.';
            throw new Error(errMsg);
          }
          const awb = d?.awb_code || d?.response?.data?.awb_code;
          if (awb) { setAwbCode(awb); setTimeout(() => goStep(4), 1500); }
          return res.data;
        })} className="btn-primary">Assign AWB → Auto-proceed to Generate Pickup</button>
      </div>
    );

    if (step === 4) return simpleStep('Generate Pickup',
      [['Shipment ID (auto-filled)', shipmentId, setShipmentId]],
      'Generate Pickup',
      () => call(() => srSvc.generatePickup(shipmentId).then(r => r.data))
    );
    if (step === 5) return simpleStep('Generate Manifest',
      [['Shipment ID (auto-filled)', shipmentId, setShipmentId]],
      'Generate Manifest',
      () => call(() => srSvc.generateManifest(shipmentId).then(r => r.data))
    );
    if (step === 6) return simpleStep('Print Manifest',
      [['Order ID (auto-filled)', orderId, setOrderId]],
      'Print Manifest',
      () => call(() => srSvc.printManifest([orderId]).then(r => r.data))
    );
    if (step === 7) return simpleStep('Generate Label',
      [['Shipment ID (auto-filled)', shipmentId, setShipmentId]],
      'Generate Label',
      () => call(() => srSvc.generateLabel(shipmentId).then(r => r.data))
    );
    if (step === 8) return simpleStep('Print Invoice',
      [['Order ID (auto-filled)', orderId, setOrderId]],
      'Print Invoice',
      () => call(() => srSvc.printInvoice([orderId]).then(r => r.data))
    );
    if (step === 9) return simpleStep('Track AWB',
      [['AWB Code (auto-filled)', awbCode, setAwbCode]],
      'Track Shipment',
      () => call(() => srSvc.trackByAWB(awbCode).then(r => r.data))
    );
  };

  const pdfUrl = result?.data?.label_url || result?.data?.manifest_url || result?.data?.invoice_url;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Shiprocket Integration</h2>
        {(shipmentId || orderId || awbCode || courierId) && (
          <div className="flex flex-wrap gap-2">
            {courierId && <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-medium shadow-sm">🚚 Courier: {courierId}</span>}
            {orderId && <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-medium shadow-sm">📦 Order: {orderId}</span>}
            {shipmentId && <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-medium shadow-sm">🏷 Shipment: {shipmentId}</span>}
            {awbCode && <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-medium shadow-sm">📍 AWB: {awbCode}</span>}
          </div>
        )}
      </div>

      {/* Step Tabs */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => goStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              step === i ? 'bg-gray-800 text-white border-gray-800 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${step === i ? 'bg-white' : 'bg-green-500'}`} />
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step > 0 && !token && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="text-yellow-700 text-sm font-medium">Session expired. Please login again (once per 24 hours).</span>
          </div>
          <button onClick={() => goStep(0)} className="text-xs font-semibold text-yellow-700 border border-yellow-300 px-3 py-1.5 rounded-xl hover:bg-yellow-100 transition-all">Go to Login</button>
        </div>
      )}

      {/* Step Content */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center justify-center">{step + 1}</span>
          <h3 className="font-bold text-gray-800">{STEPS[step]}</h3>
        </div>
        {renderStep()}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          Processing...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className="text-red-600 text-sm font-medium">{error}</span>
        </div>
      )}

      {result && pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          📄 Open PDF
        </a>
      )}
      {result && !pdfUrl && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          <span className="text-green-700 text-sm font-semibold">Success</span>
        </div>
      )}
    </div>
  );
}
