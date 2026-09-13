import { Order, DisruptionEvent } from '@/lib/types';
import { getMonterreyTimeOfDay, getZoneBottleneck } from '@/lib/traffic/congestionModel';

export interface RestaurantLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  municipality: string;
  corridor: string;
  foodType: FoodType;
  foodIcon: string;
  avgTicketMxn: number;
  prepTimeRange: [number, number]; // [min, max]
  weight: number;
}

export interface DropoffLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  municipality: string;
  sector: string;
  weight: number;
}

export interface ZoneLocation {
  lat: number;
  lon: number;
  name: string;
  weight: number;
  type: 'pickup' | 'dropoff' | 'both';
  municipality: string;
  description?: string;
}

export const REAL_MONTERREY_RESTAURANTS: RestaurantLocation[] = [
  // --- SAN PEDRO GARZA GARCÍA ---
  {
    id: 'rest_sonora_grill',
    name: 'Sonora Grill Prime (Centrito Valle)',
    lat: 25.657821,
    lon: -100.367412,
    municipality: 'San Pedro Garza García',
    corridor: 'Calzada del Valle / Río Mississipi',
    foodType: 'buffet_gourmet',
    foodIcon: 'R',
    avgTicketMxn: 850,
    prepTimeRange: [18, 25],
    weight: 1.9,
  },
  {
    id: 'rest_cara_de_vaca',
    name: 'Cara de Vaca (Calzada del Valle)',
    lat: 25.659104,
    lon: -100.361920,
    municipality: 'San Pedro Garza García',
    corridor: 'Calzada del Valle',
    foodType: 'buffet_gourmet',
    foodIcon: 'R',
    avgTicketMxn: 720,
    prepTimeRange: [15, 22],
    weight: 1.8,
  },
  {
    id: 'rest_gallo_71',
    name: 'Gallo 71 (Vasconcelos)',
    lat: 25.658230,
    lon: -100.369840,
    municipality: 'San Pedro Garza García',
    corridor: 'Av. José Vasconcelos',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 650,
    prepTimeRange: [14, 20],
    weight: 1.7,
  },
  {
    id: 'rest_shake_shack',
    name: 'Shake Shack (Fashion Drive)',
    lat: 25.637840,
    lon: -100.328910,
    municipality: 'San Pedro Garza García',
    corridor: 'Valle Oriente / Diego Rivera',
    foodType: 'fast_food',
    foodIcon: 'R',
    avgTicketMxn: 320,
    prepTimeRange: [8, 12],
    weight: 2.0,
  },
  {
    id: 'rest_la_torrada',
    name: 'La Torrada (Plaza Fiesta San Agustín)',
    lat: 25.639120,
    lon: -100.331200,
    municipality: 'San Pedro Garza García',
    corridor: 'Real San Agustín',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 580,
    prepTimeRange: [16, 24],
    weight: 1.8,
  },

  // --- MONTERREY SUR & DISTRITOTEC ---
  {
    id: 'rest_taqueria_juarez',
    name: 'Taquería Juárez (Garza Sada)',
    lat: 25.651890,
    lon: -100.289450,
    municipality: 'Monterrey',
    corridor: 'DistritoTec / Garza Sada',
    foodType: 'snack',
    foodIcon: 'R',
    avgTicketMxn: 180,
    prepTimeRange: [6, 10],
    weight: 2.1,
  },
  {
    id: 'rest_sierra_madre',
    name: 'Sierra Madre Brewing Co. (Nuevo Sur)',
    lat: 25.653410,
    lon: -100.282100,
    municipality: 'Monterrey',
    corridor: 'Av. Revolución / Nuevo Sur',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 380,
    prepTimeRange: [12, 16],
    weight: 1.9,
  },
  {
    id: 'rest_tacos_el_primo',
    name: 'Tacos El Primo (Av. Revolución)',
    lat: 25.642100,
    lon: -100.281200,
    municipality: 'Monterrey',
    corridor: 'Contry / Av. Revolución',
    foodType: 'snack',
    foodIcon: 'R',
    avgTicketMxn: 160,
    prepTimeRange: [5, 8],
    weight: 1.6,
  },

  // --- MONTERREY CENTRO & OBISPADO ---
  {
    id: 'rest_almacen_42',
    name: 'Almacén 42 (Barrio Antiguo)',
    lat: 25.666980,
    lon: -100.306820,
    municipality: 'Monterrey',
    corridor: 'Calle Morelos / Macroplaza',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 310,
    prepTimeRange: [10, 15],
    weight: 1.7,
  },
  {
    id: 'rest_me_muero_de_hambre',
    name: 'Me Muero de Hambre (Barrio Antiguo)',
    lat: 25.667450,
    lon: -100.305910,
    municipality: 'Monterrey',
    corridor: 'Barrio Antiguo Morelos',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 260,
    prepTimeRange: [12, 18],
    weight: 1.5,
  },
  {
    id: 'rest_botanero_moritas',
    name: 'Botanero Moritas (Obispado)',
    lat: 25.674890,
    lon: -100.344210,
    municipality: 'Monterrey',
    corridor: 'Av. Hidalgo / Chepevera',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 420,
    prepTimeRange: [10, 15],
    weight: 1.4,
  },

  // --- MONTERREY PONIENTE (SAN JERÓNIMO & CUMBRES) ---
  {
    id: 'rest_la_nacional',
    name: 'La Nacional (San Jerónimo)',
    lat: 25.687420,
    lon: -100.354890,
    municipality: 'Monterrey',
    corridor: 'Av. Fleteros / Gonzalitos',
    foodType: 'buffet_gourmet',
    foodIcon: 'R',
    avgTicketMxn: 780,
    prepTimeRange: [16, 22],
    weight: 1.8,
  },
  {
    id: 'rest_arbolitos_cajeme',
    name: 'Los Arbolitos de Cajeme (Galerías Mty)',
    lat: 25.688150,
    lon: -100.352100,
    municipality: 'Monterrey',
    corridor: 'Av. Insurgentes / Gonzalitos',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 490,
    prepTimeRange: [14, 18],
    weight: 1.7,
  },
  {
    id: 'rest_la_catarina',
    name: 'La Catarina (Paseo de los Leones)',
    lat: 25.728910,
    lon: -100.395420,
    municipality: 'Monterrey',
    corridor: 'Cumbres / Av. Leones',
    foodType: 'buffet_gourmet',
    foodIcon: 'R',
    avgTicketMxn: 620,
    prepTimeRange: [18, 25],
    weight: 1.6,
  },
  {
    id: 'rest_bww_cumbres',
    name: 'Buffalo Wild Wings (Plaza Cumbres)',
    lat: 25.729540,
    lon: -100.397810,
    municipality: 'Monterrey',
    corridor: 'Plaza Cumbres / Av. Hacienda Peñuelas',
    foodType: 'fast_food',
    foodIcon: 'R',
    avgTicketMxn: 340,
    prepTimeRange: [10, 14],
    weight: 1.7,
  },

  // --- SAN NICOLÁS DE LOS GARZA ---
  {
    id: 'rest_gran_pastor',
    name: 'El Gran Pastor (Plaza Fiesta Anáhuac)',
    lat: 25.727820,
    lon: -100.312940,
    municipality: 'San Nicolás de los Garza',
    corridor: 'Av. Manuel L. Barragán',
    foodType: 'buffet_gourmet',
    foodIcon: 'R',
    avgTicketMxn: 520,
    prepTimeRange: [15, 20],
    weight: 1.6,
  },
  {
    id: 'rest_atarantados',
    name: 'Tacos Atarantados (Ciudad Universitaria UANL)',
    lat: 25.724120,
    lon: -100.308760,
    municipality: 'San Nicolás de los Garza',
    corridor: 'Av. Universidad / Estadio Universitario',
    foodType: 'snack',
    foodIcon: 'R',
    avgTicketMxn: 210,
    prepTimeRange: [6, 9],
    weight: 1.9,
  },

  // --- APODACA ---
  {
    id: 'rest_italiannis',
    name: 'Italianni’s (Paseo La Fe / Citadel)',
    lat: 25.727910,
    lon: -100.218920,
    municipality: 'Apodaca',
    corridor: 'Av. Miguel Alemán',
    foodType: 'casual_dining',
    foodIcon: 'R',
    avgTicketMxn: 390,
    prepTimeRange: [14, 18],
    weight: 1.7,
  },
  {
    id: 'rest_huerfanos',
    name: 'Tacos Los Huérfanos (Apodaca Centro)',
    lat: 25.781890,
    lon: -100.188420,
    municipality: 'Apodaca',
    corridor: 'Av. Zaragoza / Centro',
    foodType: 'snack',
    foodIcon: 'R',
    avgTicketMxn: 140,
    prepTimeRange: [5, 8],
    weight: 1.4,
  },

  // --- SANTA CATARINA ---
  {
    id: 'rest_mochomos',
    name: 'Mochomos (Vía Cordillera)',
    lat: 25.659840,
    lon: -100.421500,
    municipality: 'Santa Catarina',
    corridor: 'Valle Poniente / Alfonso Reyes',
    foodType: 'buffet_gourmet',
    foodIcon: 'R',
    avgTicketMxn: 820,
    prepTimeRange: [16, 22],
    weight: 1.5,
  },
];

