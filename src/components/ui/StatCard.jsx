const gradients = {
  'border-green-500':   'from-green-400 to-emerald-500',
  'border-blue-500':    'from-blue-400 to-cyan-500',
  'border-emerald-500': 'from-emerald-400 to-teal-500',
  'border-yellow-500':  'from-yellow-400 to-orange-400',
  'border-orange-400':  'from-orange-400 to-amber-500',
  'border-red-500':     'from-red-400 to-rose-500',
};

export default function StatCard({ label, value, icon, color = 'border-green-500', sub }) {
  const grad = gradients[color] || 'from-green-400 to-emerald-500';
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800 tracking-tight">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
