import { Order, DisruptionEvent } from '@/lib/types';
import { getMonterreyTimeOfDay, getZoneBottleneck } from '@/lib/traffic/congestionModel';

export interface ZoneLocation {
  lat: number;
  lon: number;
  name: string;
  weight: number;
  type: 'pickup' | 'dropoff' | 'both';
  municipality: string;
  description?: string;
}

export const MONTERREY_ZONES: ZoneLocation[] = [
  // ─── MONTERREY ───
  {
    lat: 25.6692,
    lon: -100.3099,
    name: 'Centro / Macroplaza',
    weight: 1.6,
    type: 'both',
    municipality: 'Monterrey',
    description: 'Corredor comercial Morelos, Barrio Antiguo y restaurantes Centro',
  },
  {
    lat: 25.6870,
    lon: -100.3540,
    name: 'Galerías Monterrey / San Jerónimo',
    weight: 1.7,
    type: 'pickup',
    municipality: 'Monterrey',
    description: 'Food court principal Galerías y restaurantes Av. Insurgentes',
  },
  {
    lat: 25.7280,
    lon: -100.3950,
    name: 'Plaza Cumbres (Leones)',
    weight: 1.5,
    type: 'both',
    municipality: 'Monterrey',
    description: 'Hub gastronómico del poniente sobre Paseo de los Leones',
  },
  {
    lat: 25.7420,
    lon: -100.4280,
    name: 'Cumbres Elite / Puerta de Hierro',
    weight: 1.4,
    type: 'dropoff',
    municipality: 'Monterrey',
    description: 'Fraccionamientos residenciales de alta densidad en Cumbres Poniente',
  },
  {
    lat: 25.6514,
    lon: -100.2895,
    name: 'Tec / DistritoTec',
    weight: 1.8,
    type: 'both',
    municipality: 'Monterrey',
    description: 'Campus ITESM, Plaza Nuevo Sur y corredor Garza Sada',
  },
  {
    lat: 25.6320,
    lon: -100.2780,
    name: 'Contry / Las Águilas',
    weight: 1.2,
    type: 'dropoff',
    municipality: 'Monterrey',
    description: 'Zona residencial Contry al sur sobre Av. Revolución',
  },
  {
    lat: 25.6745,
    lon: -100.3440,
    name: 'Obispado / Chepevera',
    weight: 1.1,
    type: 'dropoff',
    municipality: 'Monterrey',
    description: 'Zona residencial tradicional y corporativos de Av. Hidalgo',
  },
  {
    lat: 25.6905,
    lon: -100.3465,
    name: 'Mitras / Área Médica UANL',
    weight: 1.3,
    type: 'pickup',
    municipality: 'Monterrey',
    description: 'Dark kitchens y comida rápida alrededor del Hospital Universitario',
  },
  {
    lat: 25.6780,
    lon: -100.3700,
    name: 'San Jerónimo Residencial',
    weight: 1.2,
    type: 'dropoff',
    municipality: 'Monterrey',
    description: 'Área residencial sobre Anillo Periférico',
  },
  {
    lat: 25.5780,
    lon: -100.2480,
    name: 'Carretera Nacional / Esfera',
    weight: 1.4,
    type: 'both',
    municipality: 'Monterrey',
    description: 'Esfera City Center, Pueblo Serena y colonias de Carretera Nacional',
  },

  // ─── SAN PEDRO GARZA GARCÍA ───
  {
    lat: 25.6574,
    lon: -100.3684,
    name: 'Centrito Valle',
    weight: 1.9,
    type: 'both',
    municipality: 'San Pedro Garza García',
    description: 'Corredor gastronómico de alta gama en Calzada del Valle',
  },
  {
    lat: 25.6375,
    lon: -100.3285,
    name: 'Valle Oriente / Fashion Drive',
    weight: 1.9,
    type: 'both',
    municipality: 'San Pedro Garza García',
    description: 'Plaza Fiesta San Agustín, Fashion Drive y torres corporativas',
  },
  {
    lat: 25.6520,
    lon: -100.3620,
    name: 'Colonia Del Valle',
    weight: 1.5,
    type: 'dropoff',
    municipality: 'San Pedro Garza García',
    description: 'Zona residencial de alto valor adquisitivo en San Pedro',
  },
  {
    lat: 25.6590,
    lon: -100.4200,
    name: 'Valle Poniente / UDEM',
    weight: 1.3,
    type: 'both',
    municipality: 'San Pedro Garza García',
    description: 'Campus UDEM, Vía Cordillera y desarrollos de Valle Poniente',
  },

  // ─── APODACA ───
  {
    lat: 25.7815,
    lon: -100.1885,
    name: 'Apodaca Centro',
    weight: 1.2,
    type: 'both',
    municipality: 'Apodaca',
    description: 'Centro de Apodaca y fraccionamientos de Av. Zaragoza',
  },
  {
    lat: 25.7275,
    lon: -100.2185,
    name: 'Paseo La Fe / Citadel',
    weight: 1.6,
    type: 'both',
    municipality: 'Apodaca',
    description: 'Gran polo comercial sobre Miguel Alemán con alta concentración restaurantera',
  },

  // ─── SAN NICOLÁS DE LOS GARZA ───
  {
    lat: 25.7270,
    lon: -100.3120,
    name: 'San Nicolás / Anáhuac & CU',
    weight: 1.5,
    type: 'both',
    municipality: 'San Nicolás de los Garza',
    description: 'Ciudad Universitaria UANL y Plaza Fiesta Anáhuac',
  },
  {
    lat: 25.7450,
    lon: -100.2850,
    name: 'Las Puentes / San Nicolás',
    weight: 1.2,
    type: 'dropoff',
    municipality: 'San Nicolás de los Garza',
    description: 'Sectores residenciales de Av. Las Puentes y República Mexicana',
  },

  // ─── GENERAL ESCOBEDO ───
  {
    lat: 25.7785,
    lon: -100.3205,
    name: 'Escobedo / Plaza Sendero',
    weight: 1.3,
    type: 'both',
    municipality: 'General Escobedo',
    description: 'Plaza Sendero Escobedo sobre Av. Sendero Divisorio y Barragán',
  },

  // ─── SANTA CATARINA ───
  {
    lat: 25.6760,
    lon: -100.4550,
    name: 'Santa Catarina / Paseo',
    weight: 1.1,
    type: 'both',
    municipality: 'Santa Catarina',
    description: 'Paseo Santa Catarina y zona comercial Carretera Saltillo',
  },

  // ─── GUADALUPE ───
  {
    lat: 25.6980,
    lon: -100.2520,
    name: 'Linda Vista (Guadalupe)',
    weight: 1.4,
    type: 'both',
    municipality: 'Guadalupe',
    description: 'Plaza Lindavista y comercios sobre Av. Miguel Alemán',
  },
  {
    lat: 25.6740,
    lon: -100.2450,
    name: 'Guadalupe Centro / Estadio BBVA',
    weight: 1.2,
    type: 'dropoff',
    municipality: 'Guadalupe',
    description: 'Centro de Guadalupe, Residencial Las Quintas y zona Rayados BBVA',
  },
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

// Base pay ranges in Monterrey (MXN) calibrated with DiDi Food & Rappi
const BASE_PAY_RANGES: Record<FoodType, [number, number]> = {
  snack: [24, 32],
  fast_food: [28, 38],
  casual_dining: [34, 46],
  groceries: [30, 42],
  buffet_gourmet: [40, 55],
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

  private weightedPick(zones: ZoneLocation[]): ZoneLocation {
    const totalWeight = zones.reduce((sum, z) => sum + (z.weight || 1.0), 0);
    let r = this.random() * totalWeight;
    for (const z of zones) {
      r -= z.weight || 1.0;
      if (r <= 0) return z;
    }
    return zones[zones.length - 1];
  }

  public pickPickupZone(): ZoneLocation {
    const candidates = MONTERREY_ZONES.filter((z) => z.type === 'pickup' || z.type === 'both');
    return this.weightedPick(candidates.length > 0 ? candidates : MONTERREY_ZONES);
  }

  public pickDropoffZone(pickupZone?: ZoneLocation): ZoneLocation {
    const candidates = MONTERREY_ZONES.filter((z) => z.type === 'dropoff' || z.type === 'both');

    // Preferir entregas dentro de un radio urbano estricto de motocicleta (<= 5.5 km)
    if (pickupZone) {
      const withinRadius = candidates.filter((z) => {
        if (z.name === pickupZone.name) return false;
        const d = haversineKm(pickupZone.lat, pickupZone.lon, z.lat, z.lon);
        return d <= 5.5;
      });
      if (withinRadius.length > 0) {
        return this.weightedPick(withinRadius);
      }
    }

    return this.weightedPick(candidates.length > 0 ? candidates : MONTERREY_ZONES);
  }

  public pickZone(): ZoneLocation {
    return this.weightedPick(MONTERREY_ZONES);
  }

  public generateTick(elapsedSeconds: number, activeEvents: DisruptionEvent[]): Order[] {
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const timeInfo = getMonterreyTimeOfDay(elapsedMinutes);

    // Weather condition check
    const hasRain = activeEvents.some((e) => e.event_type === 'rain');
    const hasHeat = activeEvents.some((e) => e.event_type === 'extreme_heat');

    // Aggregate surge multiplier from active events (capped realistically at 1.75x)
    let surgeMultiplier = 1.0;
    for (const evt of activeEvents) {
      if (evt.metadata?.multiplier) {
        surgeMultiplier = Math.max(surgeMultiplier, Math.min(1.75, evt.metadata.multiplier));
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
      const pickupZone = this.pickPickupZone();
      const dropoffZone = this.pickDropoffZone(pickupZone);
      const foodType = foodTypeKeys[Math.floor(this.random() * foodTypeKeys.length)];

      // 1. Kaggle Prep Time Distribution
      const [minPrep, maxPrep] = KAGGLE_PREP_TIMES[foodType];
      const prepTimeMin = Math.round(minPrep + this.random() * (maxPrep - minPrep));

      // 2. Pricing and distance calculation (max 6.5 km urban motorbike trip)
      const [minPay, maxPay] = BASE_PAY_RANGES[foodType];
      const rawDist = haversineKm(pickupZone.lat, pickupZone.lon, dropoffZone.lat, dropoffZone.lon);
      const estDist = Math.max(1.2, Math.min(6.5, Math.round(rawDist * 1.35 * 10) / 10));
      
      // Distance fee: $3.50 MXN/km beyond 2km (calibrated Rappi/DiDi Monterrey rate)
      const distBonus = Math.max(0, (estDist - 2.0) * 3.5);
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

      // 5. Realistic Monterrey Tip Distribution (MXN)
      let tip = 0;
      const tipRoll = this.random();
      if (hasRain || hasHeat) {
        // Bad weather: 40% tip rate ($10 - $25)
        if (tipRoll > 0.60) {
          tip = Math.round(10 + this.random() * 15);
        }
      } else {
        // Standard distribution: 65% $0, 25% $8-$15, 10% $18-$25
        if (tipRoll >= 0.65 && tipRoll < 0.90) {
          tip = Math.round(8 + this.random() * 7);
        } else if (tipRoll >= 0.90) {
          tip = Math.round(18 + this.random() * 8);
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
