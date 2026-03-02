import { create } from 'zustand';
import api from '../services/api';

const useDispatchStore = create((set, get) => ({
    incidents: [],
    activeIncident: null,
    ambulances: [],
    hospitals: [],
    stats: null,
    loading: false,
    error: null,

    // Load all incidents (admin view)
    fetchAllIncidents: async (filters = {}) => {
        set({ loading: true });
        try {
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.severity) params.set('severity', filters.severity);
            const res = await api.get(`/api/admin/incidents?${params}`);
            set({ incidents: res.data, loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    // Load system stats
    fetchSystemStats: async () => {
        try {
            const res = await api.get('/api/admin/stats');
            set({ stats: res.data });
        } catch (err) {
            set({ error: err.message });
        }
    },

    // Load all ambulances
    fetchAllAmbulances: async () => {
        try {
            const res = await api.get('/api/admin/ambulances');
            set({ ambulances: res.data });
        } catch (err) {
            set({ error: err.message });
        }
    },

    // Load all hospitals
    fetchAllHospitals: async () => {
        try {
            const res = await api.get('/api/admin/hospitals');
            set({ hospitals: res.data });
        } catch (err) {
            set({ error: err.message });
        }
    },

    setActiveIncident: (incident) => set({ activeIncident: incident }),

    // Handle real-time incident updates
    updateIncidentFromWS: (data) => {
        set((state) => ({
            incidents: state.incidents.map((inc) =>
                inc.id === data.incident_id
                    ? { ...inc, status: data.status }
                    : inc
            ),
        }));
    },

    clearError: () => set({ error: null }),
}));

export default useDispatchStore;
