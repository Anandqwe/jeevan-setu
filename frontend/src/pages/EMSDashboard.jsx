import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation, Power, PowerOff, MapPin, AlertTriangle,
  Ambulance, Activity, Clock, ArrowRight, User, Building2, Ban
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { emsAPI, incidentAPI } from '../services/api';
import wsManager from '../services/websocket';
import { toast } from '../store/toastStore';
import DashboardLayout from '../layout/DashboardLayout';
import { StatusBadge, Card, EmptyState } from '../shared/ui';
import ChatPanel from '../components/chat/ChatPanel';
import { staggerItem } from '../shared/utils/animations';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2382/2382461.png',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40],
});
const emergencyIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});
const hospitalIconMap = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/4320/4320371.png',
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], 14, { duration: 1 }); }, [lat, lng]);
  return null;
}

/* ─── Status progression ─── */
const nextStatusMap = {
  assigned: 'en_route',
  en_route: 'on_scene',
  on_scene: 'transporting',
  transporting: 'completed',
};

const statusConfig = {
  assigned: { label: 'Start En Route', icon: Navigation, gradient: 'from-blue-600 to-blue-500' },
  en_route: { label: 'Arrived On Scene', icon: MapPin, gradient: 'from-cyan-600 to-cyan-500' },
  on_scene: { label: 'Start Transport', icon: Ambulance, gradient: 'from-purple-600 to-purple-500' },
  transporting: { label: 'Complete Mission', icon: Activity, gradient: 'from-emerald-600 to-emerald-500' },
};

