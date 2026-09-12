import { DisruptionEvent } from '@/lib/types';

export const DEMO_PRESET_EVENTS: DisruptionEvent[] = [
  {
    event_id: 'evt_surge_01',
    event_type: 'surge',
    lat: 25.6574,
    lon: -100.3684,
    radius_km: 3.0,
    affected_zones: ['San Pedro', 'Valle Oriente'],
    metadata: { multiplier: 2.5, reason: 'Heavy Rain Surge' },
    description: '🌧️ Lluvia Intensa — Surge 2.5x en San Pedro / Valle Oriente',
    active: true,
  },
  {
    event_id: 'evt_closure_01',
    event_type: 'road_closure',
    lat: 25.667,
    lon: -100.309,
    radius_km: 0.8,
    affected_zones: ['Centro'],
    metadata: { road: 'Av. Constitución', reason: 'Accidente vial' },
    description: '🚧 Cierre Vial — Av. Constitución / Pino Suárez',
    active: true,
  },
  {
    event_id: 'evt_unsafe_01',
    event_type: 'unsafe_zone',
    lat: 25.642,
    lon: -100.28,
    radius_km: 2.0,
    affected_zones: ['Independencia'],
    metadata: { risk_level: 'high' },
    description: '⚠️ Zona de Riesgo — Agentes evitan área',
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
}
