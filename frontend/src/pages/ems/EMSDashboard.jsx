import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useGeolocation from '../../hooks/useGeolocation';
import useWebSocket from '../../hooks/useWebSocket';
import useIncidentStore from '../../stores/incidentStore';
import useHospitalStore from '../../stores/hospitalStore';
import TrackingMap from '../../components/maps/TrackingMap';
import MapLegend from '../../components/maps/MapLegend';
import StatusBadge from '../../components/common/StatusBadge';
import { INCIDENT_STATUSES, STATUS_LABELS } from '../../utils/constants';
import styles from './EMSDashboard.module.css';

const EMS_TRANSITIONS = {
  [INCIDENT_STATUSES.AMBULANCE_ASSIGNED]: INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT,
  [INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT]: INCIDENT_STATUSES.PATIENT_PICKED_UP,
  [INCIDENT_STATUSES.PATIENT_PICKED_UP]: INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL,
  [INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL]: INCIDENT_STATUSES.ARRIVED_AT_HOSPITAL,
};

const EMSDashboard = () => {
  useAuth('EMS');
  const { position: seededPosition } = useGeolocation();
  const { connected, sendMessage } = useWebSocket();
  const { incidents, fetchIncidents, updateStatus } = useIncidentStore();
  const { hospitals, fetchHospitals } = useHospitalStore();
  const [isTracking, setIsTracking] = useState(false);

  // EMS position is always the seeded ambulance location
  const myPosition = seededPosition;

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
  }, []);

  // Simulated tracking — send seeded position via WebSocket every 5 seconds
  useEffect(() => {
    let intervalId;
    if (isTracking && connected && myPosition) {
      // Send immediately on start
      const activeIncident = incidents.find(
        (i) => i.status !== 'COMPLETED' && i.status !== 'REQUESTED'
      );
      sendMessage('location_update', {
        latitude: myPosition.latitude,
        longitude: myPosition.longitude,
        incident_id: activeIncident?.id || null,
      });

      intervalId = setInterval(() => {
        const active = incidents.find(
          (i) => i.status !== 'COMPLETED' && i.status !== 'REQUESTED'
        );
        sendMessage('location_update', {
          latitude: myPosition.latitude,
          longitude: myPosition.longitude,
          incident_id: active?.id || null,
        });
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking, connected, myPosition, incidents, sendMessage]);

  const handleStatusUpdate = async (incidentId, currentStatus) => {
    const nextStatus = EMS_TRANSITIONS[currentStatus];
    if (!nextStatus) {
      toast.info('No further EMS action available');
      return;
    }
    try {
      await updateStatus(incidentId, nextStatus);
      toast.success(`Status updated to ${STATUS_LABELS[nextStatus] || nextStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== 'COMPLETED');
  const primaryIncident = activeIncidents[0]; // The incident currently being served

  // Find the assigned hospital for the primary incident
  const assignedHospital = useMemo(() => {
    if (!primaryIncident?.hospital_id || !hospitals.length) return null;
    return hospitals.find((h) => h.id === primaryIncident.hospital_id) || null;
  }, [primaryIncident, hospitals]);

  // Build markers for the map
  const mapMarkers = useMemo(() => {
    const m = [];

    // Patient location markers for all active incidents
    activeIncidents.forEach((i) => {
      m.push({
        latitude: i.latitude,
        longitude: i.longitude,
        icon: '🆘',
        popup: `<b>Patient #${i.id}</b><br/>Severity: ${i.severity}${i.description ? '<br/>' + i.description : ''}`,
      });
    });

    return m;
  }, [activeIncidents]);

  // Hospital markers to show on EMS map — show the assigned hospital prominently, others dimmed
  const hospitalMarkersForMap = useMemo(() => {
    if (!assignedHospital) return [];
    return [assignedHospital];
  }, [assignedHospital]);

  // Ambulance self-position on the map
  const ambulanceSelfPositions = useMemo(() => {
    if (!myPosition) return {};
    return { self: { latitude: myPosition.latitude, longitude: myPosition.longitude } };
  }, [myPosition]);

  // Build route line — ONLY the active segment so animation goes one-way on the correct path
  const routePoints = useMemo(() => {
    if (!primaryIncident) return null;
    const status = primaryIncident.status;

    if (
      status === INCIDENT_STATUSES.AMBULANCE_ASSIGNED ||
      status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT
    ) {
      // Ambulance → Patient ONLY (no hospital in this segment)
      if (!myPosition) return null;
      return [
        [myPosition.latitude, myPosition.longitude],
        [primaryIncident.latitude, primaryIncident.longitude],
      ];
    }

    if (
      status === INCIDENT_STATUSES.PATIENT_PICKED_UP ||
      status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
    ) {
      // Patient location → Hospital ONLY
      if (!assignedHospital) return null;
      return [
        [primaryIncident.latitude, primaryIncident.longitude],
        [assignedHospital.latitude, assignedHospital.longitude],
      ];
    }

    return null;
  }, [primaryIncident, myPosition, assignedHospital]);

  // Animate only when actively driving
  const shouldAnimate = primaryIncident && (
    primaryIncident.status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT ||
    primaryIncident.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
  );

  // Route color by phase
  const routeColor = primaryIncident?.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
    ? '#06b6d4' : '#8b5cf6';

  // Map center: prefer ambulance position, then geo, then Mumbai
  const mapCenter = useMemo(() => {
    if (myPosition) return [myPosition.latitude, myPosition.longitude];
    return [19.076, 72.8777];
  }, [myPosition]);

  // Emergency marker at patient location for the primary incident
  const emergencyMarker = useMemo(() => {
    if (!primaryIncident) return null;
    return {
      latitude: primaryIncident.latitude,
      longitude: primaryIncident.longitude,
      label: `🚨 Patient #${primaryIncident.id} — ${primaryIncident.severity}`,
    };
  }, [primaryIncident]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>EMS Dashboard</h2>
        <div className={styles.controls}>
          <button
            className={`${styles.tracking_btn} ${isTracking ? styles.active : ''}`}
            onClick={() => setIsTracking(!isTracking)}
          >
            {isTracking ? '📡 Tracking ON' : '📡 Start Tracking'}
          </button>
          <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
            {connected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.assignments}>
          <h3>Active Assignments</h3>
          {activeIncidents.length === 0 ? (
            <p className={styles.empty}>No active assignments</p>
          ) : (
            activeIncidents.map((incident) => (
              <div
                key={incident.id}
                className={`${styles.assignment_card} ${incident.id === primaryIncident?.id ? styles.primary_card : ''}`}
              >
                <div className={styles.card_header}>
                  <span className={styles.incident_id}>#{incident.id}</span>
                  <StatusBadge status={incident.status} size="small" />
                </div>
                <div className={styles.card_body}>
                  <p>📍 Patient: {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}</p>
                  <p>⚠️ Severity: <strong>{incident.severity}</strong></p>
                  {incident.description && <p>📝 {incident.description}</p>}
                  {incident.id === primaryIncident?.id && assignedHospital && (
                    <p>🏥 Hospital: <strong>{assignedHospital.name}</strong></p>
                  )}
                </div>
                {EMS_TRANSITIONS[incident.status] && (
                  <button
                    className={styles.action_btn}
                    onClick={() => handleStatusUpdate(incident.id, incident.status)}
                  >
                    → {(STATUS_LABELS[EMS_TRANSITIONS[incident.status]] || EMS_TRANSITIONS[incident.status]).replace(/_/g, ' ')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className={styles.map_section}>
          {primaryIncident && (
            <div className={styles.route_info}>
              <span className={styles.route_badge} style={{ background: routeColor }}>
                {primaryIncident.status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT && '🚑 → 🆘 Heading to Patient'}
                {primaryIncident.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL && '🚑 → 🏥 Heading to Hospital'}
                {primaryIncident.status === INCIDENT_STATUSES.AMBULANCE_ASSIGNED && '⏳ Awaiting Departure'}
                {primaryIncident.status === INCIDENT_STATUSES.PATIENT_PICKED_UP && '✅ Patient Picked Up'}
                {primaryIncident.status === INCIDENT_STATUSES.ARRIVED_AT_HOSPITAL && '🏥 Arrived at Hospital'}
              </span>
            </div>
          )}
          <TrackingMap
            center={mapCenter}
            zoom={13}
            markers={mapMarkers}
            ambulancePositions={ambulanceSelfPositions}
            hospitalMarkers={hospitalMarkersForMap}
            emergencyMarker={emergencyMarker}
            routePoints={routePoints}
            routeColor={routeColor}
            animateAmbulance={!!shouldAnimate}
            hideStaticAmbulance={!!shouldAnimate}
            animationDuration={6000}
            fitAllMarkers={!!primaryIncident}
            className={styles.map}
          />
          <MapLegend showEmergency={!!emergencyMarker} />
        </div>
      </div>
    </div>
  );
};

export default EMSDashboard;
