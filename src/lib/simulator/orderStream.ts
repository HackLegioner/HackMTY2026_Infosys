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

const BASE_PAY_RANGES: Record<string, [number, number]> = {
  food: [35, 85],
  groceries: [45, 120],
  pharmacy: [30, 70],
  package: [50, 150],
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
      if (evt.event_type === 'surge' && evt.metadata?.multiplier) {
        surgeMultiplier = Math.max(surgeMultiplier, evt.metadata.multiplier);
      }
    }

    const nOrders = Math.floor(this.random() * 3) + 1; // 1 to 3 orders per tick
    const orders: Order[] = [];

    for (let i = 0; i < nOrders; i++) {
      const pickupZone = this.pickZone();
      const dropoffZone = this.pickZone();
      const orderType = ORDER_TYPES[Math.floor(this.random() * ORDER_TYPES.length)];
      const [minPay, maxPay] = BASE_PAY_RANGES[orderType];
      const basePay = Math.round(minPay + this.random() * (maxPay - minPay));
      const dist = haversineKm(pickupZone.lat, pickupZone.lon, dropoffZone.lat, dropoffZone.lon);
      const estDist = Math.max(1.2, Math.round(dist * 1.3 * 10) / 10);
      const estTime = Math.round((estDist / 25) * 60 * 10) / 10;
      const tip = [0, 10, 20, 30][Math.floor(this.random() * 4)];

      const totalPay = Math.round((basePay * surgeMultiplier + tip) * 100) / 100;
      const payPerKm = Math.round((totalPay / estDist) * 100) / 100;
      const payPerMin = Math.round((totalPay / Math.max(1, estTime)) * 100) / 100;

      orders.push({
        order_id: `ord_${Date.now().toString(36)}_${i}`,
        platform: PLATFORMS[Math.floor(this.random() * PLATFORMS.length)],
        order_type: orderType,
        pickup: {
          lat: pickupZone.lat + (this.random() - 0.5) * 0.01,
          lon: pickupZone.lon + (this.random() - 0.5) * 0.01,
          zone: pickupZone.name,
        },
        dropoff: {
          lat: dropoffZone.lat + (this.random() - 0.5) * 0.01,
          lon: dropoffZone.lon + (this.random() - 0.5) * 0.01,
          zone: dropoffZone.name,
        },
        base_pay: basePay,
        surge_multiplier: surgeMultiplier,
        total_pay: totalPay,
        pay_per_km: payPerKm,
        pay_per_min: payPerMin,
        estimated_distance_km: estDist,
        estimated_time_min: estTime,
        expires_in_seconds: 15,
      });
    }

    return orders;
  }
}
