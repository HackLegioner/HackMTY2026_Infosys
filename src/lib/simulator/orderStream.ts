import { Coordinates, Order } from '@/lib/types';
import { haversineDistanceKm } from '@/lib/routing/osrmClient';

const MONTERREY_HOTSPOTS: { name: string; coord: Coordinates }[] = [
  { name: 'San Pedro Valle Oriente', coord: { lat: 25.6514, lng: -100.3235 } },
  { name: 'Macroplaza Centro', coord: { lat: 25.6692, lng: -100.3099 } },
  { name: 'Distrito Tec', coord: { lat: 25.6515, lng: -100.2895 } },
  { name: 'Obispado', coord: { lat: 25.6766, lng: -100.3444 } },
  { name: 'Parque Fundidora', coord: { lat: 25.6787, lng: -100.2847 } },
  { name: 'Cumbres Paseo de los Leones', coord: { lat: 25.7165, lng: -100.3789 } },
  { name: 'San Jerónimo', coord: { lat: 25.6791, lng: -100.3644 } },
];

function getRandomCoordNear(center: Coordinates, radiusDegrees = 0.015): Coordinates {
  const u = Math.random();
  const v = Math.random();
  const w = radiusDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  return {
    lat: Number((center.lat + x).toFixed(5)),
    lng: Number((center.lng + y).toFixed(5)),
  };
}

export function generateOrders(currentTick: number, count: number = 3): Order[] {
  const orders: Order[] = [];

  for (let i = 0; i < count; i++) {
    const pickupSpot = MONTERREY_HOTSPOTS[Math.floor(Math.random() * MONTERREY_HOTSPOTS.length)];
    let dropoffSpot = MONTERREY_HOTSPOTS[Math.floor(Math.random() * MONTERREY_HOTSPOTS.length)];
    if (dropoffSpot === pickupSpot) {
      dropoffSpot = MONTERREY_HOTSPOTS[(MONTERREY_HOTSPOTS.indexOf(pickupSpot) + 1) % MONTERREY_HOTSPOTS.length];
    }

    const pickup = getRandomCoordNear(pickupSpot.coord);
    const dropoff = getRandomCoordNear(dropoffSpot.coord);
    const distanceKm = Math.max(1.2, haversineDistanceKm(pickup, dropoff));
    
    // Realistic MXN courier rate: base $35 + $12-18/km
    const basePayout = 35 + distanceKm * (12 + Math.random() * 6);
    const payout = Math.round(basePayout);

    orders.push({
      id: `ord_${currentTick}_${Math.floor(Math.random() * 9000 + 1000)}`,
      pickup,
      dropoff,
      payout,
      distanceKm,
      expireAtTick: currentTick + Math.floor(Math.random() * 4 + 3),
      status: 'available',
    });
  }

  return orders;
}
