'use client';

import React from 'react';

export const RouteNetworkMap: React.FC = () => {
  return (
    <div className="relative w-full h-[220px] bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-4 flex flex-col justify-between overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <h4 className="text-xs font-bold text-[#09090B] dark:text-zinc-100 tracking-tight">
          Rutas de Reparto (Zona Centro)
        </h4>
        <span className="text-[10px] font-mono tracking-widest text-[#71717A] dark:text-zinc-400 uppercase font-semibold">
          LIVE MAP
        </span>
      </div>

      {/* Monochromatic Street Network Graphic */}
      <div className="relative w-full h-full flex items-center justify-center my-1">
        <svg
          viewBox="0 0 300 160"
          className="w-full h-full max-h-[150px] text-zinc-900 dark:text-zinc-100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Grid Coordinates */}
          <line x1="20" y1="80" x2="280" y2="80" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="3 3" />
          <line x1="150" y1="10" x2="150" y2="150" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="3 3" />
          
          {/* Radial Concentric Rings representing Centro */}
          <circle cx="150" cy="80" r="18" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3" />
          <circle cx="150" cy="80" r="36" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25" />
          <circle cx="150" cy="80" r="54" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.18" strokeDasharray="2 2" />

          {/* Urban Grid Streets */}
          <path
            d="M132 62h36v36h-36z M120 50h60v60h-60z M140 35v90 M160 35v90 M105 70h90 M105 90h90"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeOpacity="0.35"
          />

          {/* Major Arteries / Avenidas Radiating Out */}
          <path d="M150 80 L60 40" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
          <path d="M150 80 L80 135" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
          <path d="M150 80 L230 45" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
          <path d="M150 80 L245 110" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
          <path d="M150 80 L150 15" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" />
          <path d="M150 80 L150 145" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" />

          {/* Secondary Arteries & Cross Streets */}
          <path d="M60 40 L40 60 M60 40 L50 20 M80 135 L55 125 M80 135 L95 150" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
          <path d="M230 45 L255 35 M230 45 L245 65 M245 110 L275 105 M245 110 L260 130" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />

          {/* Active Courier Route Animation Polyline */}
          <path
            d="M75 50 L115 65 L150 80 L210 95 L240 100"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="4 3"
            strokeLinecap="round"
            className="animate-pulse"
          />

          {/* Nodes */}
          <circle cx="150" cy="80" r="3.5" fill="currentColor" />
          <circle cx="75" cy="50" r="2.5" fill="currentColor" />
          <circle cx="240" cy="100" r="2.5" fill="currentColor" />

          {/* Node 1: REP-1 Tag */}
          <g transform="translate(48, 42)">
            <rect x="0" y="0" width="34" height="15" rx="7.5" fill="#09090B" className="dark:fill-zinc-100" />
            <text
              x="17"
              y="10.5"
              textAnchor="middle"
              fill="#FFFFFF"
              className="dark:fill-zinc-900"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              REP-1
            </text>
          </g>

          {/* Node 2: DEST Tag */}
          <g transform="translate(225, 92)">
            <rect x="0" y="0" width="32" height="15" rx="7.5" fill="#FFFFFF" stroke="#09090B" strokeWidth="1" className="dark:fill-zinc-900 dark:stroke-zinc-100" />
            <text
              x="16"
              y="10.5"
              textAnchor="middle"
              fill="#09090B"
              className="dark:fill-zinc-100"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              DEST
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default RouteNetworkMap;
