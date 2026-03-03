import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Minus, Plus, Bed, Activity, User,
  Ambulance, Clock, Heart, AlertTriangle, TrendingUp
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { hospitalAPI, incidentAPI } from '../services/api';
import wsManager from '../services/websocket';
import { toast } from '../store/toastStore';
import DashboardLayout from '../layout/DashboardLayout';
import { StatusBadge, Card, ProgressBar, StatCard, EmptyState } from '../shared/ui';
import ChatPanel from '../components/chat/ChatPanel';
import { staggerItem } from '../shared/utils/animations';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const hospitalMapIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/4320/4320371.png',
  iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40],
});
const ambulanceMapIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2382/2382461.png',
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});

export default function HospitalDashboard() {
  const { user } = useAuthStore();
  const [hospital, setHospital] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [bedCount, setBedCount] = useState('');

  const mergeIncidentPatch = (patch) => {
    if (!patch?.incident_id) return;
    setIncidents((prev) => prev.map((inc) => {
      if (inc.id !== patch.incident_id) return inc;
      const next = { ...inc, ...patch };
      if (patch.latitude != null && patch.longitude != null && inc.ambulance) {
        next.ambulance = {
          ...inc.ambulance,
          latitude: patch.latitude,
          longitude: patch.longitude,
        };
      }
      return next;
    }));
  };

  useEffect(() => { loadHospital(); loadIncidents(); }, []);

  useEffect(() => {
    const unsubs = [
      wsManager.on('hospital_assigned', (data) => {
        toast.warning(`Incoming patient: ${data.patient_name} (Severity: ${data.severity})`);
        loadIncidents();
        loadHospital();
      }),
      wsManager.on('incident_update', () => loadIncidents()),
      wsManager.on('incident_status_update', (data) => { mergeIncidentPatch(data); loadHospital(); }),
      wsManager.on('ambulance_location_update', (data) => mergeIncidentPatch(data)),
      wsManager.on('hospital_readiness_update', (data) => mergeIncidentPatch(data)),
      wsManager.on('patient_arrival_update', (data) => mergeIncidentPatch(data)),
      wsManager.on('patient_handover_update', (data) => { mergeIncidentPatch(data); loadHospital(); }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loadHospital = async () => {
    try {
      const res = await hospitalAPI.getMy();
      setHospital(res.data);
      setBedCount(res.data.available_icu_beds.toString());
    } catch { toast.error('Failed to load hospital data'); }
  };

  const loadIncidents = async () => {
    try { const res = await hospitalAPI.getIncidents(); setIncidents(res.data); }
    catch { /* ignore */ }
  };

  const updateBeds = async () => {
    try {
      const res = await hospitalAPI.updateBeds({ available_icu_beds: parseInt(bedCount) });
      setHospital(res.data);
      toast.success('Bed count updated');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update beds'); }
  };

  const updateReadiness = async (incidentId, ready) => {
    try {
      const res = await incidentAPI.updateHospitalReadiness(incidentId, { hospital_ready: ready });
      mergeIncidentPatch({
        incident_id: res.data.id,
        hospital_ready: res.data.hospital_ready,
        status: res.data.status,
      });
      toast.success(`Hospital readiness marked ${ready ? 'ready' : 'not ready'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update readiness');
    }
  };

  const updateArrival = async (incidentId, reached) => {
    try {
      const res = await incidentAPI.updateArrival(incidentId, { patient_reached_hospital: reached });
      mergeIncidentPatch({
        incident_id: res.data.id,
        patient_reached_hospital: res.data.patient_reached_hospital,
        arrived_at_hospital_at: res.data.arrived_at_hospital_at,
        status: res.data.status,
      });
      toast.success(`Arrival ${reached ? 'confirmed' : 'cleared'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update arrival');
    }
  };

  const completeHandover = async (incidentId) => {
    try {
      const res = await incidentAPI.updateHandover(incidentId, { handover_completed: true });
      mergeIncidentPatch({
        incident_id: res.data.id,
        handover_completed_at: res.data.handover_completed_at,
        status: res.data.status,
      });
      loadHospital();
      toast.success('Handover completed');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete handover');
    }
  };

  const activeIncidents = incidents.filter((i) => !['completed', 'cancelled'].includes(i.status));
  const pastIncidents = incidents.filter((i) => ['completed', 'cancelled'].includes(i.status));
  const mapCenter = hospital ? [hospital.latitude, hospital.longitude] : [28.6139, 77.2090];
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const occupancy = hospital ? ((hospital.total_icu_beds - hospital.available_icu_beds) / hospital.total_icu_beds * 100) : 0;

  /* ─── Sidebar ─── */
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Hospital Info */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Building2 size={16} />
          </div>
          {hospital?.name || 'My Hospital'}
        </h2>

        {hospital && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass-card p-3.5 rounded-xl text-center">
                <p className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Specialty</p>
                <p className="text-sm font-bold text-purple-400 capitalize mt-1">{hospital.specialty}</p>
              </div>
              <div className="glass-card p-3.5 rounded-xl text-center">
                <p className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Active Cases</p>
                <p className="text-sm font-bold text-orange-400 mt-1">{activeIncidents.length}</p>
              </div>
              <div className="glass-card p-3.5 rounded-xl text-center">
                <p className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Total ICU</p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{hospital.total_icu_beds}</p>
              </div>
              <div className="glass-card p-3.5 rounded-xl text-center border border-emerald-500/20">
                <p className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Available ICU</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">{hospital.available_icu_beds}</p>
              </div>
            </div>

            {/* Occupancy */}
            <ProgressBar
              value={occupancy}
              label="Bed Occupancy"
              color={occupancy > 80 ? 'red' : occupancy > 60 ? 'amber' : 'green'}
              size="md"
            />

            {/* Bed Management */}
            <Card hover={false} padding="p-4" className="border-purple-500/10">
              <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
                <Bed size={13} className="text-purple-400" />
                Update Available Beds
              </p>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => setBedCount((p) => Math.max(0, parseInt(p) - 1).toString())}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl
                    bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)]
                    hover:bg-white/10 transition-colors"
                >
                  <Minus size={14} />
                </motion.button>
                <input
                  type="number"
                  min="0"
                  max={hospital.total_icu_beds}
                  value={bedCount}
                  onChange={(e) => setBedCount(e.target.value)}
                  className="flex-1 text-center px-2 py-2 rounded-xl glass-input
                    text-[var(--text-primary)] text-sm font-bold"
                />
                <motion.button
                  onClick={() => setBedCount((p) => Math.min(hospital.total_icu_beds, parseInt(p) + 1).toString())}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl
                    bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)]
                    hover:bg-white/10 transition-colors"
                >
                  <Plus size={14} />
                </motion.button>
                <motion.button
                  onClick={updateBeds}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500
                    text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
                >
                  Update
                </motion.button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Incoming Patients */}
      {activeIncidents.length > 0 && (
        <div className="p-5 border-b border-[var(--border-color)]">
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Incoming Patients ({activeIncidents.length})
          </h3>
          <div className="space-y-2">
            {activeIncidents.map((inc, idx) => (
              <motion.div
                key={inc.id}
                {...staggerItem}
                transition={{ delay: idx * 0.05 }}
              >
                <Card hover={false} padding="p-3.5" className="border-orange-500/15 space-y-2">
                  <div className="flex gap-2">
                    <StatusBadge value={inc.severity} size="xs" />
                    <StatusBadge value={inc.status} size="xs" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <User size={10} className="text-green-400" />
                      {inc.patient_name || 'Patient'}
                    </p>
                    {inc.ambulance && (
                      <p className="flex items-center gap-1.5 text-cyan-400">
                        <Ambulance size={10} />
                        Ambulance #{inc.ambulance.id}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Clock size={10} /> ETA: {inc.eta_minutes != null ? `${inc.eta_minutes} min` : 'N/A'} · {inc.distance_km != null ? `${inc.distance_km.toFixed(2)} km` : 'N/A'}
                    </p>
                    <p className="text-[var(--text-muted)]">
                      Ready: <span className={inc.hospital_ready ? 'text-emerald-400' : 'text-amber-400'}>{inc.hospital_ready ? 'Yes' : 'No'}</span>
                      {' · '}
                      Arrival: <span className={inc.patient_reached_hospital ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>{inc.patient_reached_hospital ? 'Reached' : 'In transit'}</span>
                    </p>
                    <p className="text-[var(--text-muted)]">
                      Telemetry: {inc.ambulance_last_seen_at
                        ? `${Math.round((Date.now() - new Date(inc.ambulance_last_seen_at).getTime()) / 1000)}s ago`
                        : 'No live updates'}
                    </p>
                    {inc.description && (
                      <p className="text-[var(--text-muted)] italic">{inc.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <motion.button
                      onClick={() => updateReadiness(inc.id, !inc.hospital_ready)}
                      whileTap={{ scale: 0.97 }}
                      className={`px-2 py-2 rounded-lg text-[0.68rem] font-semibold border ${inc.hospital_ready
                        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                        : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}
                    >
                      {inc.hospital_ready ? 'Set Not Ready' : 'Set Ready'}
                    </motion.button>
                    <motion.button
                      onClick={() => updateArrival(inc.id, !inc.patient_reached_hospital)}
                      whileTap={{ scale: 0.97 }}
                      className={`px-2 py-2 rounded-lg text-[0.68rem] font-semibold border ${inc.patient_reached_hospital
                        ? 'text-gray-300 border-white/15 bg-white/5'
                        : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'}`}
                    >
                      {inc.patient_reached_hospital ? 'Clear Arrival' : 'Confirm Arrival'}
                    </motion.button>
                    <motion.button
                      onClick={() => completeHandover(inc.id)}
                      whileTap={{ scale: 0.97 }}
                      className="col-span-2 px-2 py-2 rounded-lg text-[0.68rem] font-semibold border
                        text-purple-300 border-purple-500/30 bg-purple-500/10"
                    >
                      Complete Handover
                    </motion.button>
                  </div>
                  <p className="text-[0.55rem] text-[var(--text-muted)]">
                    {new Date(inc.created_at).toLocaleString()}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Past Cases */}
      <div className="flex-1 overflow-y-auto">
        {pastIncidents.length > 0 ? (
          <div className="p-4">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">
              Past Cases ({pastIncidents.length})
            </h3>
            <div className="space-y-1.5">
              {pastIncidents.map((inc, idx) => (
                <motion.div
                  key={inc.id}
                  {...staggerItem}
                  transition={{ delay: idx * 0.03 }}
                  className="p-3 rounded-xl bg-white/[0.02] border border-transparent"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge value={inc.severity} size="xs" />
                    <StatusBadge value={inc.status} size="xs" />
                  </div>
                  <p className="text-[0.55rem] text-[var(--text-muted)]">
                    {new Date(inc.created_at).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : activeIncidents.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No cases"
            description="Patient cases will appear here when assigned."
          />
        ) : null}
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
          {hospital && (
            <Marker position={[hospital.latitude, hospital.longitude]} icon={hospitalMapIcon}>
              <Popup>
                <div className="text-xs font-medium">
                  <p className="font-bold text-sm mb-1">🏨 {hospital.name}</p>
                  <p>ICU Available: {hospital.available_icu_beds}/{hospital.total_icu_beds}</p>
                </div>
              </Popup>
            </Marker>
          )}
          {activeIncidents.map((inc) =>
            inc.ambulance ? (
              <Marker
                key={inc.id}
                position={[inc.ambulance.latitude, inc.ambulance.longitude]}
                icon={ambulanceMapIcon}
              >
                <Popup>
                  <div className="text-xs font-medium">
                    <p className="font-bold text-sm mb-1">🚑 Ambulance #{inc.ambulance.id}</p>
                    <p>Patient: {inc.patient_name}</p>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>

        {/* Hospital status overlay */}
        {hospital && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 z-[1000] glass-panel rounded-2xl px-4 py-3
              border border-purple-500/20 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${occupancy > 80 ? 'bg-red-400' : occupancy > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="text-xs">
                <p className="font-semibold text-[var(--text-primary)]">
                  {hospital.available_icu_beds} ICU beds available
                </p>
                <p className="text-[var(--text-muted)]">
                  {Math.round(occupancy)}% occupied
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
