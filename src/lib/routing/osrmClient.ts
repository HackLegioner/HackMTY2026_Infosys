import { Coordinates } from '@/lib/types';

const OSRM_URL = process.env.OSRM_URL || 'http://localhost:5000';

export function haversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export async function getRoute(
  start: Coordinates,
  end: Coordinates
): Promise<{ distanceKm: number; coordinates: Coordinates[] }> {
  try {
    const url = `${OSRM_URL}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=simplified&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          lat,
          lng,
        }));
        return {
          distanceKm: Number((route.distance / 1000).toFixed(2)),
          coordinates,
        };
      }
    }
  } catch {
    // Fallback if OSRM is offline
  }

  const distanceKm = haversineDistanceKm(start, end);
  return {
    distanceKm,
    coordinates: [start, end],
  };
}
