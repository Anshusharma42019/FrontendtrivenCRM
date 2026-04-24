import API from '../api';

export const checkIn = (data = {}) => API.post('/attendance/check-in', data).then(r => r.data.data);
export const checkOut = (data = {}) => API.post('/attendance/check-out', data).then(r => r.data.data);
export const getTodayStatus = () => API.get('/attendance/today').then(r => r.data.data);
export const getMyAttendance = (params) => API.get('/attendance/me', { params }).then(r => r.data.data);
export const getAllAttendance = (params) => API.get('/attendance', { params }).then(r => r.data.data);
export const updateAttendance = (id, data) => API.patch(`/attendance/${id}`, data).then(r => r.data.data);
