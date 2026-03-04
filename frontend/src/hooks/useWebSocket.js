import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_URL } from '../utils/constants';
import useAuthStore from '../stores/authStore';
import useTrackingStore from '../stores/trackingStore';
import useIncidentStore from '../stores/incidentStore';
import useHospitalStore from '../stores/hospitalStore';

const useWebSocket = () => {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const token = useAuthStore((s) => s.token);
  const updatePosition = useTrackingStore((s) => s.updatePosition);
  const onStatusChanged = useIncidentStore((s) => s.onStatusChanged);
  const onIncidentCreated = useIncidentStore((s) => s.onIncidentCreated);
  const updateBedCount = useHospitalStore((s) => s.updateBedCount);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventType, data } = message;

        switch (eventType) {
          case 'ambulance_position':
            updatePosition(data.ambulance_id, data.latitude, data.longitude);
            break;
          case 'status_changed':
            onStatusChanged(data.incident_id, data.new_status);
            break;
          case 'incident_created':
          case 'emergency_requested':
          case 'ambulance_assigned':
          case 'hospital_assigned':
            onIncidentCreated(data);
            break;
          case 'bed_updated':
            updateBedCount(data.hospital_id, data.available_icu_beds);
            break;
          case 'connected':
            console.log('[WS] Acknowledged:', data);
            break;
          default:
            console.log('[WS] Unknown event:', eventType, data);
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setConnected(false);
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, [token, updatePosition, onStatusChanged, onIncidentCreated, updateBedCount]);

  const sendMessage = useCallback((event, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }
    return () => disconnect();
  }, [token, connect, disconnect]);

  return { connected, sendMessage, disconnect };
};

export default useWebSocket;
