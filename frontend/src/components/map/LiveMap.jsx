import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useRef } from 'react';
import useMapStore from '../../store/mapStore';
import useDispatchStore from '../../store/dispatchStore';
import AnimatedMarker from './AnimatedMarker';
import IncidentCluster from './IncidentCluster';
import 'leaflet/dist/leaflet.css';

function MapController() {
  const { center, zoom } = useMapStore();
  const map = useMap();
  const prevCenter = useRef(center);

  useEffect(() => {
    if (center[0] !== prevCenter.current[0] || center[1] !== prevCenter.current[1]) {
      map.flyTo(center, zoom, { duration: 1.2 });
      prevCenter.current = center;
    }
  }, [center, zoom, map]);

  return null;
}

export default function LiveMap({ className = '' }) {
  const { center, zoom } = useMapStore();
  const { incidents, ambulances, hospitals, activeIncident } = useDispatchStore();

  const setCenter = useMapStore((s) => s.setCenter);
  useEffect(() => {
    if (activeIncident?.latitude && activeIncident?.longitude) {
      setCenter([activeIncident.latitude, activeIncident.longitude]);
    }
  }, [activeIncident, setCenter]);

  const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full rounded-none"
        zoomControl={false}
        attributionControl={false}
        style={{ background: isDark ? '#06061a' : '#f0f0f0' }}
      >
        <TileLayer
          url={isDark ? darkTileUrl : lightTileUrl}
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />
        <MapController />

        {/* Incident markers */}
        {incidents.map((incident) => (
          <AnimatedMarker
            key={`inc-${incident.id}`}
            position={[incident.latitude, incident.longitude]}
            type="incident"
            severity={incident.severity}
            label={incident.description || `Incident #${incident.id}`}
            isActive={activeIncident?.id === incident.id}
            onClick={() => useDispatchStore.getState().setActiveIncident(incident)}
          />
        ))}

        {/* Ambulance markers */}
        {ambulances.map(
          (amb) =>
            amb.current_latitude &&
            amb.current_longitude && (
              <AnimatedMarker
                key={`amb-${amb.id}`}
                position={[amb.current_latitude, amb.current_longitude]}
                type="ambulance"
                label={amb.vehicle_number || `Ambulance #${amb.id}`}
                status={amb.status}
              />
            )
        )}

        {/* Hospital markers */}
        {hospitals.map(
          (hosp) =>
            hosp.latitude &&
            hosp.longitude && (
              <AnimatedMarker
                key={`hosp-${hosp.id}`}
                position={[hosp.latitude, hosp.longitude]}
                type="hospital"
                label={hosp.name}
                occupancy={
                  hosp.total_beds > 0
                    ? ((hosp.total_beds - hosp.available_beds) / hosp.total_beds * 100).toFixed(0)
                    : 0
                }
              />
            )
        )}

        <IncidentCluster incidents={incidents} />
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-panel rounded-2xl border border-[var(--border-color)] p-3.5 text-xs space-y-2">
        <p className="text-[0.55rem] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-1">Legend</p>
        {[
          { label: 'Critical', color: 'bg-red-500' },
          { label: 'High Priority', color: 'bg-orange-500' },
          { label: 'Medium/Low', color: 'bg-amber-500' },
          { label: 'Ambulance', color: 'bg-cyan-500' },
          { label: 'Hospital', color: 'bg-purple-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm`} />
            <span className="text-[var(--text-secondary)] font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
