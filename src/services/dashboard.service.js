import API from '../api';
export const fetchStats = (date, from, to) => {
  let url = `/dashboard/stats?date=${date || ''}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return API.get(url).then(r => r.data.data);
};
export const fetchRevenueChart = (period = 'monthly') => API.get(`/dashboard/revenue-chart?period=${period}`).then(r => r.data.data);
export const fetchStaffStats = (date, staffId, from, to) => {
  let url = `/dashboard/staff-stats?date=${date || ''}`;
  if (staffId) url += `&staffId=${staffId}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return API.get(url).then(r => r.data.data);
};
export const saveStaffTarget = (target) => API.post('/dashboard/staff-target', { target }).then(r => r.data.data);
export const fetchStaffVerifications = () => API.get('/dashboard/staff-verifications').then(r => r.data.data);
export const fetchStaffTodayLists = (date, staffId, from, to) => {
  let url = `/dashboard/staff-today-lists?date=${date || ''}`;
  if (staffId) url += `&staffId=${staffId}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return API.get(url).then(r => r.data.data);
};
export const fetchStaffMonthlyChart = () => API.get('/dashboard/staff-monthly-chart').then(r => r.data.data);
export const fetchAllStaffStats = (date) => API.get(`/dashboard/all-staff-stats${date ? `?date=${date}` : ''}`).then(r => r.data.data);
export const fetchStaffCommission = (month, year) => API.get(`/dashboard/staff-commission?month=${month}&year=${year}`).then(r => r.data.data);
export const fetchAllStaffCommissions = (month, year) => API.get(`/dashboard/all-staff-commissions?month=${month}&year=${year}`).then(r => r.data.data);
export const saveCommissionOverride = (data) => API.post('/dashboard/save-commission-override', data).then(r => r.data.data);
