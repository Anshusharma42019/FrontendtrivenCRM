import API from '../api';

export const getLeads = (params) => API.get('/leads', { params }).then(r => r.data.data);
export const getLead = (id) => API.get(`/leads/${id}`).then(r => r.data.data);
export const createLead = (data) => API.post('/leads', data).then(r => r.data.data);
export const updateLead = (id, data) => API.patch(`/leads/${id}`, data).then(r => r.data.data);
export const deleteLead = (id) => API.delete(`/leads/${id}`);
export const assignLead = (id, assignedTo) => API.patch(`/leads/${id}/assign`, { assignedTo }).then(r => r.data.data);
export const addLeadNote = (id, text) => API.post(`/leads/${id}/notes`, { text }).then(r => r.data.data);
export const markCNP = (id) => API.patch(`/leads/${id}/cnp`).then(r => r.data.data);
export const unmarkCNP = (id) => API.patch(`/leads/${id}/uncnp`).then(r => r.data.data);
