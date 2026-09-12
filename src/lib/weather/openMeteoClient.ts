export interface WeatherReport {
  temperature: number;
  rainMm: number;
  showersMm: number;
  weatherCode: number;
  windSpeedKmh: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'extreme_heat';
  isRain: boolean;
  isExtremeHeat: boolean;
  suggestedSurgeMultiplier: number;
  speedMultiplier: number;
  description: string;
  fetchedAt: string;
}

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=25.6692&longitude=-100.3099&current=temperature_2m,rain,showers,weather_code,wind_speed_10m';

export async function fetchMonterreyWeather(): Promise<WeatherReport> {
  try {
    const res = await fetch(OPEN_METEO_URL, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const temp = typeof current.temperature_2m === 'number' ? current.temperature_2m : 28.0;
    const rain = typeof current.rain === 'number' ? current.rain : 0.0;
    const showers = typeof current.showers === 'number' ? current.showers : 0.0;
    const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
    const wind = typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : 10.0;

    // Rain detected if rain > 0, showers > 0, or WMO precipitation codes
    const isRainCode =
      (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
    const isRain = rain > 0 || showers > 0 || isRainCode;
    const isExtremeHeat = temp > 36.0;

    let condition: WeatherReport['condition'] = 'clear';
    let surgeMultiplier = 1.0;
    let speedMultiplier = 1.0;
    let description = `☀️ Monterrey despejado (${temp}°C)`;

    if (code >= 95 && code <= 99) {
      condition = 'storm';
      surgeMultiplier = 1.8;
      speedMultiplier = 0.55; // 25 -> 13.7 km/h
      description = `⛈️ Tormenta eléctrica en Monterrey (${temp}°C) — Surge 1.8x activado`;
    } else if (isRain) {
      condition = 'rain';
      surgeMultiplier = 1.5;
      speedMultiplier = 0.64; // 25 -> 16 km/h
      description = `🌧️ Lluvia en Monterrey (${temp}°C, ${rain + showers}mm) — Surge 1.5x activado`;
    } else if (isExtremeHeat) {
      condition = 'extreme_heat';
      surgeMultiplier = 1.35;
      speedMultiplier = 0.9;
      description = `🔥 Canícula / Calor extremo en Monterrey (${temp}°C > 36°C) — Surge 1.35x activado`;
    } else if (code >= 1 && code <= 3) {
      condition = 'cloudy';
      description = `⛅ Nubosidad parcial en Monterrey (${temp}°C)`;
    }

    return {
      temperature: temp,
      rainMm: rain,
      showersMm: showers,
      weatherCode: code,
      windSpeedKmh: wind,
      condition,
      isRain,
      isExtremeHeat,
      suggestedSurgeMultiplier: surgeMultiplier,
      speedMultiplier,
      description,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Robust fallback: Monterrey default clear weather
    console.warn('[Open-Meteo] Fallback to default clear weather:', err);
    return {
      temperature: 28.5,
      rainMm: 0,
      showersMm: 0,
      weatherCode: 0,
      windSpeedKmh: 9.0,
      condition: 'clear',
      isRain: false,
      isExtremeHeat: false,
      suggestedSurgeMultiplier: 1.0,
      speedMultiplier: 1.0,
      description: '☀️ Monterrey clima despejado (28.5°C)',
      fetchedAt: new Date().toISOString(),
    };
  }
}