export const REAL_MONTERREY_DROPOFFS: DropoffLocation[] = [
  { id: 'drop_del_valle', name: 'Colonia Del Valle', lat: 25.6520, lon: -100.3620, municipality: 'San Pedro', sector: 'Valle Central', weight: 1.9 },
  { id: 'drop_fuentes_valle', name: 'Fuentes del Valle', lat: 25.6560, lon: -100.3540, municipality: 'San Pedro', sector: 'Valle Oriente', weight: 1.6 },
  { id: 'drop_valle_oriente', name: 'Valle Oriente Residencial', lat: 25.6320, lon: -100.3240, municipality: 'San Pedro', sector: 'Lázaro Cárdenas', weight: 1.8 },
  { id: 'drop_distrito_tec', name: 'DistritoTec / Roma', lat: 25.6500, lon: -100.2920, municipality: 'Monterrey', sector: 'Sur Garza Sada', weight: 2.0 },
  { id: 'drop_contry', name: 'Contry Las Águilas', lat: 25.6320, lon: -100.2780, municipality: 'Monterrey', sector: 'Sur Revolución', weight: 1.5 },
  { id: 'drop_obispado', name: 'Obispado / Chepevera', lat: 25.6745, lon: -100.3440, municipality: 'Monterrey', sector: 'Centro-Poniente', weight: 1.3 },
  { id: 'drop_san_jeronimo', name: 'San Jerónimo Residencial', lat: 25.6780, lon: -100.3700, municipality: 'Monterrey', sector: 'Poniente', weight: 1.6 },
  { id: 'drop_cumbres_elite', name: 'Cumbres Elite / Puerta de Hierro', lat: 25.7420, lon: -100.4280, municipality: 'Monterrey', sector: 'Cumbres Poniente', weight: 1.7 },
  { id: 'drop_cumbres_4to', name: 'Cumbres 4to Sector', lat: 25.7190, lon: -100.3850, municipality: 'Monterrey', sector: 'Leones', weight: 1.5 },
  { id: 'drop_anahuac', name: 'Anáhuac Residencial', lat: 25.7310, lon: -100.3150, municipality: 'San Nicolás', sector: 'Barragán', weight: 1.6 },
  { id: 'drop_las_puentes', name: 'Las Puentes 5to Sector', lat: 25.7450, lon: -100.2850, municipality: 'San Nicolás', sector: 'República Mexicana', weight: 1.4 },
  { id: 'drop_hacienda_palmas', name: 'Hacienda Las Palmas', lat: 25.7350, lon: -100.2080, municipality: 'Apodaca', sector: 'Concordia', weight: 1.5 },
  { id: 'drop_linda_vista', name: 'Linda Vista / Miguel Alemán', lat: 25.6980, lon: -100.2520, municipality: 'Guadalupe', sector: 'Linda Vista', weight: 1.5 },
  { id: 'drop_valle_poniente', name: 'Vía Cordillera Residencial', lat: 25.6610, lon: -100.4180, municipality: 'Santa Catarina', sector: 'Valle Poniente', weight: 1.4 },
];

