'use client';

import React from 'react';
import { DisasterEvent } from '@/lib/types';

interface EventBannerProps {
  events: DisasterEvent[];
  onTriggerEvent?: (index: number) => void;
}

export const EventBanner: React.FC<EventBannerProps> = ({ events, onTriggerEvent }) => {
  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-[#fafafa] tracking-tight">
              Simulación de Contingencias & Eventos Críticos
            </h4>
          </div>
          <p className="text-xs text-[#71717a] mt-0.5">
            Inyecta perturbaciones viales y climáticas en Monterrey para evaluar resiliencia algorítmica.
          </p>
        </div>

        {onTriggerEvent && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTriggerEvent(0)}
              title="Disparar tarifa dinámica 2.5x en San Pedro"
              className="px-3 py-1.5 text-xs bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] rounded-md font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <span>⚡</span> + Surge 2.5x
            </button>
            <button
              onClick={() => onTriggerEvent(1)}
              title="Bloqueo total en Av. Gonzalitos / Constitución (Velocidad cae a 4 km/h)"
              className="px-3 py-1.5 text-xs bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] rounded-md font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <span>🚧</span> + Cierre Vial
            </button>
            <button
              onClick={() => onTriggerEvent(2)}
              title="Tormenta tropical: -40% velocidad en ruta y asfalto resbaloso"
              className="px-3 py-1.5 text-xs bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] rounded-md font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <span>⛈️</span> + Tormenta
            </button>
            <button
              onClick={() => onTriggerEvent(3)}
              title="Zona peligrosa: -$45 MXN penalización si el repartidor ingresa"
              className="px-3 py-1.5 text-xs bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] rounded-md font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <span>⚠️</span> + Zona Riesgo
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="py-1">
          <p className="text-xs font-mono text-[#71717a]">
            Tráfico y condiciones estables en el área metropolitana de Monterrey. Sin incidentes activos.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {events.map((ev) => {
            const evType = ev.type || ev.event_type || 'crisis';
            const isClosure = evType === 'road_closure';
            const isRisk = evType === 'unsafe_zone';
            const isStorm = evType === 'rain' || evType === 'storm';

            const dotColor = isClosure
              ? 'bg-rose-500'
              : isRisk
              ? 'bg-purple-400'
              : isStorm
              ? 'bg-sky-400'
              : 'bg-amber-400';

            const borderColor = isClosure
              ? 'border-rose-900/50 bg-rose-950/20'
              : isRisk
              ? 'border-purple-900/50 bg-purple-950/20'
              : isStorm
              ? 'border-sky-900/50 bg-sky-950/20'
              : 'border-amber-900/50 bg-amber-950/20';

            const impactLabel = isClosure
              ? 'Tráfico 4 km/h'
              : isRisk
              ? 'Penalización -$45'
              : isStorm
              ? '-40% Velocidad'
              : 'Surge 2.5x';

            return (
              <div
                key={ev.id || ev.event_id}
                className={`px-3 py-1.5 rounded-md border text-xs flex items-center space-x-2 font-mono ${borderColor}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
                <span className="font-bold text-[#fafafa]">
                  {evType.toUpperCase()}:
                </span>
                <span className="text-[#a1a1aa]">{ev.description || 'Incidente en curso'}</span>
                <span className="text-[10px] text-[#71717a] font-semibold border-l border-[#27272a] pl-2">
                  {impactLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventBanner;
