import { useCallback, useEffect, useState } from 'react';
import * as srSvc from '../services/shiprocket.service';

const cardCls = 'bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow';
const cardStyle = { border: '1px solid rgba(0,0,0,0.05)' };
const inp = 'border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500 bg-white';

const STATUS_LIST = [
  'DELIVERED',
  'RTO_DELIVERED',
  'IN_TRANSIT',
  'CANCELED',
  'NEW',
  'RTO_IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'IN_TRANSIT-EN-ROUTE',
  'REACHED_BACK_AT_SELLER_CITY',
  'UNDELIVERED-1ST_ATTEMPT',
  'PICKUP_EXCEPTION',
  'UNDELIVERED-2ND_ATTEMPT',
  'UNDELIVERED-3RD_ATTEMPT',
  'RTO_INITIATED',
  'REAACHED_AT_DESTINATION_HUB',
  'SHIPPED',
  'RTO_OFD',
  'PICKUP_SCHEDULED',
];

const DATE_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

const STATUS_STYLES = {
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  RTO_DELIVERED: 'border-blue-200 bg-blue-50 text-blue-700',
  IN_TRANSIT: 'border-amber-200 bg-amber-50 text-amber-700',
  CANCELED: 'border-red-200 bg-red-50 text-red-700',
  NEW: 'border-sky-200 bg-sky-50 text-sky-700',
  RTO_IN_TRANSIT: 'border-violet-200 bg-violet-50 text-violet-700',
  OUT_FOR_DELIVERY: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  'IN_TRANSIT-EN-ROUTE': 'border-orange-200 bg-orange-50 text-orange-700',
  REACHED_BACK_AT_SELLER_CITY: 'border-lime-200 bg-lime-50 text-lime-700',
  'UNDELIVERED-1ST_ATTEMPT': 'border-rose-200 bg-rose-50 text-rose-700',
  PICKUP_EXCEPTION: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  'UNDELIVERED-2ND_ATTEMPT': 'border-pink-200 bg-pink-50 text-pink-700',
  'UNDELIVERED-3RD_ATTEMPT': 'border-purple-200 bg-purple-50 text-purple-700',
  RTO_INITIATED: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  REAACHED_AT_DESTINATION_HUB: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  SHIPPED: 'border-green-200 bg-green-50 text-green-700',
  RTO_OFD: 'border-teal-200 bg-teal-50 text-teal-700',
  PICKUP_SCHEDULED: 'border-slate-200 bg-slate-50 text-slate-700',
};

const formatDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeStatus = (status) => String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
const formatStatusLabel = (status) => String(status || '').replace(/_/g, ' ');
const formatMoney = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDateParams = (preset, customFrom, customTo) => {
  if (preset === 'all') return {};
  const today = new Date();
  const to = formatDateInput(today);
  if (preset === 'today') return { filterType: 'range', from: to, to };
  if (preset === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const day = formatDateInput(d);
    return { filterType: 'range', from: day, to: day };
  }
  if (preset === 'last7') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { filterType: 'range', from: formatDateInput(d), to };
  }
  if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { filterType: 'range', from: formatDateInput(d), to };
  }
  if (preset === 'custom' && customFrom && customTo) {
    return { filterType: 'range', from: customFrom, to: customTo };
  }
  return {};
};

