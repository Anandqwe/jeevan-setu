import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';
import useIncidentStore from '../../stores/incidentStore';
import useHospitalStore from '../../stores/hospitalStore';
import useTrackingStore from '../../stores/trackingStore';
import TrackingMap from '../../components/maps/TrackingMap';
import MapLegend from '../../components/maps/MapLegend';
import StatusBadge from '../../components/common/StatusBadge';
import { getAnalytics, overrideAmbulance, overrideHospital, forceCloseIncident } from '../../api/hospitals';
import { getAmbulances } from '../../api/ambulances';
import { STATUS_LABELS } from '../../utils/constants';
import styles from './AdminDashboard.module.css';

const SEVERITY_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const SEVERITY_ICONS = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  CRITICAL: '🔴',
};

const AdminDashboard = () => {
  useAuth('ADMIN');
  const { connected } = useWebSocket();
  const { incidents, fetchIncidents } = useIncidentStore();
  const { hospitals, fetchHospitals } = useHospitalStore();
  const ambulancePositions = useTrackingStore((s) => s.ambulancePositions);
  const [analytics, setAnalytics] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState(null);

  // Override form state
  const [overrideIncidentId, setOverrideIncidentId] = useState('');
  const [overrideAmbulanceId, setOverrideAmbulanceId] = useState('');
  const [overrideHospitalId, setOverrideHospitalId] = useState('');

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
    loadAnalytics();
    loadAmbulances();
  }, []);

  // Auto-refresh data every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIncidents();
      fetchHospitals();
      loadAmbulances();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await getAnalytics();
      setAnalytics(data);
      setLastRefresh(new Date());
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

  const handleRefreshAll = () => {
    fetchIncidents();
    fetchHospitals();
    loadAnalytics();
    loadAmbulances();
    toast.info('Data refreshed');
  };

  const handleOverrideAmbulance = async () => {
    if (!overrideIncidentId || !overrideAmbulanceId) {
      toast.warn('Select both incident and ambulance');
      return;
    }
    try {
      await overrideAmbulance(parseInt(overrideIncidentId), parseInt(overrideAmbulanceId));
      toast.success('Ambulance reassigned');
      fetchIncidents();
      loadAmbulances();
      setOverrideIncidentId('');
      setOverrideAmbulanceId('');
    } catch {
      toast.error('Override failed');
    }
  };

  const handleOverrideHospital = async () => {
    if (!overrideIncidentId || !overrideHospitalId) {
      toast.warn('Select both incident and hospital');
      return;
    }
    try {
      await overrideHospital(parseInt(overrideIncidentId), parseInt(overrideHospitalId));
      toast.success('Hospital reassigned');
      fetchIncidents();
      fetchHospitals();
      setOverrideIncidentId('');
      setOverrideHospitalId('');
    } catch {
      toast.error('Override failed');
    }
  };

  const handleForceClose = async (incidentId) => {
    if (!confirm(`Force close incident #${incidentId}? This cannot be undone.`)) return;
    try {
      await forceCloseIncident(incidentId);
      toast.success(`Incident #${incidentId} closed`);
      fetchIncidents();
      loadAmbulances();
      loadAnalytics();
    } catch {
      toast.error('Force close failed');
    }
  };

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'COMPLETED'),
    [incidents]
  );
  const completedIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'COMPLETED'),
    [incidents]
  );

  // Lookup helpers
  const getHospitalName = (id) => hospitals.find((h) => h.id === id)?.name || '—';
  const getAmbulanceInfo = (id) => ambulances.find((a) => a.id === id);

  // Compute hospital bed capacity for the overview
  const totalBeds = useMemo(
    () => hospitals.reduce((s, h) => s + (h.total_icu_beds || 0), 0),
    [hospitals]
  );
  const availableBeds = useMemo(
    () => hospitals.reduce((s, h) => s + (h.available_icu_beds || 0), 0),
    [hospitals]
  );
  const bedOccupancy = totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0;

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Admin Dashboard</h2>
        <div className={styles.header_right}>
          <button className={styles.refresh_all_btn} onClick={handleRefreshAll}>
            🔄 Refresh
          </button>
          <span className={`${styles.ws_badge} ${connected ? styles.connected : ''}`}>
            {connected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'map', label: '🗺️ Map' },
          { key: 'incidents', label: '🚨 Incidents' },
          { key: 'fleet', label: '🚑 Fleet' },
          { key: 'hospitals', label: '🏥 Hospitals' },
          { key: 'analytics', label: '📈 Analytics' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.active_tab : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== OVERVIEW TAB ===================== */}
      {activeTab === 'overview' && (
        <div className={styles.overview}>
          {/* Stat Cards */}
          <div className={styles.stat_grid}>
            <div className={`${styles.stat_card} ${styles.stat_danger}`}>
              <span className={styles.stat_icon}>🚨</span>
              <span className={styles.stat_number}>{activeIncidents.length}</span>
              <span className={styles.stat_label}>Active Incidents</span>
            </div>
            <div className={`${styles.stat_card} ${styles.stat_success}`}>
              <span className={styles.stat_icon}>✅</span>
              <span className={styles.stat_number}>{completedIncidents.length}</span>
              <span className={styles.stat_label}>Completed</span>
            </div>
            <div className={`${styles.stat_card} ${styles.stat_primary}`}>
              <span className={styles.stat_icon}>🚑</span>
              <span className={styles.stat_number}>
                {ambulances.filter((a) => a.status === 'available').length}/{ambulances.length}
              </span>
              <span className={styles.stat_label}>Ambulances Available</span>
            </div>
            <div className={`${styles.stat_card} ${styles.stat_info}`}>
              <span className={styles.stat_icon}>🛏️</span>
              <span className={styles.stat_number}>{availableBeds}/{totalBeds}</span>
              <span className={styles.stat_label}>ICU Beds Free</span>
            </div>
            <div className={`${styles.stat_card} ${styles.stat_warning}`}>
              <span className={styles.stat_icon}>🏥</span>
              <span className={styles.stat_number}>{hospitals.length}</span>
              <span className={styles.stat_label}>Hospitals</span>
            </div>
            <div className={`${styles.stat_card} ${styles.stat_purple}`}>
              <span className={styles.stat_icon}>📡</span>
              <span className={styles.stat_number}>{analytics?.connected_websockets ?? '—'}</span>
              <span className={styles.stat_label}>Live Connections</span>
            </div>
          </div>

          {/* Bed Capacity Bar */}
          <div className={styles.capacity_section}>
            <h3>ICU Bed Capacity</h3>
            <div className={styles.capacity_bar_wrap}>
              <div className={styles.capacity_bar}>
                <div
                  className={styles.capacity_fill}
                  style={{
                    width: `${bedOccupancy}%`,
                    background: bedOccupancy > 80 ? '#ef4444' : bedOccupancy > 50 ? '#f59e0b' : '#22c55e',
                  }}
                ></div>
              </div>
              <span className={styles.capacity_text}>{bedOccupancy}% occupied</span>
            </div>
          </div>

          {/* Active Incidents Table */}
          {activeIncidents.length > 0 && (
            <div className={styles.section_card}>
              <h3>🚨 Active Incidents</h3>
              <div className={styles.table_wrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Patient ID</th>
                      <th>Ambulance</th>
                      <th>Hospital</th>
                      <th>Location</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncidents.map((inc) => {
                      const amb = getAmbulanceInfo(inc.ambulance_id);
                      return (
                        <tr key={inc.id}>
                          <td><strong>#{inc.id}</strong></td>
                          <td>
                            <span className={styles.severity_badge} style={{ background: SEVERITY_COLORS[inc.severity] }}>
                              {SEVERITY_ICONS[inc.severity]} {inc.severity}
                            </span>
                          </td>
                          <td><StatusBadge status={inc.status} size="small" /></td>
                          <td>#{inc.patient_id}</td>
                          <td>
                            {amb ? (
                              <span title={`Capability: ${amb.capability_level || '—'}`}>
                                #{amb.id} — {amb.vehicle_number || `Ambulance #${amb.id}`}
                              </span>
                            ) : '—'}
                          </td>
                          <td>{inc.hospital_id ? `#${inc.hospital_id} — ${getHospitalName(inc.hospital_id)}` : '—'}</td>
                          <td className={styles.location_cell}>
                            {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
                          </td>
                          <td>{new Date(inc.created_at).toLocaleTimeString()}</td>
                          <td>
                            <button className={styles.force_btn} onClick={() => handleForceClose(inc.id)}>
                              Force Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manual Overrides */}
          <div className={styles.section_card}>
            <h3>⚙️ Manual Overrides</h3>
            <div className={styles.override_grid}>
              <div className={styles.override_card}>
                <h4>Reassign Ambulance</h4>
                <label className={styles.override_label}>Incident</label>
                <select
                  className={styles.override_select}
                  value={overrideIncidentId}
                  onChange={(e) => setOverrideIncidentId(e.target.value)}
                >
                  <option value="">Select incident…</option>
                  {activeIncidents.map((i) => (
                    <option key={i.id} value={i.id}>
                      #{i.id} — {i.severity} ({STATUS_LABELS[i.status] || i.status})
                    </option>
                  ))}
                </select>
                <label className={styles.override_label}>Ambulance</label>
                <select
                  className={styles.override_select}
                  value={overrideAmbulanceId}
                  onChange={(e) => setOverrideAmbulanceId(e.target.value)}
                >
                  <option value="">Select ambulance…</option>
                  {ambulances.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} — {a.vehicle_number || `Ambulance #${a.id}`} ({a.status})
                    </option>
                  ))}
                </select>
                <button onClick={handleOverrideAmbulance} className={styles.override_btn}>
                  Reassign Ambulance
                </button>
              </div>
              <div className={styles.override_card}>
                <h4>Reassign Hospital</h4>
                <label className={styles.override_label}>Incident</label>
                <select
                  className={styles.override_select}
                  value={overrideIncidentId}
                  onChange={(e) => setOverrideIncidentId(e.target.value)}
                >
                  <option value="">Select incident…</option>
                  {activeIncidents.map((i) => (
                    <option key={i.id} value={i.id}>
                      #{i.id} — {i.severity} ({STATUS_LABELS[i.status] || i.status})
                    </option>
                  ))}
                </select>
                <label className={styles.override_label}>Hospital</label>
                <select
                  className={styles.override_select}
                  value={overrideHospitalId}
                  onChange={(e) => setOverrideHospitalId(e.target.value)}
                >
                  <option value="">Select hospital…</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      #{h.id} — {h.name} ({h.available_icu_beds} beds free)
                    </option>
                  ))}
                </select>
                <button onClick={handleOverrideHospital} className={styles.override_btn}>
                  Reassign Hospital
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MAP TAB ===================== */}
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
              icon: SEVERITY_ICONS[i.severity] || '🆘',
              popup: `<b>Incident #${i.id}</b><br/>Severity: ${i.severity}<br/>Status: ${STATUS_LABELS[i.status] || i.status}${i.description ? '<br/>' + i.description : ''}`,
            }))}
            fitAllMarkers={true}
            className={styles.full_map}
          />
          <MapLegend showEmergency={activeIncidents.length > 0} />
        </div>
      )}

      {/* ===================== INCIDENTS TAB ===================== */}
      {activeTab === 'incidents' && (
        <div className={styles.incidents_tab}>
          <div className={styles.tab_header}>
            <h3>All Incidents ({incidents.length})</h3>
            <div className={styles.tab_header_badges}>
              <span className={styles.mini_badge} style={{ background: '#fef2f2', color: '#dc2626' }}>
                {activeIncidents.length} Active
              </span>
              <span className={styles.mini_badge} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                {completedIncidents.length} Completed
              </span>
            </div>
          </div>
          <div className={styles.table_wrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Patient ID</th>
                  <th>Ambulance</th>
                  <th>Hospital</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const amb = getAmbulanceInfo(incident.ambulance_id);
                  return (
                    <tr key={incident.id} className={incident.status === 'COMPLETED' ? styles.row_completed : ''}>
                      <td><strong>#{incident.id}</strong></td>
                      <td><StatusBadge status={incident.status} size="small" /></td>
                      <td>
                        <span className={styles.severity_badge} style={{ background: SEVERITY_COLORS[incident.severity] }}>
                          {SEVERITY_ICONS[incident.severity]} {incident.severity}
                        </span>
                      </td>
                      <td>#{incident.patient_id}</td>
                      <td>
                        {amb ? `#${amb.id} — ${amb.vehicle_number || `Ambulance #${amb.id}`}` : '—'}
                      </td>
                      <td>
                        {incident.hospital_id ? `#${incident.hospital_id} — ${getHospitalName(incident.hospital_id)}` : '—'}
                      </td>
                      <td className={styles.desc_cell}>{incident.description || '—'}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== FLEET TAB ===================== */}
      {activeTab === 'fleet' && (
        <div className={styles.fleet_tab}>
          <div className={styles.tab_header}>
            <h3>🚑 Ambulance Fleet ({ambulances.length})</h3>
            <div className={styles.tab_header_badges}>
              <span className={styles.mini_badge} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                {ambulances.filter((a) => a.status === 'available').length} Available
              </span>
              <span className={styles.mini_badge} style={{ background: '#fef2f2', color: '#dc2626' }}>
                {ambulances.filter((a) => a.status === 'busy').length} Busy
              </span>
              <span className={styles.mini_badge} style={{ background: '#f1f5f9', color: '#64748b' }}>
                {ambulances.filter((a) => a.status === 'off_duty').length} Off Duty
              </span>
            </div>
          </div>
          <div className={styles.fleet_grid}>
            {ambulances.map((amb) => (
              <div key={amb.id} className={`${styles.fleet_card} ${amb.status === 'available' ? styles.fleet_available : amb.status === 'busy' ? styles.fleet_busy : styles.fleet_offline}`}>
                <div className={styles.fleet_card_header}>
                  <span className={styles.fleet_id}>🚑 #{amb.id}{amb.vehicle_number ? ` — ${amb.vehicle_number}` : ''}</span>
                  <span className={`${styles.fleet_status} ${styles[`fleet_status_${amb.status}`]}`}>
                    {amb.status === 'available' ? '🟢' : amb.status === 'busy' ? '🔴' : '⚪'}
                    {' '}{amb.status?.toUpperCase()}
                  </span>
                </div>
                <div className={styles.fleet_card_body}>
                  {amb.capability_level && <p>🏷️ Capability: <strong>{amb.capability_level}</strong></p>}
                  <p>📊 Status: <strong>{amb.status}</strong></p>
                  {amb.latitude && amb.longitude && (
                    <p className={styles.fleet_coord}>📍 {amb.latitude?.toFixed(4)}, {amb.longitude?.toFixed(4)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== HOSPITALS TAB ===================== */}
      {activeTab === 'hospitals' && (
        <div className={styles.hospitals_tab}>
          <div className={styles.tab_header}>
            <h3>🏥 Hospital Network ({hospitals.length})</h3>
            <div className={styles.tab_header_badges}>
              <span className={styles.mini_badge} style={{ background: '#eff6ff', color: '#2563eb' }}>
                {availableBeds}/{totalBeds} ICU Beds Free
              </span>
            </div>
          </div>
          <div className={styles.hospital_grid}>
            {hospitals.map((h) => {
              const used = (h.total_icu_beds || 0) - (h.available_icu_beds || 0);
              const pct = h.total_icu_beds > 0 ? Math.round((used / h.total_icu_beds) * 100) : 0;
              return (
                <div key={h.id} className={styles.hospital_card}>
                  <div className={styles.hospital_card_header}>
                    <span className={styles.hospital_name}>{h.name}</span>
                    <span className={styles.hospital_id}>#{h.id}</span>
                  </div>
                  <div className={styles.hospital_card_body}>
                    {h.specialty && (
                      <span className={styles.specialty_badge}>
                        {h.specialty.replace(/_/g, ' ')}
                      </span>
                    )}
                    <div className={styles.bed_info}>
                      <div className={styles.bed_bar_wrap}>
                        <div className={styles.bed_bar}>
                          <div
                            className={styles.bed_fill}
                            style={{
                              width: `${pct}%`,
                              background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e',
                            }}
                          ></div>
                        </div>
                        <span className={styles.bed_text}>
                          {h.available_icu_beds}/{h.total_icu_beds} free
                        </span>
                      </div>
                    </div>
                    {h.latitude && h.longitude && (
                      <p className={styles.hospital_coord}>📍 {h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== ANALYTICS TAB ===================== */}
      {activeTab === 'analytics' && (
        <div className={styles.analytics_tab}>
          {analytics ? (
            <>
              {/* Summary Row */}
              <div className={styles.analytics_summary}>
                <div className={styles.analytics_summary_item}>
                  <span className={styles.analytics_big_num}>{analytics.total_incidents}</span>
                  <span>Total Incidents</span>
                </div>
                <div className={styles.analytics_summary_item}>
                  <span className={styles.analytics_big_num}>{analytics.active_incidents}</span>
                  <span>Active</span>
                </div>
                <div className={styles.analytics_summary_item}>
                  <span className={styles.analytics_big_num}>{analytics.completed_incidents}</span>
                  <span>Completed</span>
                </div>
                <div className={styles.analytics_summary_item}>
                  <span className={styles.analytics_big_num}>{analytics.connected_websockets ?? 0}</span>
                  <span>Live Clients</span>
                </div>
              </div>

              <div className={styles.analytics_grid}>
                {/* Incidents by Severity */}
                <div className={styles.analytics_card}>
                  <h4>Incidents by Severity</h4>
                  <div className={styles.analytics_list}>
                    {analytics.incidents_by_severity &&
                      Object.entries(analytics.incidents_by_severity).map(([sev, count]) => (
                        <div key={sev} className={styles.analytics_row}>
                          <div className={styles.analytics_row_left}>
                            <span className={styles.analytics_dot} style={{ background: SEVERITY_COLORS[sev] || '#94a3b8' }}></span>
                            <span>{sev}</span>
                          </div>
                          <div className={styles.analytics_row_right}>
                            <div className={styles.mini_bar}>
                              <div
                                className={styles.mini_bar_fill}
                                style={{
                                  width: `${analytics.total_incidents > 0 ? (count / analytics.total_incidents) * 100 : 0}%`,
                                  background: SEVERITY_COLORS[sev] || '#94a3b8',
                                }}
                              ></div>
                            </div>
                            <strong>{count}</strong>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Incidents by Status */}
                <div className={styles.analytics_card}>
                  <h4>Incidents by Status</h4>
                  <div className={styles.analytics_list}>
                    {analytics.incidents_by_status &&
                      Object.entries(analytics.incidents_by_status)
                        .filter(([, count]) => count > 0)
                        .map(([status, count]) => (
                          <div key={status} className={styles.analytics_row}>
                            <div className={styles.analytics_row_left}>
                              <span>{STATUS_LABELS[status] || status.replace(/_/g, ' ')}</span>
                            </div>
                            <div className={styles.analytics_row_right}>
                              <div className={styles.mini_bar}>
                                <div
                                  className={styles.mini_bar_fill}
                                  style={{
                                    width: `${analytics.total_incidents > 0 ? (count / analytics.total_incidents) * 100 : 0}%`,
                                    background: '#6366f1',
                                  }}
                                ></div>
                              </div>
                              <strong>{count}</strong>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>

                {/* Ambulance Status */}
                <div className={styles.analytics_card}>
                  <h4>Ambulance Fleet</h4>
                  <div className={styles.analytics_list}>
                    {analytics.ambulances_by_status &&
                      Object.entries(analytics.ambulances_by_status).map(([status, count]) => {
                        const statusColor = status === 'available' ? '#22c55e' : status === 'busy' ? '#ef4444' : '#94a3b8';
                        return (
                          <div key={status} className={styles.analytics_row}>
                            <div className={styles.analytics_row_left}>
                              <span className={styles.analytics_dot} style={{ background: statusColor }}></span>
                              <span>{status.replace(/_/g, ' ').toUpperCase()}</span>
                            </div>
                            <div className={styles.analytics_row_right}>
                              <div className={styles.mini_bar}>
                                <div
                                  className={styles.mini_bar_fill}
                                  style={{
                                    width: `${analytics.total_ambulances > 0 ? (count / analytics.total_ambulances) * 100 : 0}%`,
                                    background: statusColor,
                                  }}
                                ></div>
                              </div>
                              <strong>{count}</strong>
                            </div>
                          </div>
                        );
                      })}
                    <div className={styles.analytics_row}>
                      <span>Total Fleet</span>
                      <strong>{analytics.total_ambulances}</strong>
                    </div>
                  </div>
                </div>

                {/* Hospital Bed Capacity */}
                <div className={styles.analytics_card}>
                  <h4>Hospital Beds</h4>
                  <div className={styles.analytics_list}>
                    <div className={styles.analytics_row}>
                      <span>Total ICU Beds</span>
                      <strong>{analytics.total_icu_beds ?? '—'}</strong>
                    </div>
                    <div className={styles.analytics_row}>
                      <span>Available ICU Beds</span>
                      <strong style={{ color: '#22c55e' }}>{analytics.available_icu_beds ?? '—'}</strong>
                    </div>
                    <div className={styles.analytics_row}>
                      <span>Occupied</span>
                      <strong style={{ color: '#ef4444' }}>
                        {(analytics.total_icu_beds ?? 0) - (analytics.available_icu_beds ?? 0)}
                      </strong>
                    </div>
                    <div className={styles.analytics_row}>
                      <span>Occupancy Rate</span>
                      <strong>{analytics.bed_occupancy_percent ?? 0}%</strong>
                    </div>
                    <div className={styles.analytics_row}>
                      <span>Total Hospitals</span>
                      <strong>{analytics.total_hospitals}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.empty}>Loading analytics…</p>
          )}

          <div className={styles.analytics_footer}>
            <button className={styles.refresh_btn} onClick={loadAnalytics}>
              🔄 Refresh Analytics
            </button>
            {lastRefresh && (
              <span className={styles.last_refresh}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
