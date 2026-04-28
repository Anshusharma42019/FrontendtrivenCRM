const configs = {
  'border-green-500':   { grad: 'from-green-500 to-emerald-600', glow: 'shadow-green-100', ring: 'ring-green-100' },
  'border-blue-500':    { grad: 'from-blue-500 to-cyan-600',     glow: 'shadow-blue-100',  ring: 'ring-blue-100' },
  'border-emerald-500': { grad: 'from-emerald-500 to-teal-600',  glow: 'shadow-emerald-100', ring: 'ring-emerald-100' },
  'border-teal-500':    { grad: 'from-teal-500 to-cyan-600',     glow: 'shadow-teal-100',  ring: 'ring-teal-100' },
  'border-yellow-500':  { grad: 'from-yellow-400 to-orange-500', glow: 'shadow-yellow-100', ring: 'ring-yellow-100' },
  'border-orange-400':  { grad: 'from-orange-400 to-amber-500',  glow: 'shadow-orange-100', ring: 'ring-orange-100' },
  'border-red-500':     { grad: 'from-red-500 to-rose-600',      glow: 'shadow-red-100',   ring: 'ring-red-100' },
  'border-purple-500':  { grad: 'from-purple-500 to-violet-600', glow: 'shadow-purple-100', ring: 'ring-purple-100' },
};

export default function StatCard({ label, value, icon, color = 'border-green-500', sub }) {
  const { grad, glow, ring } = configs[color] || configs['border-green-500'];
  return (
    <div className={`relative bg-white rounded-2xl p-5 shadow-md ${glow} hover:shadow-lg transition-all duration-200 overflow-hidden group`}
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      {/* subtle bg accent */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${grad} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md ring-4 ${ring}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-extrabold text-gray-800 tracking-tight leading-none">{value ?? '—'}</div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
