import API from '../api';
export const fetchStats = () => API.get('/dashboard/stats').then(r => r.data.data);
export const fetchRevenueChart = (period = 'monthly') => API.get(`/dashboard/revenue-chart?period=${period}`).then(r => r.data.data);
export const fetchStaffStats = () => API.get('/dashboard/staff-stats').then(r => r.data.data);
export const saveStaffTarget = (target) => API.post('/dashboard/staff-target', { target }).then(r => r.data.data);
export const fetchStaffVerifications = () => API.get('/dashboard/staff-verifications').then(r => r.data.data);
export const fetchStaffTodayLists = () => API.get('/dashboard/staff-today-lists').then(r => r.data.data);
export const fetchStaffMonthlyChart = () => API.get('/dashboard/staff-monthly-chart').then(r => r.data.data);
export const fetchAllStaffStats = () => API.get('/dashboard/all-staff-stats').then(r => r.data.data);
