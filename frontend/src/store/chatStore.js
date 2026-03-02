import { create } from 'zustand';
import api from '../services/api';
import wsManager from '../services/websocket';

const useChatStore = create((set, get) => ({
    messages: [],
    activeIncidentId: null,
    loading: false,

    setActiveIncident: (incidentId) => {
        set({ activeIncidentId: incidentId, messages: [] });
        if (incidentId) {
            get().fetchMessages(incidentId);
        }
    },

    fetchMessages: async (incidentId) => {
        set({ loading: true });
        try {
            const res = await api.get(`/api/chat/incident/${incidentId}`);
            set({ messages: res.data, loading: false });
        } catch {
            set({ loading: false });
        }
    },

    sendMessage: async (incidentId, message) => {
        try {
            // Send via REST
            await api.post('/api/chat/', { incident_id: incidentId, message });
            // WS will broadcast back to us
        } catch {
            // Fallback: send via WebSocket
            wsManager.send({
                type: 'chat_message',
                incident_id: incidentId,
                message,
            });
        }
    },

    addMessage: (msg) => {
        set((state) => {
            // Avoid duplicates
            if (state.messages.some(m => m.id === msg.id)) return state;
            return { messages: [...state.messages, msg] };
        });
    },
}));

export default useChatStore;
