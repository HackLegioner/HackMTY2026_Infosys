'use client';

import React from 'react';
import { Coordinates } from '@/lib/types';

interface SurgeZoneProps {
  center: Coordinates;
  radiusMeters: number;
  multiplier: number;
}

export const SurgeZone: React.FC<SurgeZoneProps> = ({ multiplier }) => {
  return (
    <div className="border border-amber-500/50 bg-amber-500/10 rounded-full animate-ping pointer-events-none p-4 text-center">
      <span className="text-xs font-bold text-amber-400">{multiplier}x Surge</span>
    </div>
  );
};

export default SurgeZone;
