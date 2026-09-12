import { Order, DisruptionEvent } from '@/lib/types';

export const MONTERREY_ZONES = [
  { lat: 25.6714, lon: -100.3102, name: 'Centro', weight: 1.4 },
  { lat: 25.6574, lon: -100.3684, name: 'San Pedro', weight: 1.8 },
  { lat: 25.7256, lon: -100.3116, name: 'Cumbres', weight: 1.2 },
  { lat: 25.649, lon: -100.4023, name: 'Valle Oriente', weight: 1.6 },
  { lat: 25.6866, lon: -100.3161, name: 'Tec / ITESM', weight: 1.5 },
  { lat: 25.7, lon: -100.28, name: 'Contry', weight: 1.1 },
  { lat: 25.66, lon: -100.29, name: 'Obispado', weight: 1.0 },
  { lat: 25.72, lon: -100.35, name: 'Escobedo', weight: 0.8 },
  { lat: 25.68, lon: -100.42, name: 'Santa Catarina', weight: 0.7 },
  { lat: 25.75, lon: -100.33, name: 'Apodaca', weight: 0.9 },
];

const PLATFORMS = ['rappi', 'didi', 'uber_eats'];
const ORDER_TYPES = ['food', 'groceries', 'pharmacy', 'package'];

// Calibrated realistic Monterrey platform pricing (MXN)
const BASE_PAY_RANGES: Record<string, [number, number]> = {
  food: [35, 55],
  groceries: [45, 75],
  pharmacy: [30, 50],
  package: [40, 65],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dlon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export class OrderStream {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  private pickZone() {
    const idx = Math.floor(this.random() * MONTERREY_ZONES.length);
    return MONTERREY_ZONES[idx];
  }

  public generateTick(elapsedSeconds: number, activeEvents: DisruptionEvent[]): Order[] {
    let surgeMultiplier = 1.0;
    for (const evt of activeEvents) {
      if ((evt.event_type === 'surge' || evt.type === 'surge') && evt.metadata?.multiplier) {
        surgeMultiplier = Math.max(surgeMultiplier, evt.metadata.multiplier);
      }
    }

    // Realistic order offer stream: 1 or 2 new orders per tick
    const nOrders = Math.floor(this.random() * 2) + 1;
    const orders: Order[] = [];

    for (let i = 0; i < nOrders; i++) {
      const pickupZone = this.pickZone();
      const dropoffZone = this.pickZone();
      const orderType = ORDER_TYPES[Math.floor(this.random() * ORDER_TYPES.length)];
      const [minPay, maxPay] = BASE_PAY_RANGES[orderType];
      
      const rawDist = haversineKm(pickupZone.lat, pickupZone.lon, dropoffZone.lat, dropoffZone.lon);
      const estDist = Math.max(1.2, Math.round(rawDist * 1.35 * 10) / 10);
      
      // Real formula: base pay + extra km fee ($6.5 MXN/km above 2km)
      const distBonus = Math.max(0, (estDist - 2.0) * 6.5);
      const basePay = Math.round(minPay + this.random() * (maxPay - minPay) + distBonus);
      const estTime = Math.round((estDist / 25) * 60 * 10) / 10;
      
      // Tips in Mexico: 60% $0, 25% $10, 15% $20
      const tipRoll = this.random();
      const tip = tipRoll < 0.6 ? 0 : tipRoll < 0.85 ? 10 : 20;

      const totalPay = Math.round((basePay * surgeMultiplier + tip) * 100) / 100;
      const payPerKm = Math.round((totalPay / estDist) * 100) / 100;
      const payPerMin = Math.round((totalPay / Math.max(1, estTime)) * 100) / 100;

      const ordId = `ord_${Date.now().toString(36)}_${i}`;

      orders.push({
        order_id: ordId,
        id: ordId,
        platform: PLATFORMS[Math.floor(this.random() * PLATFORMS.length)],
        order_type: orderType,
        pickup: {
          lat: Number((pickupZone.lat + (this.random() - 0.5) * 0.012).toFixed(5)),
          lon: Number((pickupZone.lon + (this.random() - 0.5) * 0.012).toFixed(5)),
          lng: Number((pickupZone.lon + (this.random() - 0.5) * 0.012).toFixed(5)),
          zone: pickupZone.name,
        },
        dropoff: {
          lat: Number((dropoffZone.lat + (this.random() - 0.5) * 0.012).toFixed(5)),
          lon: Number((dropoffZone.lon + (this.random() - 0.5) * 0.012).toFixed(5)),
          lng: Number((dropoffZone.lon + (this.random() - 0.5) * 0.012).toFixed(5)),
          zone: dropoffZone.name,
        },
        base_pay: basePay,
        surge_multiplier: surgeMultiplier,
        total_pay: totalPay,
        payout: totalPay,
        pay_per_km: payPerKm,
        pay_per_min: payPerMin,
        estimated_distance_km: estDist,
        distanceKm: estDist,
        estimated_time_min: estTime,
        expires_in_seconds: 15,
      });
    }

    return orders;
  }
}
