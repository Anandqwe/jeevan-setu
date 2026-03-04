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
import styles from './HospitalDashboard.module.css';

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

  // Find this hospital
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

  // Map markers for patient origin locations
  const patientMarkers = useMemo(() => {
    return incomingPatients.map((i) => ({
      latitude: i.latitude,
      longitude: i.longitude,
      icon: '🆘',
      popup: `Patient #${i.id} — ${i.severity}`,
    }));
  }, [incomingPatients]);

  // Hospital self marker
  const hospitalSelfMarker = useMemo(() => {
    if (!myHospital) return [];
    return [{
      ...myHospital,
      available_icu_beds: myHospital.available_icu_beds,
      total_icu_beds: myHospital.total_icu_beds,
    }];
  }, [myHospital]);

  const mapCenter = useMemo(() => {
    if (myHospital) return [myHospital.latitude, myHospital.longitude];
    return [19.076, 72.8777];
  }, [myHospital]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Hospital Dashboard</h2>
        <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </div>

      <div className={styles.grid}>
        {/* Bed Management */}
        <div className={styles.bed_card}>
          <h3>🛏️ Bed Management</h3>
          {myHospital ? (
            <>
              <div className={styles.hospital_info}>
                <p><strong>{myHospital.name}</strong></p>
                <p>Specialty: {myHospital.specialty}</p>
                <p>Total ICU Beds: {myHospital.total_icu_beds}</p>
              </div>
              <div className={styles.bed_control}>
                <label>Available ICU Beds:</label>
                <div className={styles.bed_input_group}>
                  <input
                    type="number"
                    min="0"
                    max={myHospital.total_icu_beds}
                    value={bedCount}
                    onChange={(e) => setBedCount(e.target.value)}
                    className={styles.bed_input}
                  />
                  <button onClick={handleUpdateBeds} className={styles.update_btn}>
                    Update
                  </button>
                </div>
              </div>
              <div className={styles.bed_visual}>
                <div className={styles.bed_bar}>
                  <div
                    className={styles.bed_fill}
                    style={{
                      width: `${(myHospital.available_icu_beds / myHospital.total_icu_beds) * 100}%`,
                    }}
                  />
                </div>
                <span className={styles.bed_text}>
                  {myHospital.available_icu_beds} / {myHospital.total_icu_beds} available
                </span>
              </div>
            </>
          ) : (
            <p className={styles.empty}>No hospital profile linked to this account</p>
          )}
        </div>

        {/* Incoming Patients */}
        <div className={styles.incoming_card}>
          <h3>🚑 Incoming Patients ({incomingPatients.length})</h3>
          {incomingPatients.length === 0 ? (
            <p className={styles.empty}>No incoming patients</p>
          ) : (
            incomingPatients.map((incident) => (
              <div key={incident.id} className={styles.patient_card}>
                <div className={styles.patient_header}>
                  <span>Incident #{incident.id}</span>
                  <StatusBadge status={incident.status} size="small" />
                </div>
                <div className={styles.patient_body}>
                  <p>Severity: <strong>{incident.severity}</strong></p>
                  {incident.description && <p>{incident.description}</p>}
                </div>
                <div className={styles.patient_actions}>
                  {incident.status === 'ARRIVED_AT_HOSPITAL' && (
                    <button
                      className={styles.intake_btn}
                      onClick={() => handleConfirmIntake(incident.id)}
                    >
                      Confirm Intake
                    </button>
                  )}
                  {incident.status === 'TREATMENT_STARTED' && (
                    <button
                      className={styles.complete_btn}
                      onClick={() => handleComplete(incident.id)}
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map section — full width */}
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
    </div>
  );
};

export default HospitalDashboard;
