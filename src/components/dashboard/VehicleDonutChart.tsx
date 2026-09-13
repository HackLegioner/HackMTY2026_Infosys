'use client';

import React from 'react';

export const VehicleDonutChart: React.FC = () => {
  // 72% Moto (36), 28% Bici (12) -> total 48
  const percentage = 72;
  const strokeWidth = 14;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="w-full bg-[#121215] rounded-md border border-[#27272a] p-5 flex flex-col justify-between">
      <h4 className="text-xs font-bold text-[#fafafa] tracking-tight mb-2">
        División de Vehículos
      </h4>

      {/* Donut graphic */}
      <div className="relative w-full flex items-center justify-center my-2">
        <svg width="130" height="130" viewBox="0 0 130 130" className="transform -rotate-90">
          {/* Background circle (Bicis - 28%) */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            stroke="#27272a"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Main circle (Motos - 72%) */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            stroke="#fafafa"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold font-mono tracking-tight text-[#fafafa]">
            72%
          </span>
          <span className="text-[9px] text-[#71717a] font-medium -mt-0.5">
            Motorizado
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-1 text-[11px] text-[#71717a]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#fafafa] inline-block" />
          <span className="font-medium text-xs text-[#fafafa]">Motos (36)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#27272a] inline-block" />
          <span className="font-medium text-xs text-[#71717a]">Bicis (12)</span>
        </div>
      </div>
    </div>
  );
};

export default VehicleDonutChart;
