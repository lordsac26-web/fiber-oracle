import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Leaflet helper — fits the map to the given positions array.
 * Reacts to changes in the positions prop.
 */
export default function FitBoundsHelper({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions || positions.length === 0) return;
    const valid = positions.filter(
      ([lat, lng]) => typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)
    );
    if (valid.length === 0) return;
    const bounds = L.latLngBounds(valid);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [positions, map]);

  return null;
}