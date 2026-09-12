export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  waypoints: { lat: number; lng: number }[];
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateInterpolatedWaypoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  steps: number = 5
): { lat: number; lng: number }[] {
  const waypoints = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    waypoints.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    });
  }
  return waypoints;
}

export async function fetchRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteResult> {
  const osrmUrl = process.env.OSRM_URL || 'http://localhost:5000';
  const url = `${osrmUrl}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const waypoints = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          lat,
          lng,
        }));
        return {
          distanceKm: route.distance / 1000,
          durationMin: route.duration / 60,
          waypoints,
        };
      }
    }
  } catch (_err) {
    // Fallback to Haversine
  }

  const directDist = haversineDistanceKm(start.lat, start.lng, end.lat, end.lng);
  const estDist = directDist * 1.35; // City winding factor
  const estDuration = (estDist / 25) * 60; // 25 km/h avg speed
  return {
    distanceKm: Math.round(estDist * 100) / 100,
    durationMin: Math.round(estDuration * 10) / 10,
    waypoints: generateInterpolatedWaypoints(start, end),
  };
}
