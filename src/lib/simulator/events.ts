import { DisasterEvent } from '@/lib/types';

export const EVENT_PRESETS: DisasterEvent[] = [
  {
    id: 'surge_san_pedro',
    type: 'surge',
    description: 'Surge 1.8x en Zona Valle Oriente / San Pedro',
    lat: 25.6514,
    lng: -100.3235,
    radiusKm: 3.5,
    durationTicks: 15,
  },
  {
    id: 'closure_constitucion',
    type: 'closure',
    description: 'Cierre vial por obras en Av. Constitución y Félix U. Gómez',
    lat: 25.6712,
    lng: -100.2981,
    radiusKm: 1.5,
    durationTicks: 20,
  },
  {
    id: 'storm_monterrey',
    type: 'rain',
    description: 'Lluvia torrencial en área metropolitana de Monterrey (-30% velocidad)',
    lat: 25.6866,
    lng: -100.3161,
    radiusKm: 10,
    durationTicks: 25,
  },
];

export function createEventFromPreset(index: number = 0): DisasterEvent {
  const safeIndex = Math.max(0, Math.min(index, EVENT_PRESETS.length - 1));
  const preset = EVENT_PRESETS[safeIndex];
  return {
    ...preset,
    id: `${preset.id}_${Date.now()}`,
  };
}
