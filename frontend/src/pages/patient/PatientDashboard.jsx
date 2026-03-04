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
import { INCIDENT_STATUSES } from '../../utils/constants';
import styles from './PatientDashboard.module.css';

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
  const latestActive = activeIncidents[0];

  // Derive the emergency marker (red pulsing) from latest active incident
  const emergencyMarker = useMemo(() => {
    if (!latestActive) return null;
    return {
      latitude: latestActive.latitude,
      longitude: latestActive.longitude,
      label: `🚨 Emergency #${latestActive.id} — ${latestActive.severity}`,
    };
  }, [latestActive]);

  // Find the assigned hospital for the active incident
  const assignedHospital = useMemo(() => {
    if (!latestActive?.hospital_id || !hospitals.length) return null;
    return hospitals.find((h) => h.id === latestActive.hospital_id) || null;
  }, [latestActive, hospitals]);

  // Build the route line — ONLY the active segment for correct one-way animation
  const routePoints = useMemo(() => {
    if (!latestActive) return null;
    const status = latestActive.status;

    if (
      status === INCIDENT_STATUSES.AMBULANCE_ASSIGNED ||
      status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT
    ) {
      // Ambulance → Patient ONLY
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
      // Patient → Hospital ONLY
      if (!assignedHospital) return null;
      return [
        [latestActive.latitude, latestActive.longitude],
        [assignedHospital.latitude, assignedHospital.longitude],
      ];
    }

    return null;
  }, [latestActive, ambulancePositions, assignedHospital]);

  // Should we animate? Only when ambulance is actually en route
  const shouldAnimate = latestActive && (
    latestActive.status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT ||
    latestActive.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
  );

  // Route color changes based on status
  const routeColor = latestActive?.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
    ? '#06b6d4' : '#dc2626';

  // Show only the assigned hospital as a highlighted marker when active
  const filteredHospitals = useMemo(() => {
    if (!latestActive) return hospitals;
    // Show all hospitals, but the assigned one is already shown — user can see context
    return hospitals;
  }, [hospitals, latestActive]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Patient Dashboard</h2>
        <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.left}>
          <EmergencyForm
            position={selectedPosition || position}
            usingFallback={usingFallback}
            onSubmit={handleCreateEmergency}
            loading={loading}
          />

          {latestActive && (
            <div className={styles.timeline_card}>
              <h3>Active Emergency #{latestActive.id}</h3>
              <IncidentTimeline currentStatus={latestActive.status} />
            </div>
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

          <div className={styles.incidents_list}>
            <h3>Your Incidents</h3>
            {incidents.length === 0 ? (
              <p className={styles.empty}>No incidents yet</p>
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