export default function OrderStatusBoard({
  title = 'Order Status',
  subtitle,
  defaultPreset = 'today',
}) {
  const [deliveredStats, setDeliveredStats] = useState({ count: 0, revenue: 0, statusBreakdown: [] });
  const [datePreset, setDatePreset] = useState(defaultPreset);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusOrders, setStatusOrders] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const loadDelivered = useCallback((params = {}) => {
    srSvc.getDeliveredStats(params).then(res => {
      const { count, revenue, statusBreakdown } = res.data?.data || {};
      setDeliveredStats({ count: count || 0, revenue: revenue || 0, statusBreakdown: statusBreakdown || [] });
    }).catch(() => {});
  }, []);

  const loadStatusOrders = useCallback((status, params = {}) => {
    setStatusLoading(true);
    setStatusError('');
    srSvc.getStatusOrders({ ...params, status, limit: 100 }).then(res => {
      setStatusOrders(res.data?.data?.data || []);
    }).catch(e => {
      setStatusOrders([]);
      setStatusError(e?.response?.data?.message || e.message || 'Unable to load orders');
    }).finally(() => setStatusLoading(false));
  }, []);

  const applyDateFilter = useCallback((preset = datePreset, from = filterFrom, to = filterTo) => {
    const params = getDateParams(preset, from, to);
    loadDelivered(params);
    if (selectedStatus) loadStatusOrders(selectedStatus, params);
  }, [datePreset, filterFrom, filterTo, loadDelivered, loadStatusOrders, selectedStatus]);

  const selectDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset !== 'custom') applyDateFilter(preset, filterFrom, filterTo);
  };

  const openStatusDetails = (status) => {
    setSelectedStatus(status);
    loadStatusOrders(status, getDateParams(datePreset, filterFrom, filterTo));
  };

  const statusCounts = deliveredStats.statusBreakdown.reduce((acc, item) => {
    const key = normalizeStatus(item._id);
    acc[key] = (acc[key] || 0) + item.count;
    return acc;
  }, {});

  const listedStatuses = new Set(STATUS_LIST.map(normalizeStatus));
  const statusCards = [
    ...STATUS_LIST.map(status => ({ status, count: statusCounts[status] || 0 })),
    ...deliveredStats.statusBreakdown
      .filter(item => item._id && !listedStatuses.has(normalizeStatus(item._id)))
      .map(item => ({ status: normalizeStatus(item._id), count: item.count })),
  ];

  const orderTotal = deliveredStats.statusBreakdown.reduce((sum, item) => sum + item.count, 0);

  useEffect(() => {
    setDatePreset(defaultPreset);
    loadDelivered(getDateParams(defaultPreset, '', ''));
  }, [defaultPreset, loadDelivered]);

  return (
    <div className={cardCls} style={cardStyle}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">{subtitle || `${orderTotal} orders in selected period`}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {DATE_FILTERS.map(filter => (
              <button key={filter.id} onClick={() => selectDatePreset(filter.id)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                  datePreset === filter.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {filter.label}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <>
              <input type="date" className={inp} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              <input type="date" className={inp} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </>
          )}
          <button onClick={() => applyDateFilter()}
            className="h-8 text-xs bg-green-600 text-white px-3 rounded-xl hover:bg-green-700 font-semibold inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
              <path d="M3 4h18M6 12h12M10 20h4"/>
            </svg>
            Apply
          </button>
        </div>
      </div>

      {statusCards.length === 0 ? (
        <p className="text-sm text-gray-300">No order data yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {statusCards.map(({ status, count }) => {
            const selected = selectedStatus === status;
            return (
              <button key={status} onClick={() => openStatusDetails(status)}
                className={`min-h-[86px] text-left rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  selected ? 'ring-2 ring-green-500 border-green-300 bg-green-50' : STATUS_STYLES[normalizeStatus(status)] || 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase leading-4 break-words">{formatStatusLabel(status)}</span>
                  <svg className="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.3} viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight">{count}</div>
              </button>
            );
          })}
        </div>
      )}

      {selectedStatus && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">{formatStatusLabel(selectedStatus)} Details</h4>
              <p className="text-xs text-gray-400 mt-1">{statusOrders.length} orders loaded</p>
            </div>
            <button onClick={() => { setSelectedStatus(''); setStatusOrders([]); }}
              className="h-8 text-xs bg-gray-100 text-gray-600 px-3 rounded-xl hover:bg-gray-200 font-semibold inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              Close
            </button>
          </div>

          {statusLoading && (
            <div className="py-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              Loading orders...
            </div>
          )}
          {!statusLoading && statusError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
              {statusError}
            </div>
          )}
          {!statusLoading && !statusError && statusOrders.length === 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-6 text-center text-sm text-gray-400">
              No orders found for this status and date filter.
            </div>
          )}
          {!statusLoading && !statusError && statusOrders.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {statusOrders.map(order => (
                <div key={order._id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-semibold">Order</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{order.order_id || order.shiprocket_order_id || '-'}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLES[normalizeStatus(order.status)] || 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      {formatStatusLabel(order.status || selectedStatus)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 font-semibold">Customer</p>
                      <p className="font-semibold text-gray-700 truncate">{order.billing_customer_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Phone</p>
                      <p className="font-semibold text-gray-700 truncate">{order.billing_phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Location</p>
                      <p className="font-semibold text-gray-700 truncate">
                        {[order.billing_city, order.billing_state, order.billing_pincode].filter(Boolean).join(', ') || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Date</p>
                      <p className="font-semibold text-gray-700">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">AWB</p>
                      <p className="font-mono font-semibold text-blue-600 truncate">{order.awb_code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Courier</p>
                      <p className="font-semibold text-gray-700 truncate">{order.courier_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Payment</p>
                      <p className="font-semibold text-gray-700 truncate">{order.payment_method || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Amount</p>
                      <p className="font-bold text-gray-800">{formatMoney(order.sub_total)}</p>
                    </div>
                  </div>
                  {order.order_items?.length > 0 && (
                    <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] text-gray-400 font-semibold mb-1">Items</p>
                      <p className="text-xs text-gray-700 truncate">
                        {order.order_items.map(item => `${item.name || 'Item'} x${item.units || 1}`).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
