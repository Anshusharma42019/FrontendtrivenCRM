import API from '../api';

export const getTasks = (params) => API.get('/tasks', { params }).then(r => r.data.data);
export const getDailyTasks = () => API.get('/tasks/daily').then(r => r.data.data);
export const createTask = (data) => API.post('/tasks', data).then(r => r.data.data);
export const updateTask = (id, data) => API.patch(`/tasks/${id}`, data).then(r => r.data.data);
export const deleteTask = (id) => API.delete(`/tasks/${id}`);
export const addTaskNote = (id, text) => API.post(`/tasks/${id}/notes`, { text }).then(r => r.data.data);
export const getCnpRecords = (filter) => API.get('/cnp', { params: filter ? { filter } : {} }).then(r => r.data.data);
export const incrementCnpCount = (id) => API.patch(`/cnp/${id}/increment`).then(r => r.data.data);
export const deleteCnpRecord = (id) => API.delete(`/cnp/${id}`);
export const getVerificationRecords = () => API.get('/verification').then(r => r.data.data);
export const updateVerificationStatus = (id, status, onHoldUntil) => API.patch(`/verification/${id}`, { status, ...(onHoldUntil && { onHoldUntil }) }).then(r => r.data.data);
export const updateVerificationRecord = (id, data) => API.patch(`/verification/${id}`, data).then(r => r.data.data);
export const deleteVerificationRecord = (id) => API.delete(`/verification/${id}`);
