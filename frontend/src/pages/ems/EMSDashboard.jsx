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
import { INCIDENT_STATUSES, STATUS_LABELS, SEVERITY_COLORS } from '../../utils/constants';
import styles from './EMSDashboard.module.css';

const EMS_TRANSITIONS = {
  [INCIDENT_STATUSES.AMBULANCE_ASSIGNED]: INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT,
  [INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT]: INCIDENT_STATUSES.PATIENT_PICKED_UP,
  [INCIDENT_STATUSES.PATIENT_PICKED_UP]: INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL,
  [INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL]: INCIDENT_STATUSES.ARRIVED_AT_HOSPITAL,
};

const TRANSITION_LABELS = {
  [INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT]: 'Depart to Patient',
  [INCIDENT_STATUSES.PATIENT_PICKED_UP]: 'Patient Picked Up',
  [INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL]: 'Depart to Hospital',
  [INCIDENT_STATUSES.ARRIVED_AT_HOSPITAL]: 'Arrived at Hospital',
};

const EMSDashboard = () => {
  useAuth('EMS');
  const { position: seededPosition } = useGeolocation();
  const { connected, sendMessage } = useWebSocket();
  const { incidents, fetchIncidents, updateStatus } = useIncidentStore();
  const { hospitals, fetchHospitals } = useHospitalStore();
  const [isTracking, setIsTracking] = useState(false);

  const myPosition = seededPosition;

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
  }, []);

  useEffect(() => {
    let intervalId;
    if (isTracking && connected && myPosition) {
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
  const completedIncidents = incidents.filter((i) => i.status === 'COMPLETED');
  const primaryIncident = activeIncidents[0];

  const assignedHospital = useMemo(() => {
    if (!primaryIncident?.hospital_id || !hospitals.length) return null;
    return hospitals.find((h) => h.id === primaryIncident.hospital_id) || null;
  }, [primaryIncident, hospitals]);

  const mapMarkers = useMemo(() => {
    return activeIncidents.map((i) => ({
      latitude: i.latitude,
      longitude: i.longitude,
      icon: '🆘',
      popup: `<b>Patient #${i.id}</b><br/>Severity: ${i.severity}${i.description ? '<br/>' + i.description : ''}`,
    }));
  }, [activeIncidents]);

  const hospitalMarkersForMap = useMemo(() => {
    if (!assignedHospital) return [];
    return [assignedHospital];
  }, [assignedHospital]);

  const ambulanceSelfPositions = useMemo(() => {
    if (!myPosition) return {};
    return { self: { latitude: myPosition.latitude, longitude: myPosition.longitude } };
  }, [myPosition]);

  const routePoints = useMemo(() => {
    if (!primaryIncident) return null;
    const status = primaryIncident.status;
    if (
      status === INCIDENT_STATUSES.AMBULANCE_ASSIGNED ||
      status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT
    ) {
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
      if (!assignedHospital) return null;
      return [
        [primaryIncident.latitude, primaryIncident.longitude],
        [assignedHospital.latitude, assignedHospital.longitude],
      ];
    }
    return null;
  }, [primaryIncident, myPosition, assignedHospital]);

  const shouldAnimate = primaryIncident && (
    primaryIncident.status === INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT ||
    primaryIncident.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
  );

  const routeColor = primaryIncident?.status === INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL
    ? '#06b6d4' : '#8b5cf6';

  const mapCenter = useMemo(() => {
    if (myPosition) return [myPosition.latitude, myPosition.longitude];
    return [19.076, 72.8777];
  }, [myPosition]);

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

      {/* Quick Stats */}
      <div className={styles.stats_row}>
        <div className={styles.stat_card}>
          <span className={styles.stat_value}>{activeIncidents.length}</span>
          <span className={styles.stat_label}>Active</span>
        </div>
        <div className={styles.stat_card}>
          <span className={styles.stat_value}>{completedIncidents.length}</span>
          <span className={styles.stat_label}>Completed</span>
        </div>
        <div className={styles.stat_card}>
          <span className={styles.stat_value}>{incidents.length}</span>
          <span className={styles.stat_label}>Total</span>
        </div>
        <div className={`${styles.stat_card} ${isTracking ? styles.stat_active : ''}`}>
          <span className={styles.stat_value}>{isTracking ? 'ON' : 'OFF'}</span>
          <span className={styles.stat_label}>GPS</span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.assignments}>
          <h3>Active Assignments {activeIncidents.length > 0 && <span className={styles.count_badge}>{activeIncidents.length}</span>}</h3>
          {activeIncidents.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.empty_icon}>✅</span>
              <p>No active assignments</p>
              <p className={styles.empty_hint}>Waiting for dispatch</p>
            </div>
          ) : (
            activeIncidents.map((incident) => {
              const nextStatus = EMS_TRANSITIONS[incident.status];
              const incHospital = hospitals.find(h => h.id === incident.hospital_id);
              return (
                <div
                  key={incident.id}
                  className={`${styles.assignment_card} ${incident.id === primaryIncident?.id ? styles.primary_card : ''}`}
                >
                  <div className={styles.card_header}>
                    <div className={styles.card_title_row}>
                      <span className={styles.incident_id}>#{incident.id}</span>
                      <span
                        className={styles.severity_dot}
                        style={{ background: SEVERITY_COLORS[incident.severity] }}
                        title={incident.severity}
                      />
                      <span className={styles.severity_text} style={{ color: SEVERITY_COLORS[incident.severity] }}>
                        {incident.severity}
                      </span>
                    </div>
                    <StatusBadge status={incident.status} size="small" />
                  </div>

                  <div className={styles.card_body}>
                    <div className={styles.info_row}>
                      <span>📍</span>
                      <span>Patient: {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}</span>
                    </div>
                    {incident.description && (
                      <div className={styles.info_row}>
                        <span>📝</span>
                        <span>{incident.description}</span>
                      </div>
                    )}

                    {/* Assigned Hospital Details */}
                    {incHospital && (
                      <div className={styles.hospital_info}>
                        <div className={styles.hospital_name}>🏥 {incHospital.name}</div>
                        <div className={styles.hospital_meta}>
                          <span>🏷️ {incHospital.specialty?.replace(/_/g, ' ')}</span>
                          <span>🛏️ {incHospital.available_icu_beds}/{incHospital.total_icu_beds} ICU</span>
                        </div>
                        <div className={styles.hospital_coords}>
                          📍 {incHospital.latitude?.toFixed(4)}, {incHospital.longitude?.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>

                  {nextStatus && (
                    <button
                      className={styles.action_btn}
                      onClick={() => handleStatusUpdate(incident.id, incident.status)}
                    >
                      → {TRANSITION_LABELS[nextStatus] || STATUS_LABELS[nextStatus]}
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Completed History (collapsible) */}
          {completedIncidents.length > 0 && (
            <details className={styles.history_collapse}>
              <summary>Completed ({completedIncidents.length})</summary>
              <div className={styles.history_list}>
                {completedIncidents.map((i) => (
                  <div key={i.id} className={styles.history_item}>
                    <span className={styles.history_id}>#{i.id}</span>
                    <span className={styles.severity_dot} style={{ background: SEVERITY_COLORS[i.severity] }} />
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
