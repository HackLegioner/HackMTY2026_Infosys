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
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm">
      <h4 className="text-xs font-bold text-[#09090B] dark:text-zinc-100 tracking-tight mb-2">
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
            stroke="#E4E4E7"
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Main circle (Motos - 72%) */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            stroke="#09090B"
            className="stroke-zinc-900 dark:stroke-zinc-100"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-black font-mono tracking-tight text-[#09090B] dark:text-zinc-100">
            72%
          </span>
          <span className="text-[9px] text-[#71717A] dark:text-zinc-400 font-medium -mt-0.5">
            Motorizado
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-1 text-[11px] text-[#71717A] dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#09090B] dark:bg-zinc-100 inline-block" />
          <span className="font-medium text-xs text-[#09090B] dark:text-zinc-300">Motos (36)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#E4E4E7] dark:bg-zinc-700 inline-block" />
          <span className="font-medium text-xs text-[#71717A] dark:text-zinc-400">Bicis (12)</span>
        </div>
      </div>
    </div>
  );
};

export default VehicleDonutChart;
