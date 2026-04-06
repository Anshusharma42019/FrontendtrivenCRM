import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

API.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('crmTokens') || 'null');
  if (tokens?.access?.token) {
    config.headers.Authorization = `Bearer ${tokens.access.token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const tokens = JSON.parse(localStorage.getItem('crmTokens') || 'null');
        const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh-tokens`, {
          refreshToken: tokens?.refresh?.token,
        });
        localStorage.setItem('crmTokens', JSON.stringify(data.data));
        original.headers.Authorization = `Bearer ${data.data.access.token}`;
        return API(original);
      } catch {
        localStorage.removeItem('crmTokens');
        localStorage.removeItem('crmUser');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
