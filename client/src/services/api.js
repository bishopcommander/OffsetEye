import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const configuredBaseUrl = (configuredApiUrl?.startsWith('http')
  ? configuredApiUrl
  : 'https://offseteye.onrender.com/api').replace(/\/+$/, '');
const apiBaseUrl = configuredBaseUrl.endsWith('/api')
  ? configuredBaseUrl
  : `${configuredBaseUrl}/api`;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization header if JWT token is stored in memory/session
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nwis_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to catch 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      sessionStorage.removeItem('nwis_token');
      sessionStorage.removeItem('nwis_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
