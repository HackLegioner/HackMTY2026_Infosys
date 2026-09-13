'use client';

import React from 'react';
import { DisasterEvent } from '@/lib/types';

interface EventBannerProps {
  events: DisasterEvent[];
  onTriggerEvent?: (index: number) => void;
}

export const EventBanner: React.FC<EventBannerProps> = ({ events, onTriggerEvent }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 my-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400">⚡</span>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Disaster & Surge Scenarios
          </h4>
        </div>

        {onTriggerEvent && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTriggerEvent(0)}
              className="px-2.5 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition flex items-center gap-1 font-medium"
              title="Disparar tarifa dinámica 2.5x en San Pedro"
            >
              <span>⚡</span> + Surge 2.5x
            </button>
            <button
              onClick={() => onTriggerEvent(1)}
              className="px-2.5 py-1 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded transition flex items-center gap-1 font-medium"
              title="Bloqueo total en Av. Constitución (4 km/h)"
            >
              <span>🚧</span> + Cierre Vial
            </button>
            <button
              onClick={() => onTriggerEvent(2)}
              className="px-2.5 py-1 text-xs bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded transition flex items-center gap-1 font-medium"
              title="Tormenta con -40% velocidad y asfalto resbaloso"
            >
              <span>⛈️</span> + Tormenta Lluvia
            </button>
            <button
              onClick={() => onTriggerEvent(3)}
              className="px-2.5 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded transition flex items-center gap-1 font-medium"
              title="Zona peligrosa (-$45 MXN penalización si entras)"
            >
              <span>⚠️</span> + Zona Riesgo
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-slate-500">Operaciones normales en Monterrey. Sin contingencias activas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {events.map((ev) => {
            const isClosure = ev.event_type === 'road_closure' || ev.type === 'road_closure';
            const isUnsafe = ev.event_type === 'unsafe_zone' || ev.type === 'unsafe_zone';
            const isRain = ev.event_type === 'rain' || ev.type === 'rain';

            const badgeBorder = isClosure
              ? 'border-rose-500/40 bg-rose-950/30 text-rose-200'
              : isUnsafe
              ? 'border-purple-500/40 bg-purple-950/30 text-purple-200'
              : isRain
              ? 'border-sky-500/40 bg-sky-950/30 text-sky-200'
              : 'border-amber-500/40 bg-amber-950/30 text-amber-200';

            const dotBg = isClosure
              ? 'bg-rose-400'
              : isUnsafe
              ? 'bg-purple-400'
              : isRain
              ? 'bg-sky-400'
              : 'bg-amber-400';

            return (
              <div
                key={ev.id || ev.event_id}
                className={`px-3 py-1.5 rounded border text-xs flex items-center space-x-2 ${badgeBorder}`}
              >
                <span className={`w-2 h-2 rounded-full animate-ping ${dotBg}`} />
                <span className="font-bold uppercase text-[11px]">
                  {ev.type || ev.event_type}:
                </span>
                <span className="text-slate-300">{ev.description || 'Active scenario'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventBanner;
