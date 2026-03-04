import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useGeolocation from '../../hooks/useGeolocation';
import useWebSocket from '../../hooks/useWebSocket';
import useIncidentStore from '../../stores/incidentStore';
import useHospitalStore from '../../stores/hospitalStore';
import TrackingMap from '../../components/maps/TrackingMap';
import MapLegend from '../../components/maps/MapLegend';
import EmergencyForm from '../../components/incidents/EmergencyForm';
import IncidentCard from '../../components/incidents/IncidentCard';
import IncidentTimeline from '../../components/incidents/IncidentTimeline';
import useTrackingStore from '../../stores/trackingStore';
import { INCIDENT_STATUSES, STATUS_LABELS, SEVERITY_COLORS } from '../../utils/constants';
import styles from './PatientDashboard.module.css';

const PHASE_INFO = {
  [INCIDENT_STATUSES.REQUESTED]: { icon: '⏳', text: 'Finding nearest ambulance...', color: '#f59e0b' },
  [INCIDENT_STATUSES.AMBULANCE_ASSIGNED]: { icon: '✅', text: 'Ambulance assigned — preparing to depart', color: '#3b82f6' },
  [INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT]: { icon: '🚑', text: 'Ambulance is on the way to you!', color: '#8b5cf6' },
  [INCIDENT_STATUSES.PATIENT_PICKED_UP]: { icon: '👤', text: 'You have been picked up', color: '#06b6d4' },
  [INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL]: { icon: '🏥', text: 'Heading to hospital now', color: '#8b5cf6' },
  [INCIDENT_STATUSES.ARRIVED_AT_HOSPITAL]: { icon: '🏥', text: 'Arrived at hospital', color: '#10b981' },
  [INCIDENT_STATUSES.TREATMENT_STARTED]: { icon: '💊', text: 'Treatment in progress', color: '#059669' },
};

