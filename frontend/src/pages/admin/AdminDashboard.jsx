import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';
import useIncidentStore from '../../stores/incidentStore';
import useHospitalStore from '../../stores/hospitalStore';
import useTrackingStore from '../../stores/trackingStore';
import TrackingMap from '../../components/maps/TrackingMap';
import StatusBadge from '../../components/common/StatusBadge';
import { getAnalytics, overrideAmbulance, overrideHospital, forceCloseIncident } from '../../api/hospitals';
import { getAmbulances } from '../../api/ambulances';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  useAuth('ADMIN');
  const { connected } = useWebSocket();
  const { incidents, fetchIncidents, updateStatus } = useIncidentStore();
  const { hospitals, fetchHospitals } = useHospitalStore();
  const ambulancePositions = useTrackingStore((s) => s.ambulancePositions);
  const [analytics, setAnalytics] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Override form state
  const [overrideIncident, setOverrideIncident] = useState('');
  const [overrideAmbulanceId, setOverrideAmbulanceId] = useState('');
  const [overrideHospitalId, setOverrideHospitalId] = useState('');

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
    loadAnalytics();
    loadAmbulances();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch {
      toast.error('Failed to load analytics');
    }
  };

  const loadAmbulances = async () => {
    try {
      const data = await getAmbulances();
      setAmbulances(data);
    } catch {
      toast.error('Failed to load ambulances');
    }
  };

  const handleOverrideAmbulance = async () => {
    if (!overrideIncident || !overrideAmbulanceId) return;
    try {
      await overrideAmbulance(parseInt(overrideIncident), parseInt(overrideAmbulanceId));
      toast.success('Ambulance overridden');
      fetchIncidents();
    } catch {
      toast.error('Override failed');
    }
  };

  const handleOverrideHospital = async () => {
    if (!overrideIncident || !overrideHospitalId) return;
    try {
      await overrideHospital(parseInt(overrideIncident), parseInt(overrideHospitalId));
      toast.success('Hospital overridden');
      fetchIncidents();
    } catch {
      toast.error('Override failed');
    }
  };

  const handleForceClose = async (incidentId) => {
    if (!confirm('Force close this incident?')) return;
    try {
      await forceCloseIncident(incidentId);
      toast.success('Incident force-closed');
      fetchIncidents();
    } catch {
      toast.error('Force close failed');
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== 'COMPLETED');

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h2>Admin Dashboard</h2>
        <div className={styles.header_right}>
          <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
            {connected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {['overview', 'map', 'incidents', 'analytics'].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active_tab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className={styles.overview}>
          <div className={styles.stat_grid}>
            <div className={styles.stat_card}>
              <span className={styles.stat_number}>{activeIncidents.length}</span>
              <span className={styles.stat_label}>Active Incidents</span>
            </div>
            <div className={styles.stat_card}>
              <span className={styles.stat_number}>{incidents.length}</span>
              <span className={styles.stat_label}>Total Incidents</span>
            </div>
            <div className={styles.stat_card}>
              <span className={styles.stat_number}>
                {ambulances.filter((a) => a.status === 'available').length}
              </span>
              <span className={styles.stat_label}>Available Ambulances</span>
            </div>
            <div className={styles.stat_card}>
              <span className={styles.stat_number}>
                {hospitals.reduce((sum, h) => sum + h.available_icu_beds, 0)}
              </span>
              <span className={styles.stat_label}>Available ICU Beds</span>
            </div>
          </div>

          {/* Override Controls */}
          <div className={styles.override_section}>
            <h3>Manual Overrides</h3>
            <div className={styles.override_grid}>
              <div className={styles.override_card}>
                <h4>Override Ambulance</h4>
                <input
                  placeholder="Incident ID"
                  value={overrideIncident}
                  onChange={(e) => setOverrideIncident(e.target.value)}
                  className={styles.override_input}
                />
                <input
                  placeholder="Ambulance ID"
                  value={overrideAmbulanceId}
                  onChange={(e) => setOverrideAmbulanceId(e.target.value)}
                  className={styles.override_input}
                />
                <button onClick={handleOverrideAmbulance} className={styles.override_btn}>
                  Apply Override
                </button>
              </div>
              <div className={styles.override_card}>
                <h4>Override Hospital</h4>
                <input
                  placeholder="Incident ID"
                  value={overrideIncident}
                  onChange={(e) => setOverrideIncident(e.target.value)}
                  className={styles.override_input}
                />
                <input
                  placeholder="Hospital ID"
                  value={overrideHospitalId}
                  onChange={(e) => setOverrideHospitalId(e.target.value)}
                  className={styles.override_input}
                />
                <button onClick={handleOverrideHospital} className={styles.override_btn}>
                  Apply Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Map */}
      {activeTab === 'map' && (
        <div className={styles.map_tab}>
          <TrackingMap
            center={[19.076, 72.8777]}
            zoom={12}
            ambulancePositions={ambulancePositions}
            hospitalMarkers={hospitals}
            markers={activeIncidents.map((i) => ({
              latitude: i.latitude,
              longitude: i.longitude,
              popup: `#${i.id} - ${i.severity}`,
            }))}
            className={styles.full_map}
          />
        </div>
      )}

      {/* Incidents Table */}
      {activeTab === 'incidents' && (
        <div className={styles.incidents_tab}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Ambulance</th>
                <th>Hospital</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id}>
                  <td>#{incident.id}</td>
                  <td><StatusBadge status={incident.status} size="small" /></td>
                  <td><strong>{incident.severity}</strong></td>
                  <td>{incident.ambulance_id || '—'}</td>
                  <td>{incident.hospital_id || '—'}</td>
                  <td>{new Date(incident.created_at).toLocaleString()}</td>
                  <td>
                    {incident.status !== 'COMPLETED' && (
                      <button
                        className={styles.force_btn}
                        onClick={() => handleForceClose(incident.id)}
                      >
                        Force Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div className={styles.analytics_tab}>
          {analytics ? (
            <div className={styles.analytics_grid}>
              <div className={styles.analytics_card}>
                <h4>Incidents by Severity</h4>
                <div className={styles.analytics_list}>
                  {analytics.incidents_by_severity &&
                    Object.entries(analytics.incidents_by_severity).map(([sev, count]) => (
                      <div key={sev} className={styles.analytics_row}>
                        <span>{sev}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.analytics_card}>
                <h4>Incidents by Status</h4>
                <div className={styles.analytics_list}>
                  {analytics.incidents_by_status &&
                    Object.entries(analytics.incidents_by_status).map(([status, count]) => (
                      <div key={status} className={styles.analytics_row}>
                        <span>{status.replace(/_/g, ' ')}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.analytics_card}>
                <h4>Ambulances</h4>
                <div className={styles.analytics_list}>
                  {analytics.ambulances_by_status &&
                    Object.entries(analytics.ambulances_by_status).map(([status, count]) => (
                      <div key={status} className={styles.analytics_row}>
                        <span>{status}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.analytics_card}>
                <h4>Hospital Beds</h4>
                <div className={styles.analytics_list}>
                  <div className={styles.analytics_row}>
                    <span>Total ICU Beds</span>
                    <strong>{analytics.total_icu_beds ?? '—'}</strong>
                  </div>
                  <div className={styles.analytics_row}>
                    <span>Available ICU Beds</span>
                    <strong>{analytics.available_icu_beds ?? '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Loading analytics…</p>
          )}
          <button className={styles.refresh_btn} onClick={loadAnalytics}>
            🔄 Refresh Analytics
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
