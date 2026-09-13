export interface CongestionResult {
  speedKmh: number;
  speedKmPerMin: number;
  congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
  corridorName: string;
  isRushHour: boolean;
  rushHourMultiplier: number;
  zoneMultiplier: number;
  effectiveMultiplier: number;
}

/**
 * Monterrey Congestion Model
 * Calibrates real-life traffic speeds across key arteries and peak rush hours.
 * Base courier motorcycle speed: 25.0 km/h (free flow).
 * Bottlenecks (Gonzalitos, Morones Prieto, Centro): 10.0 - 14.0 km/h during rush hours.
 */
export function getMonterreyTimeOfDay(simulatedElapsedMinutes: number, startHourDecimal: number = 18.25): {
  hourDecimal: number;
  formattedTime: string;
  isRushHour: boolean;
  rushMultiplier: number;
} {
  const totalHours = (startHourDecimal + simulatedElapsedMinutes / 60) % 24;
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((totalHours - hours) * 60);
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Monterrey Peak Rush Hours:
  // Morning: 07:30 (7.5) to 09:30 (9.5)
  // Evening: 18:00 (18.0) to 20:30 (20.5)
  let isRushHour = false;
  let rushMultiplier = 1.0;

  if (totalHours >= 7.5 && totalHours <= 9.5) {
    isRushHour = true;
    const distFromPeak = Math.abs(totalHours - 8.25); // Peak at 08:15
    rushMultiplier = 0.58 + distFromPeak * 0.25;
  } else if (totalHours >= 18.0 && totalHours <= 20.5) {
    isRushHour = true;
    const distFromPeak = Math.abs(totalHours - 19.0); // Peak at 19:00
    rushMultiplier = 0.54 + distFromPeak * 0.22;
  } else if (totalHours >= 13.0 && totalHours <= 15.0) {
    // Lunch minor peak
    rushMultiplier = 0.85;
  }

  rushMultiplier = Math.max(0.52, Math.min(1.0, rushMultiplier));

  return {
    hourDecimal: totalHours,
    formattedTime,
    isRushHour,
    rushMultiplier,
  };
}

/**
 * Calculates local zone congestion weight based on courier location in Monterrey
 */
export function getZoneBottleneck(lat: number, lng: number): {
  zoneMultiplier: number;
  corridorName: string;
  isBottleneck: boolean;
} {
  // 1. Av. Gonzalitos corridor (major north-south artery)
  if (lng >= -100.358 && lng <= -100.338 && lat >= 25.662 && lat <= 25.715) {
    return {
      zoneMultiplier: 0.80,
      corridorName: 'Av. Gonzalitos',
      isBottleneck: true,
    };
  }

  // 2. Par Vial Constitución / Morones Prieto (along Santa Catarina riverbed)
  if (lat >= 25.654 && lat <= 25.672 && lng >= -100.410 && lng <= -100.270) {
    return {
      zoneMultiplier: 0.82,
      corridorName: 'Par Vial Constitución / Morones Prieto',
      isBottleneck: true,
    };
  }

  // 3. Monterrey Centro (Pino Suárez, Cuauhtémoc, Juárez, Zaragoza)
  if (lat >= 25.664 && lat <= 25.682 && lng >= -100.325 && lng <= -100.300) {
    return {
      zoneMultiplier: 0.84,
      corridorName: 'Centro de Monterrey',
      isBottleneck: true,
    };
  }

  // 4. Túnel de la Loma Larga (San Pedro - MTY bottleneck)
  if (lat >= 25.655 && lat <= 25.665 && lng >= -100.340 && lng <= -100.330) {
    return {
      zoneMultiplier: 0.78,
      corridorName: 'Túnel de la Loma Larga',
      isBottleneck: true,
    };
  }

  // 5. Centrito Valle & San Pedro commercial zone
  if (lat >= 25.648 && lat <= 25.665 && lng >= -100.390 && lng <= -100.355) {
    return {
      zoneMultiplier: 0.90,
      corridorName: 'San Pedro / Centrito Valle',
      isBottleneck: false,
    };
  }

  // 6. Tec de Monterrey / Av. Garza Sada
  if (lat >= 25.645 && lat <= 25.690 && lng >= -100.310 && lng <= -100.275) {
    return {
      zoneMultiplier: 0.88,
      corridorName: 'Av. Garza Sada / Zona Tec',
      isBottleneck: false,
    };
  }

  // 7. Av. Miguel Alemán (corredor San Nicolás - Apodaca / Aeropuerto)
  if (lat >= 25.710 && lat <= 25.790 && lng >= -100.260 && lng <= -100.180) {
    return {
      zoneMultiplier: 0.85,
      corridorName: 'Av. Miguel Alemán (Apodaca)',
      isBottleneck: true,
    };
  }

  // 8. Av. Paseo de los Leones (corredor arterial Cumbres)
  if (lat >= 25.700 && lat <= 25.760 && lng >= -100.440 && lng <= -100.360) {
    return {
      zoneMultiplier: 0.83,
      corridorName: 'Av. Paseo de los Leones (Cumbres)',
      isBottleneck: true,
    };
  }

  // 9. Av. Manuel L. Barragán / Sendero (San Nicolás - Escobedo)
  if (lat >= 25.720 && lat <= 25.790 && lng >= -100.340 && lng <= -100.300) {
    return {
      zoneMultiplier: 0.86,
      corridorName: 'Av. Barragán / Sendero Divisorio',
      isBottleneck: false,
    };
  }

  // 10. Carretera Nacional / Valle Alto
  if (lat >= 25.550 && lat <= 25.620 && lng >= -100.280 && lng <= -100.230) {
    return {
      zoneMultiplier: 0.88,
      corridorName: 'Carretera Nacional / Esfera',
      isBottleneck: false,
    };
  }

  // Default Monterrey grid
  return {
    zoneMultiplier: 1.0,
    corridorName: 'Monterrey Zona Metropolitana',
    isBottleneck: false,
  };
}