const PatientDashboard = () => {
  useAuth('PATIENT');
  const { position, usingFallback } = useGeolocation();
  const { connected } = useWebSocket();
  const {
    incidents,
    activeIncident,
    loading,
    error,
    fetchIncidents,
    createIncident,
    clearError,
  } = useIncidentStore();
  const { hospitals, fetchHospitals } = useHospitalStore();
  const ambulancePositions = useTrackingStore((s) => s.ambulancePositions);
  const [selectedPosition, setSelectedPosition] = useState(null);

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
  }, []);

  useEffect(() => {
    setSelectedPosition(position);
  }, [position]);

  const handleCreateEmergency = async (data) => {
    try {
      const incident = await createIncident({
        ...data,
        latitude: selectedPosition?.latitude || data.latitude,
        longitude: selectedPosition?.longitude || data.longitude,
      });
      toast.success(`Emergency #${incident.id} dispatched!`);
    } catch (err) {
      toast.error(error || 'Failed to create emergency');
    }
  };

  const handleMapClick = (lat, lng) => {
    setSelectedPosition({ latitude: lat, longitude: lng });
  };

  const activeIncidents = incidents.filter((i) => i.status !== 'COMPLETED');
  const completedIncidents = incidents.filter((i) => i.status === 'COMPLETED');
  const latestActive = activeIncidents[0];

  const emergencyMarker = useMemo(() => {
    if (!latestActive) return null;
    return {
      latitude: latestActive.latitude,
      longitude: latestActive.longitude,
      label: `🚨 Emergency #${latestActive.id} — ${latestActive.severity}`,
    };
  }, [latestActive]);

  const assignedHospital = useMemo(() => {
    if (!latestActive?.hospital_id || !hospitals.length) return null;
    return hospitals.find((h) => h.id === latestActive.hospital_id) || null;
  }, [latestActive, hospitals]);

  const routePoints = useMemo(() => {
    if (!latestActive) return null;
    const status = latestActive.status;
    if (
      status === INCIDENT_STATUSES.AMBULANCE_ASSIGNED ||
      status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT
    ) {
      if (latestActive.ambulance_id && ambulancePositions[latestActive.ambulance_id]) {
        const ambPos = ambulancePositions[latestActive.ambulance_id];
        return [
          [ambPos.latitude, ambPos.longitude],
          [latestActive.latitude, latestActive.longitude],
        ];
      }
      return null;
    }
    if (
      status === INCIDENT_STATUSES.PATIENT_PICKED_UP ||
      status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
    ) {
      if (!assignedHospital) return null;
      return [
        [latestActive.latitude, latestActive.longitude],
        [assignedHospital.latitude, assignedHospital.longitude],
      ];
    }
    return null;
  }, [latestActive, ambulancePositions, assignedHospital]);

  const shouldAnimate = latestActive && (
    latestActive.status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT ||
    latestActive.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
  );

  const routeColor = latestActive?.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
    ? '#06b6d4' : '#dc2626';

  const filteredHospitals = useMemo(() => {
    if (!latestActive) return hospitals;
    return hospitals;
  }, [hospitals, latestActive]);

  const phaseInfo = latestActive ? PHASE_INFO[latestActive.status] : null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Patient Dashboard</h2>
        <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </div>

      {/* Live status banner when incident is active */}
      {latestActive && phaseInfo && (
        <div className={styles.status_banner} style={{ background: `${phaseInfo.color}10`, borderColor: phaseInfo.color }}>
          <span className={styles.banner_icon}>{phaseInfo.icon}</span>
          <div className={styles.banner_content}>
            <span className={styles.banner_title} style={{ color: phaseInfo.color }}>
              Emergency #{latestActive.id} — {latestActive.severity}
            </span>
            <span className={styles.banner_text}>{phaseInfo.text}</span>
          </div>
          {assignedHospital && (
            <div className={styles.banner_details}>
              <span>🏥 {assignedHospital.name}</span>
              {latestActive.ambulance_id && <span>🚑 Ambulance #{latestActive.ambulance_id}</span>}
            </div>
          )}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.left}>
          {/* Only show form when no active incident */}
          {!latestActive && (
            <EmergencyForm
              position={selectedPosition || position}
              usingFallback={usingFallback}
              onSubmit={handleCreateEmergency}
              loading={loading}
            />
          )}

          {/* Active incident details */}
          {latestActive && (
            <>
              {/* Assigned Resources Card */}
              <div className={styles.resources_card}>
                <h3>Assigned Resources</h3>
                <div className={styles.resource_row}>
                  <div className={styles.resource_item}>
                    <span className={styles.resource_icon}>🚑</span>
                    <div>
                      <span className={styles.resource_label}>Ambulance</span>
                      <span className={styles.resource_value}>
                        {latestActive.ambulance_id ? `#${latestActive.ambulance_id}` : 'Searching...'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.resource_item}>
                    <span className={styles.resource_icon}>🏥</span>
                    <div>
                      <span className={styles.resource_label}>Hospital</span>
                      <span className={styles.resource_value}>
                        {assignedHospital ? assignedHospital.name : 'Assigning...'}
                      </span>
                    </div>
                  </div>
                </div>
                {assignedHospital && (
                  <div className={styles.hospital_detail}>
                    <span>🏷️ {assignedHospital.specialty?.replace(/_/g, ' ')}</span>
                    <span>🛏️ {assignedHospital.available_icu_beds}/{assignedHospital.total_icu_beds} ICU beds free</span>
                  </div>
                )}
              </div>

              {/* Severity indicator */}
              <div className={styles.severity_card} style={{ borderLeftColor: SEVERITY_COLORS[latestActive.severity] }}>
                <div className={styles.severity_header}>
                  <span>Severity</span>
                  <span className={styles.severity_badge} style={{ background: SEVERITY_COLORS[latestActive.severity] }}>
                    {latestActive.severity}
                  </span>
                </div>
                {latestActive.description && (
                  <p className={styles.severity_desc}>{latestActive.description}</p>
                )}
              </div>

              {/* Timeline */}
              <div className={styles.timeline_card}>
                <h3>Progress</h3>
                <IncidentTimeline currentStatus={latestActive.status} />
              </div>
            </>
          )}

          {/* Show form below timeline if there's an active incident (for new emergency) */}
          {latestActive && (
            <details className={styles.new_emergency_collapse}>
              <summary>Request another emergency</summary>
              <EmergencyForm
                position={selectedPosition || position}
                usingFallback={usingFallback}
                onSubmit={handleCreateEmergency}
                loading={loading}
              />
            </details>
          )}
        </div>

        <div className={styles.right}>
          <TrackingMap
            center={[position.latitude, position.longitude]}
            zoom={13}
            ambulancePositions={ambulancePositions}
            hospitalMarkers={filteredHospitals}
            selectedPosition={!emergencyMarker ? selectedPosition : null}
            onMapClick={!latestActive ? handleMapClick : null}
            emergencyMarker={emergencyMarker}
            routePoints={routePoints}
            routeColor={routeColor}
            animateAmbulance={!!shouldAnimate}
            hideStaticAmbulance={!!shouldAnimate}
            fitAllMarkers={!!latestActive}
            className={styles.map}
          />
          <MapLegend showEmergency={!!emergencyMarker} />

          {/* Incident History */}
          <div className={styles.incidents_list}>
            <h3>Incident History {incidents.length > 0 && <span className={styles.count_badge}>{incidents.length}</span>}</h3>
            {incidents.length === 0 ? (
              <div className={styles.empty_state}>
                <span className={styles.empty_icon}>🚑</span>
                <p>No incidents yet</p>
                <p className={styles.empty_hint}>Use the form to request emergency help</p>
              </div>
            ) : (
              incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
