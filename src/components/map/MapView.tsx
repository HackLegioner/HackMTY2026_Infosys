'use client';

import React, { useEffect, useState } from 'react';
import { ShiftState } from '@/lib/types';

interface MapViewProps {
  shiftState: ShiftState | null;
}

export const MapView: React.FC<MapViewProps> = ({ shiftState }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-[#0A0E1A] rounded-xl flex items-center justify-center text-slate-500 border border-slate-800">
        Loading Monterrey Map...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-slate-800 bg-[#0A0E1A]">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
        📍 Monterrey Live Grid — Lat: 25.6692, Lng: -100.3099
      </div>

      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl text-center">
          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-lg">
            <span className="text-xs font-semibold text-blue-400">Agent A (Economist)</span>
            <p className="text-sm font-mono text-white mt-1">
              {shiftState ? `${shiftState.agents.agent_a.lat.toFixed(4)}, ${shiftState.agents.agent_a.lng.toFixed(4)}` : 'Standby'}
            </p>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
            <span className="text-xs font-semibold text-emerald-400">Agent B (Hustler)</span>
            <p className="text-sm font-mono text-white mt-1">
              {shiftState ? `${shiftState.agents.agent_b.lat.toFixed(4)}, ${shiftState.agents.agent_b.lng.toFixed(4)}` : 'Standby'}
            </p>
          </div>
          <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
            <span className="text-xs font-semibold text-slate-400">Baseline (App)</span>
            <p className="text-sm font-mono text-white mt-1">
              {shiftState ? `${shiftState.agents.baseline.lat.toFixed(4)}, ${shiftState.agents.baseline.lng.toFixed(4)}` : 'Standby'}
            </p>
          </div>
        </div>

        {shiftState && shiftState.activeEvents.length > 0 && (
          <div className="mt-4 flex gap-2">
            {shiftState.activeEvents.map((ev) => (
              <span
                key={ev.id || ev.event_id}
                className="px-2.5 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
              >
                ⚠️ {(ev.type || ev.event_type || 'CRISIS').toUpperCase()}: {ev.description || 'Active'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
