'use client';

import React from 'react';
import { CourierState } from '@/lib/types';
import EarningsCounter from './EarningsCounter';

interface AgentPanelProps {
  title: string;
  subtitle: string;
  tag: string;
  borderColor: string;
  courier: CourierState;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  title,
  subtitle,
  tag,
  borderColor,
  courier,
}) => {
  return (
    <div
      className={`bg-[#111827]/80 backdrop-blur border ${borderColor} rounded-xl p-5 flex flex-col justify-between shadow-xl`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider bg-white/10 text-slate-200">
            {tag}
          </span>
        </div>

        <div className="my-4">
          <EarningsCounter amount={courier.currentEarnings} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">Distance</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.totalKm.toFixed(1)} km
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Orders Done</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.completedOrders}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Skipped</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.skippedOrders}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Avg Rate</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.totalKm > 0
                ? `$${(courier.currentEarnings / courier.totalKm).toFixed(1)}/km`
                : '$0/km'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPanel;