export const MONTERREY_ZONES = REAL_MONTERREY_RESTAURANTS.map((r) => ({
  lat: r.lat,
  lon: r.lon,
  name: r.name,
  weight: r.weight,
  type: 'pickup' as const,
  municipality: r.municipality,
  description: r.corridor,
}));

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

  private weightedPickRestaurant(restaurants: RestaurantLocation[]): RestaurantLocation {
    const totalWeight = restaurants.reduce((sum, r) => sum + (r.weight || 1.0), 0);
    let r = this.random() * totalWeight;
    for (const rest of restaurants) {
      r -= rest.weight || 1.0;
      if (r <= 0) return rest;
    }
    return restaurants[restaurants.length - 1];
  }

  private weightedPickDropoff(dropoffs: DropoffLocation[]): DropoffLocation {
    const totalWeight = dropoffs.reduce((sum, d) => sum + (d.weight || 1.0), 0);
    let r = this.random() * totalWeight;
    for (const drop of dropoffs) {
      r -= drop.weight || 1.0;
      if (r <= 0) return drop;
    }
    return dropoffs[dropoffs.length - 1];
  }

  public pickPickupRestaurant(): RestaurantLocation {
    return this.weightedPickRestaurant(REAL_MONTERREY_RESTAURANTS);
  }

  public pickDropoffLocation(restaurant?: RestaurantLocation): DropoffLocation {
    if (restaurant) {
      // Prioritize urban radius (1.0 km to 6.5 km)
      const nearDropoffs = REAL_MONTERREY_DROPOFFS.filter((d) => {
        const dist = haversineKm(restaurant.lat, restaurant.lon, d.lat, d.lon);
        return dist >= 1.0 && dist <= 7.0;
      });
      if (nearDropoffs.length > 0) {
        return this.weightedPickDropoff(nearDropoffs);
      }
    }
    return this.weightedPickDropoff(REAL_MONTERREY_DROPOFFS);
  }

  public pickZone(): ZoneLocation {
    const r = this.pickPickupRestaurant();
    return {
      lat: r.lat,
      lon: r.lon,
      name: r.name,
      weight: r.weight,
      type: 'pickup',
      municipality: r.municipality,
      description: r.corridor,
    };
  }

  public generateTick(elapsedSeconds: number, activeEvents: DisruptionEvent[]): Order[] {
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const timeInfo = getMonterreyTimeOfDay(elapsedMinutes);

    // Weather condition check
    const hasRain = activeEvents.some((e) => e.event_type === 'rain');
    const hasHeat = activeEvents.some((e) => e.event_type === 'extreme_heat');

    // Aggregate surge multiplier from active events (capped realistically at 2.5x)
    let surgeMultiplier = 1.0;
    for (const evt of activeEvents) {
      if (evt.metadata?.multiplier) {
        surgeMultiplier = Math.max(surgeMultiplier, Math.min(2.5, evt.metadata.multiplier));
      }
    }

    // Realistic order offer stream: 1 to 3 orders per tick
    const nOrders = Math.floor(this.random() * 3) + 1;
    const orders: Order[] = [];

    for (let i = 0; i < nOrders; i++) {
      const restaurant = this.pickPickupRestaurant();
      const dropoff = this.pickDropoffLocation(restaurant);
      const foodType = restaurant.foodType;

      // 1. Kaggle Prep Time Distribution based on real restaurant kitchen
      const [minPrep, maxPrep] = restaurant.prepTimeRange || KAGGLE_PREP_TIMES[foodType];
      const prepTimeMin = Math.round(minPrep + this.random() * (maxPrep - minPrep));

      // 2. Pricing and distance calculation (1.2 km to 6.5 km urban motorbike trip)
      const [minPay, maxPay] = BASE_PAY_RANGES[foodType];
      const rawDist = haversineKm(restaurant.lat, restaurant.lon, dropoff.lat, dropoff.lon);
      const estDist = Math.max(1.2, Math.min(6.5, Math.round(rawDist * 1.35 * 10) / 10));

      // Distance fee: $3.50 MXN/km beyond 2km (calibrated Rappi/DiDi Monterrey rate)
      const distBonus = Math.max(0, (estDist - 2.0) * 3.5);
      const basePay = Math.round(minPay + this.random() * (maxPay - minPay) + distBonus);

      // 3. Traffic density evaluation along corridor
      const zoneBottleneck = getZoneBottleneck(restaurant.lat, restaurant.lon);
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
        // Bad weather: 45% tip rate ($12 - $30)
        if (tipRoll > 0.55) {
          tip = Math.round(12 + this.random() * 18);
        }
      } else {
        // Standard distribution: 60% $0, 25% $10-$20, 15% $20-$35
        if (tipRoll >= 0.60 && tipRoll < 0.85) {
          tip = Math.round(10 + this.random() * 10);
        } else if (tipRoll >= 0.85) {
          tip = Math.round(20 + this.random() * 15);
        }
      }

      const totalPay = Math.round((basePay * surgeMultiplier + tip) * 100) / 100;
      const payPerKm = Math.round((totalPay / estDist) * 100) / 100;
      const payPerMin = Math.round((totalPay / Math.max(1, estTime)) * 100) / 100;

      const ordId = `ord_mty_${Date.now().toString(36)}_${i}_${Math.floor(this.random() * 1000)}`;

      // Tight street-snapped curb jitter (±0.0008 deg ≈ 80 meters along the street)
      const pLat = Number((restaurant.lat + (this.random() - 0.5) * 0.0016).toFixed(6));
      const pLon = Number((restaurant.lon + (this.random() - 0.5) * 0.0016).toFixed(6));
      const dLat = Number((dropoff.lat + (this.random() - 0.5) * 0.0016).toFixed(6));
      const dLon = Number((dropoff.lon + (this.random() - 0.5) * 0.0016).toFixed(6));

      orders.push({
        order_id: ordId,
        id: ordId,
        platform: PLATFORMS[Math.floor(this.random() * PLATFORMS.length)],
        order_type: 'food',
        restaurant_name: restaurant.name,
        food_icon: restaurant.foodIcon,
        ticket_mxn: restaurant.avgTicketMxn,
        municipality: restaurant.municipality,
        food_type: foodType,
        prep_time_min: prepTimeMin,
        traffic_density: trafficDensity,
        tip,
        pickup: {
          lat: pLat,
          lon: pLon,
          lng: pLon,
          zone: restaurant.corridor,
          name: restaurant.name,
        },
        dropoff: {
          lat: dLat,
          lon: dLon,
          lng: dLon,
          zone: dropoff.sector,
          name: dropoff.name,
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
