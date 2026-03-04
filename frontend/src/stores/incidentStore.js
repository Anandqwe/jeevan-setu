import { create } from 'zustand';
import {
  getIncidents,
  getIncident,
  createIncident as createIncidentApi,
  updateIncidentStatus as updateStatusApi,
} from '../api/incidents';

const useIncidentStore = create((set, get) => ({
  incidents: [],
  activeIncident: null,
  loading: false,
  error: null,

  fetchIncidents: async () => {
    set({ loading: true });
    try {
      const data = await getIncidents();
      set({ incidents: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchIncident: async (id) => {
    set({ loading: true });
    try {
      const data = await getIncident(id);
      set({ activeIncident: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createIncident: async (data) => {
    set({ loading: true, error: null });
    try {
      const incident = await createIncidentApi(data);
      set((state) => ({
        incidents: [incident, ...state.incidents],
        activeIncident: incident,
        loading: false,
      }));
      return incident;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create emergency request';
      set({ error: message, loading: false });
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    try {
      const updated = await updateStatusApi(id, status);
      set((state) => ({
        incidents: state.incidents.map((i) => (i.id === id ? updated : i)),
        activeIncident: state.activeIncident?.id === id ? updated : state.activeIncident,
      }));
      return updated;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update status';
      set({ error: message });
      throw error;
    }
  },

  // Called from WebSocket events
  onStatusChanged: (incident_id, new_status) => {
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.id === incident_id ? { ...i, status: new_status } : i
      ),
      activeIncident:
        state.activeIncident?.id === incident_id
          ? { ...state.activeIncident, status: new_status }
          : state.activeIncident,
    }));
  },

  onIncidentCreated: (incident) => {
    set((state) => ({
      incidents: [incident, ...state.incidents.filter((i) => i.id !== incident.id)],
    }));
  },

  clearError: () => set({ error: null }),
}));

export default useIncidentStore;
