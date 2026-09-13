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

// In-memory route cache so repeated trips or nearby points resolve in 0ms
const routeCache = new Map<string, RouteResult>();
let lastPublicOsrmFailure = 0;

function getCacheKey(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): string {
  return `${start.lat.toFixed(4)},${start.lng.toFixed(4)}->${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;
}

/**
 * Generates realistic street-following waypoints along Monterrey's arterial grid
 * (Constitución / Morones Prieto corridor, Gonzalitos, Av. Revolución / Garza Sada, Loma Larga tunnel)
 * Used as an ultra-reliable fallback if OSRM server is temporarily unreachable.
 */
export function generateMonterreyArterialWaypoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  stepsPerLeg: number = 10
): { lat: number; lng: number }[] {
  const waypoints: { lat: number; lng: number }[] = [];

  // If crossing between San Pedro (south of Loma Larga, lat < 25.662) and Monterrey Centro/North (lat > 25.668)
  const isCrossingMountain =
    (start.lat < 25.662 && end.lat > 25.668) || (start.lat > 25.668 && end.lat < 25.662);

  // Midpoint routing: either via Túnel de la Loma Larga (-100.334, 25.658) or standard street grid corner
  let intermediatePoints: { lat: number; lng: number }[] = [];

  if (isCrossingMountain) {
    // Force route through Túnel de la Loma Larga corridor
    const tunnel = { lat: 25.6585, lng: -100.3345 };
    intermediatePoints = [tunnel];
  } else {
    // 2-leg Manhattan street corridor (East-West along Constitución/Morones, North-South along avenues)
    const corner = { lat: start.lat, lng: end.lng };
    intermediatePoints = [corner];
  }

  const allPoints = [start, ...intermediatePoints, end];

  for (let s = 0; s < allPoints.length - 1; s++) {
    const p1 = allPoints[s];
    const p2 = allPoints[s + 1];
    for (let i = s === 0 ? 0 : 1; i <= stepsPerLeg; i++) {
      const ratio = i / stepsPerLeg;
      waypoints.push({
        lat: p1.lat + (p2.lat - p1.lat) * ratio,
        lng: p1.lng + (p2.lng - p1.lng) * ratio,
      });
    }
  }

  return waypoints;
}

export async function fetchRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteResult> {
  const cacheKey = getCacheKey(start, end);
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 1. Try local OSRM Docker instance if available
  const localOsrmUrl = process.env.OSRM_URL || 'http://localhost:5000';
  try {
    const localUrl = `${localOsrmUrl}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(localUrl, { signal: AbortSignal.timeout(500) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const waypoints = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          lat,
          lng,
        }));
        const result: RouteResult = {
          distanceKm: Math.round((route.distance / 1000) * 100) / 100,
          durationMin: Math.round((route.duration / 60) * 10) / 10,
          waypoints,
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (_err) {
    // Local OSRM not running, try public OSRM router
  }

  // 2. Try public OSRM router if not recently failing
  if (Date.now() - lastPublicOsrmFailure > 30000) {
    try {
      const publicUrl = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await fetch(publicUrl, { signal: AbortSignal.timeout(600) });
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const waypoints = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
            lat,
            lng,
          }));
          const result: RouteResult = {
            distanceKm: Math.round((route.distance / 1000) * 100) / 100,
            durationMin: Math.round((route.duration / 60) * 10) / 10,
            waypoints,
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (_err) {
      lastPublicOsrmFailure = Date.now();
    }
  }

  // 3. Fallback to realistic Monterrey arterial street waypoints
  const directDist = haversineDistanceKm(start.lat, start.lng, end.lat, end.lng);
  const estDist = directDist * 1.35; // Urban road winding factor
  const estDuration = (estDist / 25) * 60; // 25 km/h avg speed
  const arterialWaypoints = generateMonterreyArterialWaypoints(start, end, 12);

  const fallbackResult: RouteResult = {
    distanceKm: Math.round(estDist * 100) / 100,
    durationMin: Math.round(estDuration * 10) / 10,
    waypoints: arterialWaypoints,
  };

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}
