import { DisruptionEvent } from '@/lib/types';

export const DEMO_PRESET_EVENTS: DisruptionEvent[] = [
  {
    event_id: 'evt_morones_flood',
    event_type: 'road_closure',
    lat: 25.667250,
    lon: -100.312540,
    radius_km: 1.2,
    affected_zones: ['Centro / Macroplaza', 'Barrio Antiguo'],
    metadata: {
      road: 'Par Vial Constitución / Félix U. Gómez',
      reason: 'Inundación por Crecida del Río Santa Catarina',
      speed_drop_kmh: 4.0,
      level: 'Hardcore',
    },
    description: '🚧 Inundación Total — Par Vial Constitución & Félix U. Gómez (Velocidad cae a 4 km/h)',
    active: true,
  },
  {
    event_id: 'evt_surge_centrito',
    event_type: 'surge',
    lat: 25.657821,
    lon: -100.367412,
    radius_km: 2.8,
    affected_zones: ['Centrito Valle', 'Calzada del Valle', 'Fashion Drive'],
    metadata: { multiplier: 2.5, reason: 'High Demand Gourmet Peak', level: 'Medio' },
    description: '⚡ Surge 2.5x en Centrito Valle & Calzada del Valle (San Pedro)',
    active: true,
  },
  {
    event_id: 'evt_surge_bbva',
    event_type: 'surge',
    lat: 25.669810,
    lon: -100.244720,
    radius_km: 3.2,
    affected_zones: ['Guadalupe Centro / Estadio BBVA', 'Linda Vista'],
    metadata: { multiplier: 3.0, reason: 'Clásico Regio Estadio BBVA', level: 'Hardcore' },
    description: '⚽ Surge 3.0x Clásico Regio — Estadio BBVA / La Pastora (+400% pedidos)',
    active: true,
  },
  {
    event_id: 'evt_gonzalitos_block',
    event_type: 'road_closure',
    lat: 25.689040,
    lon: -100.354210,
    radius_km: 1.0,
    affected_zones: ['San Jerónimo', 'Galerías Monterrey'],
    metadata: { road: 'Av. Gonzalitos / Fleteros', reason: 'Mega Obra y Cierre de Carriles', speed_drop_kmh: 5.0, level: 'Medio' },
    description: '🚧 Cierre Vial — Av. Gonzalitos & Fleteros (Paso a Desnivel Bloqueado)',
    active: true,
  },
  {
    event_id: 'evt_storm_santa_catarina',
    event_type: 'rain',
    lat: 25.665000,
    lon: -100.330000,
    radius_km: 12.0,
    affected_zones: ['Centro', 'San Pedro', 'DistritoTec', 'Cumbres'],
    metadata: { multiplier: 1.8, reason: 'Tormenta Torrencial Cuenca Río Santa Catarina', speed_multiplier: 0.60, level: 'Medio' },
    description: '⛈️ Tormenta Torrencial — Lluvia 45mm/h, asfalto resbaloso y velocidad -40%',
    active: true,
  },
  {
    event_id: 'evt_unsafe_independencia',
    event_type: 'unsafe_zone',
    lat: 25.642500,
    lon: -100.283000,
    radius_km: 1.5,
    affected_zones: ['Independencia / Cerro de la Campana'],
    metadata: { risk_level: 'critical', penalty_mxn: 45.0, reason: 'Riesgo Crítico de Robo de Carga', level: 'Fácil' },
    description: '⚠️ Zona de Riesgo Crítico — Colonia Independencia (-$45 MXN por riesgo de carga)',
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
