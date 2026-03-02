import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses - try refresh token first
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken && !originalRequest.url?.includes('/api/auth/refresh')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('token', access_token);
          if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
          api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          processQueue(null, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
};

// ─── Patient / Emergencies ─────────────────────────────────────────────────────
export const emergencyAPI = {
  create: (data) => api.post('/api/emergencies/', data),
  getMy: () => api.get('/api/emergencies/my'),
};

// ─── EMS ────────────────────────────────────────────────────────────────────────
export const emsAPI = {
  getAmbulance: () => api.get('/api/ems/ambulance'),
  updateLocation: (data) => api.put('/api/ems/ambulance/location', data),
  updateStatus: (data) => api.put('/api/ems/ambulance/status', data),
  getIncidents: () => api.get('/api/ems/incidents'),
};

// ─── Hospital ──────────────────────────────────────────────────────────────────
export const hospitalAPI = {
  getMy: () => api.get('/api/hospitals/my'),
  updateBeds: (data) => api.put('/api/hospitals/beds', data),
  getIncidents: () => api.get('/api/hospitals/incidents'),
};

// ─── Incidents ─────────────────────────────────────────────────────────────────
export const incidentAPI = {
  updateStatus: (id, data) => api.put(`/api/incidents/${id}/status`, data),
};

export default api;