export default function EMSDashboard() {
  const { user } = useAuthStore();
  const [ambulance, setAmbulance] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [tracking, setTracking] = useState(false);
  const trackingRef = useRef(null);

  useEffect(() => { loadAmbulance(); loadIncidents(); }, []);

  useEffect(() => {
    const unsubs = [
      wsManager.on('ambulance_assigned', (data) => {
        toast.warning(`New emergency assigned! Patient: ${data.patient_name}`);
        loadIncidents();
      }),
      wsManager.on('incident_update', () => loadIncidents()),
      wsManager.on('incident_status_update', () => loadIncidents()),
    ];
    return () => { unsubs.forEach((u) => u()); if (trackingRef.current) clearInterval(trackingRef.current); };
  }, []);

  const loadAmbulance = async () => {
    try { const res = await emsAPI.getAmbulance(); setAmbulance(res.data); }
    catch { toast.error('Failed to load ambulance data'); }
  };

  const loadIncidents = async () => {
    try {
      const res = await emsAPI.getIncidents();
      setIncidents(res.data);
      setActiveIncident(res.data.find((i) => !['completed', 'cancelled'].includes(i.status)) || null);
    } catch { /* ignore */ }
  };

  const toggleTracking = () => {
    if (tracking) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
      setTracking(false);
      toast.info('GPS tracking stopped');
      return;
    }
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setTracking(true);
    toast.success('GPS tracking started');
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await emsAPI.updateLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setAmbulance(res.data);
          } catch {
            wsManager.send({ type: 'location_update', latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }
        },
        () => {
          if (ambulance) {
            const lat = ambulance.latitude + (Math.random() - 0.5) * 0.005;
            const lon = ambulance.longitude + (Math.random() - 0.5) * 0.005;
            emsAPI.updateLocation({ latitude: lat, longitude: lon }).then((res) => setAmbulance(res.data)).catch(() => {});
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    sendLocation();
    trackingRef.current = setInterval(sendLocation, 5000);
  };

  const updateStatus = async (status) => {
    try {
      const res = await emsAPI.updateStatus({ status });
      setAmbulance(res.data);
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const updateIncidentStatus = async (incidentId, status) => {
    try {
      await incidentAPI.updateStatus(incidentId, { status });
      toast.success(`Incident status → ${status.replace(/_/g, ' ')}`);
      loadIncidents();
      if (status === 'completed' || status === 'cancelled') updateStatus('available');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update incident');
    }
  };

  const mapCenter = ambulance ? [ambulance.latitude, ambulance.longitude] : [28.6139, 77.2090];
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  /* ─── Sidebar ─── */
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Ambulance Status */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Ambulance size={16} />
          </div>
          My Ambulance
        </h2>

        {ambulance ? (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="glass-card rounded-xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[0.65rem] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                  Current Status
                </span>
                <StatusBadge value={ambulance.status} size="sm" />
              </div>
              <div className="text-xs text-[var(--text-muted)] space-y-1">
                <p className="flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)] font-medium">ID:</span> #{ambulance.id} · {ambulance.capability_level}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin size={10} />
                  {ambulance.latitude.toFixed(4)}, {ambulance.longitude.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Quick Status */}
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                onClick={() => updateStatus('available')}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border
                  ${ambulance.status === 'available'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : 'bg-white/[0.03] text-[var(--text-muted)] border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
              >
                <Power size={12} /> Available
              </motion.button>
              <motion.button
                onClick={() => updateStatus('off_duty')}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border
                  ${ambulance.status === 'off_duty'
                    ? 'bg-gray-500/15 text-gray-400 border-gray-500/30 ring-1 ring-gray-500/20'
                    : 'bg-white/[0.03] text-[var(--text-muted)] border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
              >
                <PowerOff size={12} /> Off Duty
              </motion.button>
            </div>

            {/* GPS Tracking */}
            <motion.button
              onClick={toggleTracking}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all border
                ${tracking
                  ? 'bg-red-500/15 text-red-400 border-red-500/30 shadow-lg shadow-red-500/10'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/15'
                }`}
            >
              <Navigation size={14} className={tracking ? 'animate-spin' : ''} />
              {tracking ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
              {tracking && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                </span>
              )}
            </motion.button>
          </div>
        ) : (
          <div className="text-center py-6 text-[var(--text-muted)] text-sm">
            Loading ambulance data...
          </div>
        )}
      </div>

      {/* Active Assignment */}
      <AnimatePresence>
        {activeIncident && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--border-color)] overflow-hidden"
          >
            <div className="p-5">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Active Assignment
              </h3>

              <Card glow="red" hover={false} padding="p-4" className="border-red-500/20 space-y-3">
                <div className="flex gap-2">
                  <StatusBadge value={activeIncident.severity} />
                  <StatusBadge value={activeIncident.status} />
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <User size={11} className="text-green-400" />
                    {activeIncident.patient_name || 'Patient'}
                  </p>
                  <p className="flex items-center gap-2 text-[var(--text-muted)]">
                    <MapPin size={11} />
                    {activeIncident.latitude.toFixed(4)}, {activeIncident.longitude.toFixed(4)}
                  </p>
                  {activeIncident.hospital && (
                    <p className="flex items-center gap-2 text-purple-400">
                      <Building2 size={11} />
                      → {activeIncident.hospital.name}
                    </p>
                  )}
                  {activeIncident.description && (
                    <p className="text-[var(--text-secondary)] italic pt-1">{activeIncident.description}</p>
                  )}
                </div>

                {/* Action Buttons */}
                {nextStatusMap[activeIncident.status] && (
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      onClick={() => updateIncidentStatus(activeIncident.id, nextStatusMap[activeIncident.status])}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                        bg-gradient-to-r ${statusConfig[activeIncident.status]?.gradient || 'from-green-600 to-green-500'}
                        text-white text-xs font-bold shadow-lg transition-all`}
                    >
                      {statusConfig[activeIncident.status]?.icon && (
                        (() => { const Icon = statusConfig[activeIncident.status].icon; return <Icon size={12} />; })()
                      )}
                      {statusConfig[activeIncident.status]?.label || 'Next'}
                    </motion.button>
                    <motion.button
                      onClick={() => updateIncidentStatus(activeIncident.id, 'cancelled')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold
                        border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <Ban size={12} />
                    </motion.button>
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment History */}
      <div className="flex-1 overflow-y-auto">
        {incidents.length > 0 ? (
          <div className="p-4">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">
              All Assignments ({incidents.length})
            </h3>
            <div className="space-y-1.5">
              {incidents.map((inc, idx) => (
                <motion.div
                  key={inc.id}
                  {...staggerItem}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-3 rounded-xl border transition-all
                    ${inc.id === activeIncident?.id
                      ? 'bg-red-500/10 border-red-500/25'
                      : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge value={inc.severity} size="xs" />
                    <StatusBadge value={inc.status} size="xs" />
                  </div>
                  <p className="text-[0.58rem] text-[var(--text-muted)]">
                    {new Date(inc.created_at).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Ambulance}
            title="No assignments"
            description="You'll be notified when a new emergency is assigned."
          />
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      {/* Map */}
      <div className="h-full relative">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url={isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            }
          />
          {ambulance && (
            <>
              <MapRecenter lat={ambulance.latitude} lng={ambulance.longitude} />
              <Marker position={[ambulance.latitude, ambulance.longitude]} icon={ambulanceIcon}>
                <Popup>
                  <div className="text-xs font-medium">
                    <p className="font-bold text-sm mb-1">🚑 My Ambulance</p>
                    <p>Status: {ambulance.status}</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
          {activeIncident && (
            <>
              <Marker position={[activeIncident.latitude, activeIncident.longitude]} icon={emergencyIcon}>
                <Popup>
                  <div className="text-xs font-medium">
                    <p className="font-bold text-sm mb-1">📍 Patient Location</p>
                    <p>{activeIncident.patient_name}</p>
                  </div>
                </Popup>
              </Marker>
              {activeIncident.hospital && (
                <Marker position={[activeIncident.hospital.latitude, activeIncident.hospital.longitude]} icon={hospitalIconMap}>
                  <Popup>
                    <div className="text-xs font-medium">
                      <p className="font-bold text-sm mb-1">🏨 {activeIncident.hospital.name}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </>
          )}
        </MapContainer>

        {/* Tracking overlay */}
        {tracking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 z-[1000] glass-panel rounded-2xl px-4 py-3
              border border-cyan-500/20 shadow-xl shadow-cyan-500/10"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </span>
              <div className="text-xs">
                <p className="font-semibold text-cyan-400">GPS TRACKING ACTIVE</p>
                <p className="text-[var(--text-muted)]">Updating every 5s</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <ChatPanel />
    </DashboardLayout>
  );
}
