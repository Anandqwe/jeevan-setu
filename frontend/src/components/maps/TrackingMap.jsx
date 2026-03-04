import { useEffect, useRef, useCallback } from 'react';
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
 * Compute bearing (degrees clockwise from North) from point A to B.
 */
const bearing = (a, b) => {
  const dLng = (b[1] - a[1]) * (Math.PI / 180);
  const lat1 = a[0] * (Math.PI / 180);
  const lat2 = b[0] * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/**
 * Haversine distance in metres between two [lat, lng] points.
 */
const haversineMetres = (a, b) => {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Total distance along a polyline in metres.
 */
const polylineDistanceMetres = (pts) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineMetres(pts[i - 1], pts[i]);
  return d;
};

/**
 * Build a route‐endpoint cache key (rounded to 3 decimals ≈ 110 m).
 */
const routeKey = (pts) => {
  if (!pts || pts.length < 2) return '';
  const s = pts[0];
  const e = pts[pts.length - 1];
  return `${s[0].toFixed(3)},${s[1].toFixed(3)}-${e[0].toFixed(3)},${e[1].toFixed(3)}`;
};

/**
 * Fetch a real road route from OSRM (free, no API key).
 * Returns array of [lat, lng] pairs or null on failure.
 */
const fetchOSRMRoute = async (from, to) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
};

// Minimum speed 30 km/h, cap at 20s so short routes don't crawl
const SPEED_KMH = 50;
const MIN_DURATION = 5000;
const MAX_DURATION = 20000;

