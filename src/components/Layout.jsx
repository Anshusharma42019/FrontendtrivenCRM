import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../services/notification.service';
import API from '../api';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/pipeline': 'Pipeline',
  '/cnp': 'CNP',
  '/tasks': 'Tasks',
  '/verification': 'Verification',
  '/ready-to-shipment': 'Ready to Shipment',
  '/shiprocket': 'Shiprocket',
  '/shiprocket/orders': 'Orders',
  '/shiprocket/shipments': 'Shipments & Tracking',
  '/shiprocket/returns': 'Returns / Wallet / NDR',
  '/notifications': 'Notifications',
  '/users': 'Staff',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const pageTitle = PAGE_TITLES[location.pathname] || '';

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await getNotifications({ limit: 1 });
        if (active) setUnreadCount(res.unreadCount || 0);
      } catch (e) {
        if (e?.response?.status === 401) { active = false; clearInterval(t); }
      }
    };
    poll();
    const t = setInterval(poll, Number(import.meta.env.VITE_NOTIFICATION_POLL_INTERVAL) || 30000);
    return () => { active = false; clearInterval(t); };
  }, []);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5 MB.');
      return;
    }
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await API.patch('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data.data);
      setAvatarOpen(false);
    } catch {
      setAvatarError('Upload failed. Please try again.');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#f0f4f0' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} unreadCount={unreadCount} />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(240,244,240,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-500 hover:text-green-700 transition md:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          {/* Mobile brand */}
          <span className="text-sm font-bold text-green-800 md:hidden">Triven CRM</span>
          <div className="hidden md:flex flex-1 items-center">
            {pageTitle && (
              <h1 className="text-lg font-bold text-gray-800 tracking-tight">{pageTitle}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm hover:shadow-md transition-all text-gray-500 hover:text-green-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar button */}
            <div className="relative">
              <button
                id="avatar-btn"
                onClick={() => { setAvatarOpen(p => !p); setAvatarError(''); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                style={user?.avatar ? {} : { background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}
              >
                {user?.avatar
                  ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : initials
                }
              </button>

              {avatarOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                        style={user?.avatar ? {} : { background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}
                      >
                        {user?.avatar
                          ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                          : initials
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{user?.name}</div>
                        <div className="text-xs text-green-600 capitalize">{user?.role}</div>
                      </div>
                    </div>

                    {/* Change avatar button */}
                    <button
                      id="change-avatar-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-60"
                    >
                      {avatarLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Uploading…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                          Change photo
                        </>
                      )}
                    </button>

                    {avatarError && (
                      <p className="px-4 pb-2 text-xs text-red-500">{avatarError}</p>
                    )}

                    {/* Sign out */}
                    <button
                      onClick={() => { logout(); setAvatarOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium border-t border-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 min-w-0 overflow-auto h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}