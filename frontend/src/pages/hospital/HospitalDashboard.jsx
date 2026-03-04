import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';
import useIncidentStore from '../../stores/incidentStore';
import useHospitalStore from '../../stores/hospitalStore';
import useTrackingStore from '../../stores/trackingStore';
import { updateHospitalBeds } from '../../api/hospitals';
import TrackingMap from '../../components/maps/TrackingMap';
import StatusBadge from '../../components/common/StatusBadge';
import { SEVERITY_COLORS } from '../../utils/constants';
import styles from './HospitalDashboard.module.css';

const getBedBarColor = (available, total) => {
  if (total === 0) return '#94a3b8';
  const pct = available / total;
  if (pct > 0.5) return '#10b981';    // green — plenty
  if (pct > 0.25) return '#f59e0b';   // yellow — moderate
  return '#ef4444';                     // red — critical
};

const HospitalDashboard = () => {
  const { user } = useAuth('HOSPITAL');
  const { connected } = useWebSocket();
  const { incidents, fetchIncidents, updateStatus } = useIncidentStore();
  const { hospitals, fetchHospitals } = useHospitalStore();
  const ambulancePositions = useTrackingStore((s) => s.ambulancePositions);
  const [bedCount, setBedCount] = useState('');

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
  }, []);

  const myHospital = hospitals.find((h) => h.user_id === user?.id);

  useEffect(() => {
    if (myHospital) {
      setBedCount(String(myHospital.available_icu_beds));
    }
  }, [myHospital]);

  const handleUpdateBeds = async () => {
    if (!myHospital) return;
    const count = parseInt(bedCount, 10);
    if (isNaN(count) || count < 0) {
      toast.error('Invalid bed count');
      return;
    }
    try {
      await updateHospitalBeds(myHospital.id, count);
      toast.success('Bed count updated');
      fetchHospitals();
    } catch (err) {
      toast.error('Failed to update bed count');
    }
  };

  const handleConfirmIntake = async (incidentId) => {
    try {
      await updateStatus(incidentId, 'TREATMENT_STARTED');
      toast.success('Patient intake confirmed');
    } catch (err) {
      toast.error('Failed to confirm intake');
    }
  };

  const handleComplete = async (incidentId) => {
    try {
      await updateStatus(incidentId, 'COMPLETED');
      toast.success('Incident completed');
    } catch (err) {
      toast.error('Failed to complete incident');
    }
  };

  const incomingPatients = incidents.filter(
    (i) => ['EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL', 'TREATMENT_STARTED'].includes(i.status)
  );
  const completedPatients = incidents.filter((i) => i.status === 'COMPLETED');
  const occupiedBeds = myHospital ? myHospital.total_icu_beds - myHospital.available_icu_beds : 0;
  const occupancyPct = myHospital && myHospital.total_icu_beds > 0
    ? Math.round((occupiedBeds / myHospital.total_icu_beds) * 100)
    : 0;

  const patientMarkers = useMemo(() => {
    return incomingPatients.map((i) => ({
      latitude: i.latitude,
      longitude: i.longitude,
      icon: '🆘',
      popup: `Patient #${i.id} — ${i.severity}`,
    }));
  }, [incomingPatients]);

  const hospitalSelfMarker = useMemo(() => {
    if (!myHospital) return [];
    return [{ ...myHospital }];
  }, [myHospital]);

  const mapCenter = useMemo(() => {
    if (myHospital) return [myHospital.latitude, myHospital.longitude];
    return [19.076, 72.8777];
  }, [myHospital]);

  const bedColor = myHospital ? getBedBarColor(myHospital.available_icu_beds, myHospital.total_icu_beds) : '#94a3b8';

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h2>Hospital Dashboard</h2>
          {myHospital && (
            <span className={styles.hospital_subtitle}>
              {myHospital.name} — {myHospital.specialty?.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </div>

      {/* Stats Cards */}
      {myHospital && (
        <div className={styles.stats_row}>
          <div className={styles.stat_card}>
            <span className={styles.stat_value}>{incomingPatients.length}</span>
            <span className={styles.stat_label}>Incoming</span>
          </div>
          <div className={styles.stat_card}>
            <span className={styles.stat_value}>{completedPatients.length}</span>
            <span className={styles.stat_label}>Treated</span>
          </div>
          <div className={styles.stat_card}>
            <span className={styles.stat_value} style={{ color: bedColor }}>{occupancyPct}%</span>
            <span className={styles.stat_label}>Occupied</span>
          </div>
          <div className={styles.stat_card}>
            <span className={styles.stat_value}>{myHospital.available_icu_beds}</span>
            <span className={styles.stat_label}>ICU Free</span>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* Bed Management */}
        <div className={styles.bed_card}>
          <h3>🛏️ Bed Management</h3>
          {myHospital ? (
            <>
              <div className={styles.bed_control}>
                <label>Available ICU Beds:</label>
                <div className={styles.bed_input_group}>
                  <button
                    className={styles.bed_step_btn}
                    onClick={() => setBedCount(String(Math.max(0, parseInt(bedCount || '0') - 1)))}
                    disabled={parseInt(bedCount || '0') <= 0}
                  >−</button>
                  <input
                    type="number"
                    min="0"
                    max={myHospital.total_icu_beds}
                    value={bedCount}
                    onChange={(e) => setBedCount(e.target.value)}
                    className={styles.bed_input}
                  />
                  <button
                    className={styles.bed_step_btn}
                    onClick={() => setBedCount(String(Math.min(myHospital.total_icu_beds, parseInt(bedCount || '0') + 1)))}
                    disabled={parseInt(bedCount || '0') >= myHospital.total_icu_beds}
                  >+</button>
                  <button onClick={handleUpdateBeds} className={styles.update_btn}>
                    Update
                  </button>
                </div>
              </div>
              <div className={styles.bed_visual}>
                <div className={styles.bed_labels}>
                  <span>Occupied: {occupiedBeds}</span>
                  <span>Available: {myHospital.available_icu_beds}</span>
                </div>
                <div className={styles.bed_bar}>
                  <div
                    className={styles.bed_fill}
                    style={{
                      width: `${occupancyPct}%`,
                      background: bedColor,
                    }}
                  />
                </div>
                <div className={styles.bed_bar_label}>
                  <span>{occupancyPct}% occupied — {myHospital.total_icu_beds} total</span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <span className={styles.empty_icon}>🏥</span>
              <p>No hospital profile linked to this account</p>
            </div>
          )}
        </div>

        {/* Incoming Patients */}
        <div className={styles.incoming_card}>
          <h3>🚑 Incoming Patients {incomingPatients.length > 0 && <span className={styles.count_badge}>{incomingPatients.length}</span>}</h3>
          {incomingPatients.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.empty_icon}>✅</span>
              <p>No incoming patients</p>
              <p className={styles.empty_hint}>All clear</p>
            </div>
          ) : (
            incomingPatients.map((incident) => (
              <div
                key={incident.id}
                className={styles.patient_card}
                style={{ borderLeftColor: SEVERITY_COLORS[incident.severity] }}
              >
                <div className={styles.patient_header}>
                  <div className={styles.patient_title}>
                    <span>#{incident.id}</span>
                    <span
                      className={styles.severity_dot}
                      style={{ background: SEVERITY_COLORS[incident.severity] }}
                    />
                    <span className={styles.severity_text} style={{ color: SEVERITY_COLORS[incident.severity] }}>
                      {incident.severity}
                    </span>
                  </div>
                  <StatusBadge status={incident.status} size="small" />
                </div>
                <div className={styles.patient_body}>
                  {incident.description && <p className={styles.patient_desc}>📝 {incident.description}</p>}
                  <p className={styles.patient_location}>
                    📍 Origin: {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}
                  </p>
                  {incident.ambulance_id && (
                    <p className={styles.patient_ambulance}>🚑 Ambulance #{incident.ambulance_id}</p>
                  )}
                </div>
                <div className={styles.patient_actions}>
                  {incident.status === 'ARRIVED_AT_HOSPITAL' && (
                    <button
                      className={styles.intake_btn}
                      onClick={() => handleConfirmIntake(incident.id)}
                    >
                      ✅ Confirm Intake
                    </button>
                  )}
                  {incident.status === 'TREATMENT_STARTED' && (
                    <button
                      className={styles.complete_btn}
                      onClick={() => handleComplete(incident.id)}
                    >
                      ✅ Mark Completed
                    </button>
                  )}
                  {incident.status === 'EN_ROUTE_TO_HOSPITAL' && (
                    <span className={styles.en_route_label}>🚑 En Route...</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map section */}
      <div className={styles.map_section}>
        <h3>📍 Incoming Ambulances</h3>
        <TrackingMap
          center={mapCenter}
          zoom={13}
          markers={patientMarkers}
          ambulancePositions={ambulancePositions}
          hospitalMarkers={hospitalSelfMarker}
          fitAllMarkers={patientMarkers.length > 0}
          className={styles.map}
        />
      </div>

      {/* Completed Patients History */}
      {completedPatients.length > 0 && (
        <details className={styles.history_collapse}>
          <summary>Completed Patients ({completedPatients.length})</summary>
          <div className={styles.history_list}>
            {completedPatients.map((i) => (
              <div key={i.id} className={styles.history_item}>
                <span className={styles.history_id}>#{i.id}</span>
                <span
                  className={styles.severity_dot}
                  style={{ background: SEVERITY_COLORS[i.severity] }}
                />
                <span>{i.severity}</span>
                <span className={styles.history_time}>
                  {new Date(i.updated_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default HospitalDashboard;
