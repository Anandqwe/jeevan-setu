import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { StatusBadge } from '../../shared/ui';

const createIcon = (type, severity, isActive, status) => {
  let color, size, pulseColor, bgOpacity;

  switch (type) {
    case 'incident':
      color = severity === 'critical' ? '#ef4444' :
              severity === 'high' ? '#f97316' :
              severity === 'medium' ? '#eab308' : '#22c55e';
      size = isActive ? 18 : 12;
      pulseColor = color;
      bgOpacity = '15';
      break;
    case 'ambulance':
      color = status === 'available' ? '#06b6d4' :
              status === 'dispatched' ? '#3b82f6' :
              status === 'en_route' ? '#8b5cf6' : '#6b7280';
      size = 14;
      pulseColor = '#06b6d4';
      bgOpacity = '20';
      break;
    case 'hospital':
      color = '#a855f7';
      size = 14;
      pulseColor = '#a855f7';
      bgOpacity = '15';
      break;
    default:
      color = '#6b7280';
      size = 10;
      pulseColor = color;
      bgOpacity = '10';
  }

  const showPulse = type === 'incident' && (severity === 'critical' || isActive);
  const emoji = type === 'ambulance' ? '🚑' : type === 'hospital' ? '🏥' : '';

  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      ${showPulse ? `
        <div style="
          position:absolute;
          width:${size * 3}px; height:${size * 3}px;
          border-radius:50%;
          background:${pulseColor}${bgOpacity};
          animation: marker-pulse 2s ease-out infinite;
        "></div>
      ` : ''}
      ${emoji ? `
        <div style="
          font-size:${size + 6}px;
          line-height:1;
          filter:drop-shadow(0 2px 4px ${color}60) drop-shadow(0 0 8px ${color}30);
          transform: translateZ(0);
        ">
          ${emoji}
        </div>
      ` : `
        <div style="
          width:${size}px; height:${size}px;
          border-radius:50%;
          background:${color};
          border:2px solid rgba(255,255,255,0.9);
          box-shadow: 0 0 8px ${color}80, 0 0 20px ${color}30, 0 2px 8px rgba(0,0,0,0.3);
          ${isActive ? `animation: marker-bounce 1s ease-in-out infinite;` : ''}
          transition: all 0.3s ease;
        "></div>
      `}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-marker',
    iconSize: [size * 3, size * 3],
    iconAnchor: [size * 1.5, size * 1.5],
    popupAnchor: [0, -size * 1.5],
  });
};

export default function AnimatedMarker({
  position,
  type = 'incident',
  severity,
  label,
  isActive = false,
  status,
  occupancy,
  onClick,
}) {
  const icon = useMemo(
    () => createIcon(type, severity, isActive, status),
    [type, severity, isActive, status]
  );

  if (!position || !position[0] || !position[1]) return null;

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : {}}
    >
      <Popup>
        <div className="text-xs min-w-[140px]">
          <p className="font-bold text-sm mb-1.5">{label}</p>
          {type === 'incident' && severity && (
            <p className="mb-0.5">
              Severity: <strong style={{ color: severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : '#eab308' }}>
                {severity}
              </strong>
            </p>
          )}
          {type === 'ambulance' && status && (
            <p className="mb-0.5">Status: <strong className="capitalize">{status?.replace(/_/g, ' ')}</strong></p>
          )}
          {type === 'hospital' && occupancy !== undefined && (
            <p className="mb-0.5">Occupancy: <strong>{occupancy}%</strong></p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
