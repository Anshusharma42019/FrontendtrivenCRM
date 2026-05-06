import { NavLink } from 'react-router-dom';
import trivenLogo from '../assets/Triven_logo.png';
import { useAuth } from '../context/AuthContext';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { to: '/doctor-dashboard', label: 'Dashboard', roles: ['doctor'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { to: '/leads', label: 'Leads', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { to: '/pipeline', label: 'Action Required', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    ]
  },
  {
    label: 'Sales',
    items: [
      { to: '/cnp', label: 'CNP', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg> },
      { to: '/tasks', label: 'Tasks', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
      { to: '/follow-up', label: 'Follow Up', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
      { to: '/verification', label: 'Verification', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
    ]
  },
  {
    label: 'Logistics',
    items: [
      { to: '/ready-to-shipment', label: 'Ready to Ship', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
      { to: '/shiprocket', label: 'Shiprocket', roles: ['admin', 'manager', 'sales'], end: true,
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
      { to: '/shiprocket/ndr', label: 'NDR', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg> },
    ]
  },
  {
    label: 'Team',
    items: [
      { to: '/appointments', label: 'Appointments', roles: ['admin', 'manager', 'sales', 'doctor'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
      { to: '/attendance', label: 'Attendance', roles: ['admin', 'manager', 'sales'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
      { to: '/users', label: 'Staff', roles: ['admin', 'manager'],
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    ]
  },
];

export default function Sidebar({ open, onClose, unreadCount = 0 }) {
  const { user } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #071407 0%, #0d1f0d 40%, #0a1a0a 100%)' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-green-500/30 shadow-lg shadow-green-900/40">
              <img src={trivenLogo} alt="Triven" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-base tracking-tight">Triven</div>
              <div className="text-green-400/50 text-[11px] font-medium">Ayurveda CRM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(item => item.roles.includes(user?.role));
            if (!visibleItems.length) return null;
            return (
              <div key={group.label}>
                <p className="text-green-400/70 text-[10px] font-bold uppercase tracking-[0.15em] px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {visibleItems.map(({ to, icon, label, end }) => (
                    <NavLink key={to} to={to} end={!!end} onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative
                        ${isActive
                          ? 'bg-green-500/20 text-green-300 active-nav'
                          : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-400 rounded-r-full opacity-0 group-[.active-nav]:opacity-100 transition-opacity" />
                      <span className="transition-all duration-150 text-white/60 group-hover:text-white group-[.active-nav]:text-green-400">{icon}</span>
                      <span className="flex-1">{label}</span>
                      {label === 'Notifications' && unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-4 text-center font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400/80 text-[10px] font-medium">System Online</span>
          </div>
        </div>
      </aside>
    </>
  );
}
