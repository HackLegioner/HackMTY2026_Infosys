'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ShiftState } from '@/lib/types';

// Dynamically import LeafletMapInner with SSR disabled to avoid Next.js window undefined error
const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-[#0A0E1A] rounded-xl flex flex-col items-center justify-center text-slate-500 space-y-2">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono">Initializing Monterrey CartoDB Map...</span>
    </div>
  ),
});

interface MapViewProps {
  shiftState: ShiftState | null;
}

export const MapView: React.FC<MapViewProps> = ({ shiftState }) => {
  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-[#0A0E1A] shadow-2xl">
      <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="font-mono font-semibold">Monterrey Live Grid</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">CartoDB Dark Matter</span>
      </div>

      <LeafletMapInner shiftState={shiftState} />
    </div>
  );
};

export default MapView;
