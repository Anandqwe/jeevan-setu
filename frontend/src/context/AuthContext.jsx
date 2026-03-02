import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import wsManager from '../services/websocket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Verify token on mount
    useEffect(() => {
        if (token) {
            authAPI.getMe()
                .then((res) => {
                    setUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                    wsManager.connect(token);
                })
                .catch(() => {
                    logout();
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login({ email, password });
        const accessToken = res.data.access_token;
        localStorage.setItem('token', accessToken);
        setToken(accessToken);

        const meRes = await authAPI.getMe();
        setUser(meRes.data);
        localStorage.setItem('user', JSON.stringify(meRes.data));

        wsManager.connect(accessToken);
        return meRes.data;
    };

    const register = async (data) => {
        const res = await authAPI.register(data);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        wsManager.disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
