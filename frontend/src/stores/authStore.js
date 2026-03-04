import { create } from 'zustand';
import { login as loginApi, register as registerApi, getMe } from '../api/auth';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(sessionStorage.getItem('user') || 'null'),
  token: sessionStorage.getItem('access_token') || null,
  role: sessionStorage.getItem('role') || null,
  isAuthenticated: !!sessionStorage.getItem('access_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginApi(email, password);
      sessionStorage.setItem('access_token', data.access_token);
      sessionStorage.setItem('refresh_token', data.refresh_token);
      sessionStorage.setItem('role', data.role);

      // Fetch user profile
      const user = await getMe();
      sessionStorage.setItem('user', JSON.stringify(user));

      set({
        token: data.access_token,
        role: data.role,
        user,
        isAuthenticated: true,
        loading: false,
      });
      return data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  register: async (name, email, password, role) => {
    set({ loading: true, error: null });
    try {
      const user = await registerApi(name, email, password, role);
      set({ loading: false });
      return user;
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('user');
    set({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
