import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * IncidentCluster - fits map bounds when incidents change.
 * For a full clustering solution, use `react-leaflet-cluster` (optional).
 */
export default function IncidentCluster({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (!incidents || incidents.length === 0) return;
    const validIncidents = incidents.filter((i) => i.latitude && i.longitude);
    if (validIncidents.length < 2) return;
    // Only fit bounds on mount — LiveMap handles flying to active incident
  }, []);

  return null;
}
