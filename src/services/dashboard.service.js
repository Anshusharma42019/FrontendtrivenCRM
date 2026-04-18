import API from '../api';
export const fetchStats = () => API.get('/dashboard/stats').then(r => r.data.data);
export const fetchRevenueChart = (period = 'monthly') => API.get(`/dashboard/revenue-chart?period=${period}`).then(r => r.data.data);