/**
 * Calculates calibrated effective speed for a courier in Monterrey
 * Targets 10.0 - 14.0 km/h in Centro/Gonzalitos/Morones during rush hours
 */
export function calculateCourierTrafficSpeed(
  lat: number,
  lng: number,
  simulatedElapsedMinutes: number,
  weatherSpeedMultiplier: number = 1.0,
  startHourDecimal: number = 18.25
): CongestionResult {
  const timeInfo = getMonterreyTimeOfDay(simulatedElapsedMinutes, startHourDecimal);
  const zoneInfo = getZoneBottleneck(lat, lng);

  const BASE_SPEED_KMH = 25.0;

  // Composite calculation:
  // Base 25 km/h * zoneMultiplier (0.80 - 1.0) * rushMultiplier (0.54 - 1.0)
  // Gonzalitos in peak rush: 25 * 0.80 * 0.54 = 10.8 km/h (within 10-14 km/h)
  // Centro in peak rush: 25 * 0.84 * 0.54 = 11.3 km/h (within 10-14 km/h)
  // Morones Prieto in peak rush: 25 * 0.82 * 0.54 = 11.1 km/h (within 10-14 km/h)
  // Off-peak: 20 - 25 km/h
  let effectiveMultiplier = zoneInfo.zoneMultiplier;
  if (timeInfo.isRushHour) {
    effectiveMultiplier *= timeInfo.rushMultiplier;
  }
  effectiveMultiplier *= weatherSpeedMultiplier;

  const rawSpeedKmh = BASE_SPEED_KMH * effectiveMultiplier;
  const speedKmh = Math.round(Math.max(10.0, Math.min(26.0, rawSpeedKmh)) * 10) / 10;
  const speedKmPerMin = speedKmh / 60;

  let congestionLevel: CongestionResult['congestionLevel'] = 'low';
  if (speedKmh <= 12.0) {
    congestionLevel = 'severe'; // 10.0 - 12.0 km/h
  } else if (speedKmh <= 14.5) {
    congestionLevel = 'heavy'; // 12.0 - 14.5 km/h
  } else if (speedKmh <= 19.0) {
    congestionLevel = 'moderate';
  }

  return {
    speedKmh,
    speedKmPerMin,
    congestionLevel,
    corridorName: zoneInfo.corridorName,
    isRushHour: timeInfo.isRushHour,
    rushHourMultiplier: timeInfo.rushMultiplier,
    zoneMultiplier: zoneInfo.zoneMultiplier,
    effectiveMultiplier,
  };
}
