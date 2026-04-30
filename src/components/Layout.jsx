import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../services/notification.service';
import { searchByPhone } from '../services/lead.service';
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
  '/shiprocket/ndr': 'NDR',
  '/shiprocket/ndr/detail': 'NDR Details',
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
  const searchRef = useRef(null);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const pageTitle = PAGE_TITLES[location.pathname] || '';

  const STATUS_COLORS = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    interested: 'bg-green-100 text-green-700',
    follow_up: 'bg-purple-100 text-purple-700',
    closed_won: 'bg-emerald-100 text-emerald-700',
    closed_lost: 'bg-red-100 text-red-700',
    on_hold: 'bg-gray-100 text-gray-600',
    old: 'bg-orange-100 text-orange-700',
  };

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 3) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    try {
      const data = await searchByPhone(q.trim());
      setSearchResults(data);
      setSearchOpen(true);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(phoneQuery), 350);
    return () => clearTimeout(t);
  }, [phoneQuery, doSearch]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4f0' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} unreadCount={unreadCount} />

      <div className="flex-1 md:ml-64 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between glass shadow-sm shadow-black/5"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <button onClick={() => setSidebarOpen(true)} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-gray-500 hover:text-green-700 hover:scale-105 active:scale-95 transition-all md:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          
          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-lg font-extrabold tracking-tight text-green-800">Triven</span>
          </div>

          <div className="hidden md:flex flex-1 items-center gap-4">
            {pageTitle && (
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">{pageTitle}</h1>
            )}
            {/* Global Phone Search */}
            <div ref={searchRef} className="relative ml-4">
              <div className="flex items-center gap-2.5 bg-white/50 rounded-2xl shadow-sm px-4 py-2 border border-gray-200 focus-within:border-green-400 focus-within:ring-4 focus-within:ring-green-500/10 transition-all w-72">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={e => setPhoneQuery(e.target.value)}
                  onFocus={() => phoneQuery.trim().length >= 3 && setSearchOpen(true)}
                  placeholder="Search lead or order..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
                {searchLoading && (
                  <svg className="w-3.5 h-3.5 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
                {phoneQuery && !searchLoading && (
                  <button onClick={() => { setPhoneQuery(''); setSearchResults([]); setSearchOpen(false); }} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              {searchOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-[92vw] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">No person found with this phone number</div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                      {searchResults.map(lead => (
                        <div key={lead._id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-800 text-sm">{lead.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {lead.status?.replace('_', ' ')}
                                </span>
                                {lead.cnp && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-600">CNP</span>}
                              </div>
                              <div className="text-xs text-green-700 font-medium mt-0.5">{lead.phone}</div>
                              {lead.email && <div className="text-xs text-gray-500 truncate">{lead.email}</div>}
                              {lead.address && <div className="text-xs text-gray-400 truncate">{lead.address}</div>}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {lead.source && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">{lead.source.replace('_', ' ')}</span>}
                                {lead.type && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full capitalize">{lead.type}</span>}
                                {lead.assignedTo && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><svg className="w-2.5 h-2.5 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {lead.assignedTo.name}</span>}
                              </div>
                              {lead.problem && <div className="text-xs text-gray-500 mt-1 italic truncate">&ldquo;{lead.problem}&rdquo;</div>}
                            </div>
                            {lead.revenue > 0 && (
                              <div className="text-xs font-semibold text-emerald-600 flex-shrink-0">₹{lead.revenue.toLocaleString()}</div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-400">
                              Added {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => { navigate(`/leads?openId=${lead._id}`); setSearchOpen(false); setPhoneQuery(''); setSearchResults([]); }}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white"
                              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                            >
                              View Detail
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
        <main className="flex-1 overflow-y-auto p-main md:p-6 min-w-0 pb-safe">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