const durationForRoute = (pts) => {
  const distKm = polylineDistanceMetres(pts) / 1000;
  const rawMs = (distKm / SPEED_KMH) * 3600 * 1000;
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, rawMs));
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
  emergencyMarker = null,
  routePoints = null,
  routeColor = '#6366f1',
  animateAmbulance = false,
  animationDuration = 0,       // 0 = auto (distance-based)
  fitAllMarkers = false,
  hideStaticAmbulance = false,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);

  // Animation bookkeeping — stored in a single ref so cleanup is reliable
  const animStateRef = useRef({
    rafId: null,
    dashIntervalId: null,
    marker: null,
    activeRouteKey: '',     // prevents needless restarts when routePoints ref changes
  });

  const osrmCacheRef = useRef({});   // key → route
  const lastFitKeyRef = useRef('');  // debounce fitBounds

  // ── helpers ──
  const cancelAnimation = useCallback(() => {
    const st = animStateRef.current;
    if (st.rafId) { cancelAnimationFrame(st.rafId); st.rafId = null; }
    if (st.dashIntervalId) { clearInterval(st.dashIntervalId); st.dashIntervalId = null; }
  }, []);

  // ── Initialize map ──
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
      cancelAnimation();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── UPDATE MARKERS (non‐route) ──
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const allLatLngs = [];

    // Ambulance markers
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
      Object.values(ambulancePositions).forEach((pos) => {
        allLatLngs.push([pos.latitude, pos.longitude]);
      });
    }

    // Hospital markers
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

    // Generic markers
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

    // Emergency pulsing marker
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

    // Selected position
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

    // fitBounds — debounced by key so the map doesn't jump on every GPS tick
    if (fitAllMarkers && allLatLngs.length > 1 && mapInstanceRef.current) {
      const fitKey = allLatLngs.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|');
      if (fitKey !== lastFitKeyRef.current) {
        lastFitKeyRef.current = fitKey;
        const bounds = L.latLngBounds(allLatLngs);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [ambulancePositions, hospitalMarkers, markers, selectedPosition, emergencyMarker, fitAllMarkers, hideStaticAmbulance]);

  // ── ROUTE POLYLINE + ANIMATION ──
  useEffect(() => {
    if (!routeLayerRef.current) return;

    // Composite key: endpoints + animation state + color.
    // This ensures the effect re-runs when animateAmbulance toggles
    // (e.g. ASSIGNED → EN_ROUTE has same endpoints but animation turns on).
    const newKey = `${routeKey(routePoints)}|${animateAmbulance}|${routeColor}`;
    if (newKey === animStateRef.current.activeRouteKey && newKey !== '') return;

    // Something changed — clean up old animation
    cancelAnimation();
    routeLayerRef.current.clearLayers();
    animStateRef.current.activeRouteKey = newKey;

    if (!routePoints || routePoints.length < 2) return;

    const startPt = routePoints[0];
    const endPt = routePoints[routePoints.length - 1];
    const cacheKey = `${startPt[0].toFixed(4)},${startPt[1].toFixed(4)}-${endPt[0].toFixed(4)},${endPt[1].toFixed(4)}`;

    /**
     * Draw the route + optionally start animation.
     * Properly cancels any previously running timers before starting new ones.
     */
    const drawRoute = (realRoute) => {
      if (!routeLayerRef.current) return;

      // Cancel anything that's still running from a previous drawRoute call (OSRM double-draw)
      cancelAnimation();
      routeLayerRef.current.clearLayers();

      const pts = realRoute || routePoints;

      // ── Background glow ──
      L.polyline(pts, {
        color: routeColor,
        weight: 8,
        opacity: 0.2,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(routeLayerRef.current);

      // ── Main route line ──
      L.polyline(pts, {
        color: routeColor,
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(routeLayerRef.current);

      // ── Animated dashed overlay (flowing direction indicators) ──
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

      animStateRef.current.dashIntervalId = dashIntervalId;

      // ── AMBULANCE ANIMATION ──
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

        animStateRef.current.marker = animMarker;

        // Trail line drawn behind the ambulance
        const trailLine = L.polyline([], {
          color: routeColor,
          weight: 5,
          opacity: 0.45,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(routeLayerRef.current);

        // Duration: caller-specified or distance-based auto
        const totalDuration = animationDuration > 0 ? animationDuration : durationForRoute(pts);

        let startTime = null;
        let prevBearing = 0; // for smoothing direction

        const step = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const t = Math.min(elapsed / totalDuration, 1);

          // Ease-out quad — fast departure, gradual arrival
          const eased = 1 - (1 - t) * (1 - t);
          const pos = positionAlongRoute(pts, eased);
          animMarker.setLatLng(pos);

          // ── Rotate ambulance to face travel direction ──
          const lookAhead = Math.min(eased + 0.02, 1);
          const nextPos = positionAlongRoute(pts, lookAhead);
          if (pos[0] !== nextPos[0] || pos[1] !== nextPos[1]) {
            const angle = bearing(pos, nextPos);
            // CSS rotation: 0° = east for the emoji, offset so 0° bearing (north) looks correct
            const cssAngle = angle - 90; // 🚑 emoji faces right by default
            prevBearing = cssAngle;
            const el = animMarker.getElement();
            if (el) {
              el.style.transform = el.style.transform.replace(/rotate\([^)]+\)/, '') + ` rotate(${cssAngle}deg)`;
              el.style.transformOrigin = 'center center';
            }
          }

          // ── Build trail from start up to current position ──
          const trailPts = [pts[0]];
          const segLens = [];
          let totalLen = 0;
          for (let i = 1; i < pts.length; i++) {
            const d = Math.sqrt(
              (pts[i][0] - pts[i - 1][0]) ** 2 + (pts[i][1] - pts[i - 1][1]) ** 2
            );
            segLens.push(d);
            totalLen += d;
          }
          let remaining = eased * totalLen;
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
            animStateRef.current.rafId = requestAnimationFrame(step);
          }
          // t >= 1 → animation stops, ambulance stays at destination
        };

        animStateRef.current.rafId = requestAnimationFrame(step);
      }
    };

    // ── OSRM: try cache, then async fetch with straight-line fallback ──
    if (osrmCacheRef.current[cacheKey]) {
      drawRoute(osrmCacheRef.current[cacheKey]);
    } else {
      drawRoute(null); // straight line immediately

      fetchOSRMRoute(startPt, endPt).then((roadRoute) => {
        // Guard: only redraw if this route is still the active one
        if (roadRoute && roadRoute.length >= 2 && animStateRef.current.activeRouteKey === newKey) {
          osrmCacheRef.current[cacheKey] = roadRoute;
          drawRoute(roadRoute);
        }
      });
    }

    return () => {
      cancelAnimation();
    };
  }, [routePoints, routeColor, animateAmbulance, animationDuration, cancelAnimation]);

  return (
    <div className={`${styles.map_container} ${className}`}>
      <div ref={mapRef} className={styles.map}></div>
    </div>
  );
};

export default TrackingMap;
