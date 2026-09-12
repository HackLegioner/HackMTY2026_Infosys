'use client';

import React from 'react';
import { Coordinates } from '@/lib/types';

interface CourierMarkerProps {
  position: Coordinates;
  agentType: 'agent_a' | 'agent_b' | 'baseline';
  status: string;
}

export const CourierMarker: React.FC<CourierMarkerProps> = ({
  position,
  agentType,
  status,
}) => {
  const colorMap = {
    agent_a: 'bg-blue-500 border-blue-300',
    agent_b: 'bg-emerald-500 border-emerald-300',
    baseline: 'bg-gray-500 border-gray-300',
  };

  return (
    <div className="flex items-center space-x-1">
      <div className={`w-4 h-4 rounded-full border-2 ${colorMap[agentType]} animate-pulse`} />
      <span className="text-xs text-white font-mono bg-slate-900/80 px-1 rounded">
        {agentType} ({status})
      </span>
    </div>
  );
};

export default CourierMarker;
