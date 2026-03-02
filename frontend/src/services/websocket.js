/**
 * WebSocket manager with auto-reconnect and event dispatch.
 * Connects to ws://host/ws?token=<jwt> for real-time updates.
 */

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000;
        this.isConnected = false;
        this.pingInterval = null;
    }

    connect(token) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
        if (!token) return;

        const url = `${WS_BASE}/ws?token=${token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[WS] Connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connection', { status: 'connected' });

            // Keep-alive ping every 30 seconds
            this.pingInterval = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const type = data.type;
                if (type) {
                    this.emit(type, data.data || data);
                }
            } catch (err) {
                console.error('[WS] Parse error:', err);
            }
        };

        this.ws.onclose = () => {
            console.log('[WS] Disconnected');
            this.isConnected = false;
            clearInterval(this.pingInterval);
            this.emit('connection', { status: 'disconnected' });
            this.attemptReconnect(token);
        };

        this.ws.onerror = (err) => {
            console.error('[WS] Error:', err);
        };
    }

    attemptReconnect(token) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[WS] Max reconnect attempts reached');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(token), delay);
    }

    disconnect() {
        clearInterval(this.pingInterval);
        if (this.ws) {
            this.ws.onclose = null; // Prevent auto-reconnect
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.listeners.clear();
    }

    /**
     * Send data through the WebSocket (e.g., GPS location updates).
     */
    send(data) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    /**
     * Subscribe to a specific event type.
     * Returns an unsubscribe function.
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((cb) => cb(data));
        }
    }
}

// Singleton
const wsManager = new WebSocketManager();
export default wsManager;
