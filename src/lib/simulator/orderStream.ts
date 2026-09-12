import { Order, DisruptionEvent } from '@/lib/types';
import { getMonterreyTimeOfDay, getZoneBottleneck } from '@/lib/traffic/congestionModel';

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

export type FoodType = 'snack' | 'fast_food' | 'casual_dining' | 'groceries' | 'buffet_gourmet';

// Kaggle Food Delivery Dataset: Kitchen prep time distributions (min, max in minutes)
const KAGGLE_PREP_TIMES: Record<FoodType, [number, number]> = {
  snack: [5, 8],
  fast_food: [10, 16],
  casual_dining: [18, 26],
  groceries: [8, 14],
  buffet_gourmet: [25, 35],
};

// Base pay ranges in Monterrey (MXN)
const BASE_PAY_RANGES: Record<FoodType, [number, number]> = {
  snack: [28, 42],
  fast_food: [35, 55],
  casual_dining: [50, 75],
  groceries: [45, 70],
  buffet_gourmet: [65, 95],
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
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const timeInfo = getMonterreyTimeOfDay(elapsedMinutes);

    // Weather condition check
    const hasRain = activeEvents.some((e) => e.event_type === 'rain');
    const hasHeat = activeEvents.some((e) => e.event_type === 'extreme_heat');

    // Aggregate surge multiplier from active events
    let surgeMultiplier = 1.0;
    for (const evt of activeEvents) {
      if (evt.metadata?.multiplier) {
        surgeMultiplier = Math.max(surgeMultiplier, evt.metadata.multiplier);
      }
    }

    // Realistic order offer stream: 1 to 3 orders per tick
    const nOrders = Math.floor(this.random() * 3) + 1;
    const orders: Order[] = [];

    const foodTypeKeys: FoodType[] = [
      'snack',
      'fast_food',
      'fast_food', // Higher frequency in delivery apps
      'casual_dining',
      'groceries',
      'buffet_gourmet',
    ];

    for (let i = 0; i < nOrders; i++) {
      const pickupZone = this.pickZone();
      const dropoffZone = this.pickZone();
      const foodType = foodTypeKeys[Math.floor(this.random() * foodTypeKeys.length)];

      // 1. Kaggle Prep Time Distribution
      const [minPrep, maxPrep] = KAGGLE_PREP_TIMES[foodType];
      const prepTimeMin = Math.round(minPrep + this.random() * (maxPrep - minPrep));

      // 2. Pricing and distance calculation
      const [minPay, maxPay] = BASE_PAY_RANGES[foodType];
      const rawDist = haversineKm(pickupZone.lat, pickupZone.lon, dropoffZone.lat, dropoffZone.lon);
      const estDist = Math.max(1.2, Math.round(rawDist * 1.35 * 10) / 10);
      
      // Distance fee: $6.50 MXN/km beyond 2km
      const distBonus = Math.max(0, (estDist - 2.0) * 6.5);
      const basePay = Math.round(minPay + this.random() * (maxPay - minPay) + distBonus);

      // 3. Traffic density evaluation along corridor
      const zoneBottleneck = getZoneBottleneck(pickupZone.lat, pickupZone.lon);
      let trafficDensity: Order['traffic_density'] = 'low';
      if (timeInfo.isRushHour && zoneBottleneck.zoneMultiplier <= 0.55) {
        trafficDensity = 'jam';
      } else if (timeInfo.isRushHour || zoneBottleneck.zoneMultiplier <= 0.65) {
        trafficDensity = 'high';
      } else if (zoneBottleneck.zoneMultiplier <= 0.85) {
        trafficDensity = 'medium';
      }

      // 4. Traffic delay adjustment to delivery time
      const speedFactor =
        trafficDensity === 'jam' ? 0.48 : trafficDensity === 'high' ? 0.62 : trafficDensity === 'medium' ? 0.80 : 1.0;
      const baseTravelMin = (estDist / 25) * 60;
      const estTime = Math.round((baseTravelMin / speedFactor + prepTimeMin) * 10) / 10;

      // 5. Kaggle Calibrated Tip Distribution (MXN)
      let tip = 0;
      const tipRoll = this.random();
      if (hasRain || hasHeat) {
        // Bad weather: customers tip higher
        if (tipRoll > 0.35) {
          tip = tipRoll < 0.65 ? Math.round(15 + this.random() * 15) : Math.round(35 + this.random() * 35);
        }
      } else {
        // Standard distribution: 55% $0, 25% $10-$20, 15% $25-$40, 5% $50+
        if (tipRoll >= 0.55 && tipRoll < 0.80) {
          tip = Math.round(10 + this.random() * 10);
        } else if (tipRoll >= 0.80 && tipRoll < 0.95) {
          tip = Math.round(25 + this.random() * 15);
        } else if (tipRoll >= 0.95) {
          tip = Math.round(50 + this.random() * 30);
        }
      }

      const totalPay = Math.round((basePay * surgeMultiplier + tip) * 100) / 100;
      const payPerKm = Math.round((totalPay / estDist) * 100) / 100;
      const payPerMin = Math.round((totalPay / Math.max(1, estTime)) * 100) / 100;

      const ordId = `ord_${Date.now().toString(36)}_${i}_${Math.floor(this.random() * 1000)}`;

      orders.push({
        order_id: ordId,
        id: ordId,
        platform: PLATFORMS[Math.floor(this.random() * PLATFORMS.length)],
        order_type: 'food',
        food_type: foodType,
        prep_time_min: prepTimeMin,
        traffic_density: trafficDensity,
        tip,
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
