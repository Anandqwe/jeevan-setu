import { useEffect, useRef } from 'react';
import L from 'leaflet';
import styles from './TrackingMap.module.css';

/**
 * Interpolate between two [lat, lng] points.  t: 0..1
 */
const interpolate = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/**
 * Given a polyline (array of [lat, lng] pairs), return the position at fraction t (0..1).
 */
const positionAlongRoute = (route, t) => {
  if (!route || route.length < 2) return route?.[0] || [0, 0];
  const segLengths = [];
  let totalLen = 0;
  for (let i = 1; i < route.length; i++) {
    const d = Math.sqrt(
      (route[i][0] - route[i - 1][0]) ** 2 + (route[i][1] - route[i - 1][1]) ** 2
    );
    segLengths.push(d);
    totalLen += d;
  }
  if (totalLen === 0) return route[0];
  let target = t * totalLen;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i]) {
      return interpolate(route[i], route[i + 1], target / segLengths[i]);
    }
    target -= segLengths[i];
  }
  return route[route.length - 1];
};

/**
 * Fetch a real road route from OSRM (free, no API key).
 * Returns array of [lat, lng] pairs or null on failure.
 */
const fetchOSRMRoute = async (from, to) => {
  try {
    // OSRM expects lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    // GeoJSON coords are [lng, lat] — flip to [lat, lng]
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
};

const TrackingMap = ({
  center = [19.076, 72.8777],
  zoom = 12,
  markers = [],
  ambulancePositions = {},
  hospitalMarkers = [],
  onMapClick = null,
  selectedPosition = null,
  className = '',
  // --- Enhanced props ---
  emergencyMarker = null,       // { latitude, longitude, label? } — red pulsing marker
  routePoints = null,           // [[lat, lng], ...] — straight-line fallback route
  routeColor = '#6366f1',       // route line color
  animateAmbulance = false,     // whether to animate an ambulance along route
  animationDuration = 8000,     // ms for full route animation
  fitAllMarkers = false,        // auto-fit bounds to show every entity
  hideStaticAmbulance = false,  // hide the static ambulance marker when animating
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const animationRef = useRef(null); // { marker, rafId, dashIntervalId }
  const osrmCacheRef = useRef({ key: '', route: null }); // cache OSRM results

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      if (animationRef.current?.rafId) cancelAnimationFrame(animationRef.current.rafId);
      if (animationRef.current?.dashIntervalId) clearInterval(animationRef.current.dashIntervalId);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ---------- UPDATE MARKERS ----------
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const allLatLngs = [];

    // Add ambulance markers — skip if hideStaticAmbulance is true (animation handles it)
    if (!hideStaticAmbulance) {
      Object.entries(ambulancePositions).forEach(([id, pos]) => {
        const ambIcon = L.divIcon({
          className: styles.ambulance_marker,
          html: '<div class="ambulance-icon">🚑</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        L.marker([pos.latitude, pos.longitude], { icon: ambIcon })
          .bindPopup(`Ambulance #${id}`)
          .addTo(markersLayerRef.current);
        allLatLngs.push([pos.latitude, pos.longitude]);
      });
    } else {
      // Still include positions for fitBounds
      Object.values(ambulancePositions).forEach((pos) => {
        allLatLngs.push([pos.latitude, pos.longitude]);
      });
    }

    // Add hospital markers
    hospitalMarkers.forEach((hosp) => {
      const hospIcon = L.divIcon({
        className: styles.hospital_marker,
        html: `<div class="hospital-icon">🏥<span class="bed-count">${hosp.available_icu_beds ?? hosp.available_beds ?? ''}</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([hosp.latitude, hosp.longitude], { icon: hospIcon })
        .bindPopup(
          `<b>${hosp.name}</b><br/>ICU Beds: ${hosp.available_icu_beds ?? ''}/${hosp.total_icu_beds ?? ''}<br/>Specialty: ${hosp.specialty || ''}`
        )
        .addTo(markersLayerRef.current);
      allLatLngs.push([hosp.latitude, hosp.longitude]);
    });

    // Add generic markers
    markers.forEach((m) => {
      const icon = L.divIcon({
        className: styles.custom_marker,
        html: `<div style="font-size: 24px">${m.icon || '📍'}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([m.latitude, m.longitude], { icon })
        .bindPopup(m.popup || '')
        .addTo(markersLayerRef.current);
      allLatLngs.push([m.latitude, m.longitude]);
    });

    // Emergency marker — red pulsing circle
    if (emergencyMarker) {
      const emIcon = L.divIcon({
        className: `${styles.emergency_marker}`,
        html: `<div class="emergency-pulse"><span class="emergency-dot"></span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([emergencyMarker.latitude, emergencyMarker.longitude], { icon: emIcon })
        .bindPopup(emergencyMarker.label || '🚨 Emergency Location')
        .addTo(markersLayerRef.current);
      allLatLngs.push([emergencyMarker.latitude, emergencyMarker.longitude]);
    }

    // Add selected position marker
    if (selectedPosition) {
      const selIcon = L.divIcon({
        className: styles.selected_marker,
        html: '<div style="font-size: 28px">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([selectedPosition.latitude, selectedPosition.longitude], {
        icon: selIcon,
        draggable: true,
      })
        .bindPopup('Your Location')
        .addTo(markersLayerRef.current)
        .on('dragend', function (e) {
          const pos = e.target.getLatLng();
          if (onMapClick) onMapClick(pos.lat, pos.lng);
        });
      allLatLngs.push([selectedPosition.latitude, selectedPosition.longitude]);
    }

    // Fit bounds to show all markers
    if (fitAllMarkers && allLatLngs.length > 1 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(allLatLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [ambulancePositions, hospitalMarkers, markers, selectedPosition, emergencyMarker, fitAllMarkers, hideStaticAmbulance]);

  // ---------- ROUTE POLYLINE + ANIMATION ----------
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    // Cancel any running animation
    if (animationRef.current?.rafId) {
      cancelAnimationFrame(animationRef.current.rafId);
    }
    if (animationRef.current?.dashIntervalId) {
      clearInterval(animationRef.current.dashIntervalId);
    }
    animationRef.current = null;

    if (!routePoints || routePoints.length < 2) return;

    const startPt = routePoints[0];
    const endPt = routePoints[routePoints.length - 1];
    const cacheKey = `${startPt[0].toFixed(4)},${startPt[1].toFixed(4)}-${endPt[0].toFixed(4)},${endPt[1].toFixed(4)}`;

    // Try OSRM for real road route, fallback to straight line
    const drawRoute = (realRoute) => {
      if (!routeLayerRef.current) return;
      routeLayerRef.current.clearLayers();

      const pts = realRoute || routePoints;

      // Background glow
      L.polyline(pts, {
        color: routeColor,
        weight: 8,
        opacity: 0.2,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(routeLayerRef.current);

      // Main route line
      L.polyline(pts, {
        color: routeColor,
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(routeLayerRef.current);

      // Animated dashed overlay (flowing road direction)
      const dashLine = L.polyline(pts, {
        color: '#ffffff',
        weight: 2,
        opacity: 0.5,
        lineJoin: 'round',
        dashArray: '8 16',
        dashOffset: '0',
      }).addTo(routeLayerRef.current);

      let dashOff = 0;
      const dashIntervalId = setInterval(() => {
        dashOff = (dashOff + 1) % 24;
        dashLine.setStyle({ dashOffset: String(dashOff) });
      }, 60);

      // --- AMBULANCE ANIMATION (one-way, stops at destination) ---
      if (animateAmbulance) {
        const ambIcon = L.divIcon({
          className: styles.ambulance_animated,
          html: '<div class="ambulance-anim-icon">🚑</div>',
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });

        const animMarker = L.marker(pts[0], { icon: ambIcon, zIndexOffset: 1000 })
          .bindPopup('🚑 Ambulance en route')
          .addTo(routeLayerRef.current);

        // Draw a "trail" line behind the ambulance as it moves
        const trailLine = L.polyline([], {
          color: routeColor,
          weight: 5,
          opacity: 0.5,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(routeLayerRef.current);

        let startTime = null;
        const totalDuration = animationDuration;

        const step = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const t = Math.min(elapsed / totalDuration, 1);

          // Ease-out quad — starts fast, decelerates to a stop (like arriving)
          const eased = 1 - (1 - t) * (1 - t);
          const pos = positionAlongRoute(pts, eased);
          animMarker.setLatLng(pos);

          // Build trail from start to current position
          const trailPts = [pts[0]];
          let accumulated = 0;
          const totalTarget = eased;
          let totalLen = 0;
          const segLens = [];
          for (let i = 1; i < pts.length; i++) {
            const d = Math.sqrt(
              (pts[i][0] - pts[i - 1][0]) ** 2 + (pts[i][1] - pts[i - 1][1]) ** 2
            );
            segLens.push(d);
            totalLen += d;
          }
          let remaining = totalTarget * totalLen;
          for (let i = 0; i < segLens.length; i++) {
            if (remaining <= segLens[i]) {
              trailPts.push(interpolate(pts[i], pts[i + 1], remaining / segLens[i]));
              break;
            }
            trailPts.push(pts[i + 1]);
            remaining -= segLens[i];
          }
          trailLine.setLatLngs(trailPts);

          if (t < 1) {
            animationRef.current = { ...animationRef.current, rafId: requestAnimationFrame(step) };
          }
          // t >= 1: animation STOPS — ambulance stays at destination, no loop
        };

        animationRef.current = { marker: animMarker, rafId: requestAnimationFrame(step), dashIntervalId };
      } else {
        animationRef.current = { dashIntervalId };
      }
    };

    // Try OSRM cache first
    if (osrmCacheRef.current.key === cacheKey && osrmCacheRef.current.route) {
      drawRoute(osrmCacheRef.current.route);
    } else {
      // Fetch OSRM route async, draw straight line immediately, redraw with road route when ready
      drawRoute(null); // draw straight line first

      fetchOSRMRoute(startPt, endPt).then((roadRoute) => {
        if (roadRoute && roadRoute.length >= 2) {
          osrmCacheRef.current = { key: cacheKey, route: roadRoute };
          drawRoute(roadRoute);
        }
      });
    }

    return () => {
      if (animationRef.current?.dashIntervalId) {
        clearInterval(animationRef.current.dashIntervalId);
      }
      if (animationRef.current?.rafId) {
        cancelAnimationFrame(animationRef.current.rafId);
      }
      animationRef.current = null;
    };
  }, [routePoints, routeColor, animateAmbulance, animationDuration]);

  return (
    <div className={`${styles.map_container} ${className}`}>
      <div ref={mapRef} className={styles.map}></div>
    </div>
  );
};

export default TrackingMap;
