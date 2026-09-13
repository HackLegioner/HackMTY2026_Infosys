'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ShiftState } from '@/lib/types';

// Dynamically import LeafletMapInner with SSR disabled to avoid Next.js window undefined error
const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-[#121215] rounded-md flex flex-col items-center justify-center text-[#71717a] space-y-2">
      <div className="w-6 h-6 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono">Iniciando Grid de Monterrey OSRM...</span>
    </div>
  ),
});

interface MapViewProps {
  shiftState: ShiftState | null;
}

export const MapView: React.FC<MapViewProps> = ({ shiftState }) => {
  return (
    <div className="relative w-full h-[520px] rounded-md overflow-hidden border border-[#27272a] bg-[#09090b]">
      <div className="absolute top-3.5 left-3.5 z-[400] bg-[#121215]/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-[#27272a] text-xs text-[#fafafa] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-mono font-bold">Monterrey Live Grid</span>
        <span className="text-[#3f3f46]">|</span>
        <span className="text-[#71717a] font-mono text-[11px]">CartoDB Dark Matter</span>
      </div>

      <LeafletMapInner shiftState={shiftState} />
    </div>
  );
};

export default MapView;
