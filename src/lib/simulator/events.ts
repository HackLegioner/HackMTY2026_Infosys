import { DisruptionEvent } from '@/lib/types';

export const DEMO_PRESET_EVENTS: DisruptionEvent[] = [
  {
    event_id: 'evt_surge_01',
    event_type: 'surge',
    lat: 25.6574,
    lon: -100.3684,
    radius_km: 3.5,
    affected_zones: ['Centrito Valle', 'Valle Oriente / Fashion Drive'],
    metadata: { multiplier: 2.5, reason: 'High Demand Surge' },
    description: '⚡ Alta Demanda — Tarifa Surge 2.5x en San Pedro / Valle Oriente',
    active: true,
  },
  {
    event_id: 'evt_closure_01',
    event_type: 'road_closure',
    lat: 25.667,
    lon: -100.309,
    radius_km: 1.0,
    affected_zones: ['Centro / Macroplaza'],
    metadata: { road: 'Av. Constitución / Pino Suárez', reason: 'Inundación y Cierre Vial', speed_drop_kmh: 4.0 },
    description: '🚧 Cierre Vial Total — Av. Constitución / Pino Suárez (Tráfico detenido a 4 km/h)',
    active: true,
  },
  {
    event_id: 'evt_rain_01',
    event_type: 'rain',
    lat: 25.6692,
    lon: -100.3099,
    radius_km: 15.0,
    affected_zones: ['Centro / Macroplaza', 'Centrito Valle', 'Tec / DistritoTec', 'Plaza Cumbres (Leones)'],
    metadata: { multiplier: 1.8, reason: 'Tormenta Eléctrica y Lluvia Torrencial', speed_multiplier: 0.60 },
    description: '⛈️ Tormenta Torrencial — Velocidad reducida -40%, asfalto peligroso y alta demora',
    active: true,
  },
  {
    event_id: 'evt_unsafe_01',
    event_type: 'unsafe_zone',
    lat: 25.642,
    lon: -100.28,
    radius_km: 2.0,
    affected_zones: ['Independencia / Campana'],
    metadata: { risk_level: 'critical', penalty_mxn: 45.0, reason: 'Zona de Alto Riesgo Delictivo' },
    description: '⚠️ Zona de Riesgo Crítico — Alto riesgo de robo o daño (-$45 MXN penalización)',
    active: true,
  },
];

export class EventEngine {
  private activeEvents: DisruptionEvent[] = [];

  constructor() {}

  public getActiveEvents(): DisruptionEvent[] {
    return this.activeEvents;
  }

  public triggerPreset(presetIndex: number = 0): DisruptionEvent | null {
    const preset = DEMO_PRESET_EVENTS[presetIndex % DEMO_PRESET_EVENTS.length];
    if (!this.activeEvents.some((e) => e.event_id === preset.event_id)) {
      this.activeEvents.push({ ...preset });
    }
    return preset;
  }

  public addEvent(event: DisruptionEvent): void {
    if (!this.activeEvents.some((e) => e.event_id === event.event_id)) {
      this.activeEvents.push({ ...event });
    }
  }

  public setEvents(events: DisruptionEvent[]): void {
    this.activeEvents = events.map((e) => ({ ...e }));
  }

  public clearEvents(): void {
    this.activeEvents = [];
  }
}
