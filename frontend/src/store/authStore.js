import { create } from 'zustand';
import { authAPI } from '../services/api';
import wsManager from '../services/websocket';

const useAuthStore = create((set, get) => ({
    user: (() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    })(),
    token: localStorage.getItem('token'),
    loading: true,

    initialize: async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const res = await authAPI.getMe();
                set({ user: res.data, token, loading: false });
                localStorage.setItem('user', JSON.stringify(res.data));
                wsManager.connect(token);
            } catch {
                get().logout();
                set({ loading: false });
            }
        } else {
            set({ loading: false });
        }
    },

    login: async (email, password) => {
        const res = await authAPI.login({ email, password });
        const accessToken = res.data.access_token;
        localStorage.setItem('token', accessToken);
        if (res.data.refresh_token) {
            localStorage.setItem('refresh_token', res.data.refresh_token);
        }

        const meRes = await authAPI.getMe();
        set({ user: meRes.data, token: accessToken });
        localStorage.setItem('user', JSON.stringify(meRes.data));
        wsManager.connect(accessToken);
        return meRes.data;
    },

    register: async (data) => {
        const res = await authAPI.register(data);
        return res.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null });
        wsManager.disconnect();
    },
}));

export default useAuthStore;
