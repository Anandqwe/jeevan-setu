import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, AlertTriangle, Ambulance, Building2, Send,
  Crosshair, Clock, Phone, Heart, ChevronDown, ChevronUp,
  Activity, Shield
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { emergencyAPI } from '../services/api';
import wsManager from '../services/websocket';
import { toast } from '../store/toastStore';
import DashboardLayout from '../layout/DashboardLayout';
import { StatusBadge, Card, ProgressBar, EmptyState } from '../shared/ui';
import ChatPanel from '../components/chat/ChatPanel';
import { staggerItem } from '../shared/utils/animations';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2382/2382461.png',
  iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
});
const patientIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});
const hospitalIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/4320/4320371.png',
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 14, { duration: 1 });
  }, [lat, lng]);
  return null;
}

/* ─── Severity Selector ─── */
const severityOptions = [
  { value: 'low', label: 'Low', emoji: '🟢', color: 'border-emerald-500/30 bg-emerald-500/8', active: 'border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/30' },
  { value: 'medium', label: 'Medium', emoji: '🟡', color: 'border-amber-500/30 bg-amber-500/8', active: 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-500/30' },
  { value: 'high', label: 'High', emoji: '🟠', color: 'border-orange-500/30 bg-orange-500/8', active: 'border-orange-400 bg-orange-500/15 ring-1 ring-orange-500/30' },
  { value: 'critical', label: 'Critical', emoji: '🔴', color: 'border-red-500/30 bg-red-500/8', active: 'border-red-400 bg-red-500/15 ring-1 ring-red-500/30' },
];

/* ─── Status Timeline ─── */
const timelineSteps = [
  { key: 'reported', label: 'Reported', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/15' },
  { key: 'dispatched', label: 'Dispatched', icon: Send, color: 'text-blue-400 bg-blue-500/15' },
  { key: 'en_route', label: 'En Route', icon: Ambulance, color: 'text-cyan-400 bg-cyan-500/15' },
  { key: 'on_scene', label: 'On Scene', icon: Activity, color: 'text-purple-400 bg-purple-500/15' },
  { key: 'transporting', label: 'Transporting', icon: Heart, color: 'text-pink-400 bg-pink-500/15' },
  { key: 'completed', label: 'Completed', icon: Shield, color: 'text-emerald-400 bg-emerald-500/15' },
];

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [form, setForm] = useState({ latitude: '', longitude: '', severity: 'medium', description: '' });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => { loadIncidents(); }, []);

  useEffect(() => {
    const unsubs = [
      wsManager.on('incident_created', () => {
        toast.success('Emergency dispatched! Ambulance is on the way.');
        loadIncidents();
      }),
      wsManager.on('ambulance_location', (data) => {
        setAmbulancePos({ lat: data.latitude, lng: data.longitude });
      }),
      wsManager.on('incident_status_update', () => loadIncidents()),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loadIncidents = async () => {
    try {
      const res = await emergencyAPI.getMy();
      setIncidents(res.data);
      const active = res.data.find((i) => !['completed', 'cancelled'].includes(i.status));
      if (active) {
        setActiveIncident(active);
        if (active.ambulance) setAmbulancePos({ lat: active.ambulance.latitude, lng: active.ambulance.longitude });
      }
    } catch { /* ignore */ }
  };

  const detectLocation = () => {
    setGettingLocation(true);
    emergencyAPI.getMockLocation()
      .then((res) => {
        const loc = res.data;
        setForm((p) => ({
          ...p,
          latitude: Number(loc.latitude).toFixed(6),
          longitude: Number(loc.longitude).toFixed(6),
        }));
        toast.success(`Mock location loaded: ${loc.label || 'Demo point'}`);
      })
      .catch(() => {
        toast.error('Unable to load mock location. Please enter manually.');
      })
      .finally(() => setGettingLocation(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await emergencyAPI.create({
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        severity: form.severity,
        description: form.description,
      });
      toast.success('Emergency dispatched! Help is on the way.');
      setActiveIncident(res.data);
      if (res.data.ambulance) setAmbulancePos({ lat: res.data.ambulance.latitude, lng: res.data.ambulance.longitude });
      setForm({ latitude: '', longitude: '', severity: 'medium', description: '' });
      loadIncidents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create emergency request.');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = activeIncident
    ? [activeIncident.latitude, activeIncident.longitude]
    : form.latitude && form.longitude
    ? [parseFloat(form.latitude), parseFloat(form.longitude)]
    : [28.6139, 77.2090];

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const currentStepIdx = activeIncident ? timelineSteps.findIndex(s => s.key === activeIncident.status) : -1;

  /* ─── Sidebar ─── */
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Emergency Form */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
            <AlertTriangle size={16} />
          </div>
          Request Emergency
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location */}
          <div>
            <label className="text-[0.68rem] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Location
            </label>
            <motion.button
              type="button"
              onClick={detectLocation}
              disabled={gettingLocation}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 flex items-center justify-center gap-2.5 py-2.5 rounded-xl
                bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium
                hover:bg-blue-500/15 disabled:opacity-50 transition-all"
            >
              <Crosshair size={14} className={gettingLocation ? 'animate-spin' : ''} />
              {gettingLocation ? 'Detecting...' : 'Detect My Location'}
            </motion.button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="number" step="any" placeholder="Latitude" value={form.latitude}
                onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} required
                className="glass-input px-3 py-2.5 rounded-xl text-sm"
              />
              <input
                type="number" step="any" placeholder="Longitude" value={form.longitude}
                onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} required
                className="glass-input px-3 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="text-[0.68rem] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Severity
            </label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {severityOptions.map((opt) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, severity: opt.value }))}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all
                    ${form.severity === opt.value ? opt.active : opt.color + ' hover:bg-white/5'}`}
                >
                  <span className="text-sm">{opt.emoji}</span>
                  <span className="text-[0.6rem]">{opt.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[0.68rem] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe the emergency..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="glass-input w-full mt-2 px-3 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: 0.97 }}
            className={`relative w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
              text-white font-bold text-sm shadow-lg transition-all overflow-hidden
              ${loading
                ? 'bg-gray-600 cursor-wait'
                : 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/25 hover:shadow-red-500/40'
              }`}
          >
            {!loading && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
            <Send size={16} className="relative z-10" />
            <span className="relative z-10">
              {loading ? 'Dispatching...' : 'Request Emergency'}
            </span>
          </motion.button>
        </form>
      </div>

      {/* Active Incident */}
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
                Active Incident
              </h3>

              <Card glow="red" hover={false} padding="p-4" className="border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge value={activeIncident.severity} />
                  <StatusBadge value={activeIncident.status} />
                </div>

                {activeIncident.hospital && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
                    <Building2 size={12} className="text-purple-400" />
                    {activeIncident.hospital.name}
                  </div>
                )}

                {activeIncident.ambulance && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
                    <Ambulance size={12} className="text-cyan-400" />
                    Ambulance #{activeIncident.ambulance.id} — {activeIncident.ambulance.capability_level}
                  </div>
                )}

                <p className="text-[0.6rem] text-[var(--text-muted)]">
                  {new Date(activeIncident.created_at).toLocaleString()}
                </p>

                {/* Timeline */}
                <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5">
                    {timelineSteps.map((step, idx) => {
                      const Icon = step.icon;
                      const reached = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div key={step.key} className="flex items-center gap-1.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all
                              ${isCurrent ? step.color + ' ring-1 ring-white/20' : reached ? step.color + ' opacity-60' : 'bg-white/5 text-[var(--text-muted)]'}`}
                            title={step.label}
                          >
                            <Icon size={10} />
                          </div>
                          {idx < timelineSteps.length - 1 && (
                            <div className={`w-3 h-0.5 rounded-full ${reached && idx < currentStepIdx ? 'bg-white/20' : 'bg-white/5'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {incidents.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold 
              text-[var(--text-muted)] uppercase tracking-widest hover:bg-white/3 transition-colors"
          >
            <span>History ({incidents.length})</span>
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4 space-y-1.5 overflow-hidden"
              >
                {incidents.map((inc, idx) => (
                  <motion.div
                    key={inc.id}
                    {...staggerItem}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => {
                      setActiveIncident(inc);
                      if (inc.ambulance) setAmbulancePos({ lat: inc.ambulance.latitude, lng: inc.ambulance.longitude });
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all border
                      ${inc.id === activeIncident?.id
                        ? 'bg-red-500/10 border-red-500/25'
                        : 'bg-white/[0.02] border-transparent hover:border-white/8 hover:bg-white/[0.04]'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge value={inc.severity} size="xs" />
                      <StatusBadge value={inc.status} size="xs" />
                    </div>
                    {inc.description && (
                      <p className="text-xs text-[var(--text-secondary)] truncate mt-1">{inc.description}</p>
                    )}
                    <p className="text-[0.58rem] text-[var(--text-muted)] mt-1">
                      {new Date(inc.created_at).toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
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
          {activeIncident && (
            <>
              <MapRecenter lat={activeIncident.latitude} lng={activeIncident.longitude} />
              <Marker position={[activeIncident.latitude, activeIncident.longitude]} icon={patientIcon}>
                <Popup>
                  <div className="text-xs font-medium">
                    <p className="font-bold text-sm mb-1">📍 Emergency Location</p>
                    <p>Severity: {activeIncident.severity}</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
          {ambulancePos && (
            <Marker position={[ambulancePos.lat, ambulancePos.lng]} icon={ambulanceIcon}>
              <Popup>
                <div className="text-xs font-medium">
                  <p className="font-bold text-sm mb-1">🚑 Ambulance (Live)</p>
                  <p>Tracking in real-time</p>
                </div>
              </Popup>
            </Marker>
          )}
          {activeIncident?.hospital && (
            <Marker
              position={[activeIncident.hospital.latitude, activeIncident.hospital.longitude]}
              icon={hospitalIcon}
            >
              <Popup>
                <div className="text-xs font-medium">
                  <p className="font-bold text-sm mb-1">🏨 {activeIncident.hospital.name}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Floating status overlay */}
        {activeIncident && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 z-[1000] glass-panel rounded-2xl px-4 py-3
              border border-[var(--border-color)] shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text-primary)]">
                  {activeIncident.status.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="text-[var(--text-muted)]">
                  Incident #{activeIncident.id}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <ChatPanel />
    </DashboardLayout>
  );
}
