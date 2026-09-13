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
  const getStatusBadge = () => {
    if ((courier.dispatchCooldownTicks || 0) > 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1 font-mono font-bold animate-pulse">
          <span>⏳</span> Cooldown App ({courier.dispatchCooldownTicks}m)
        </span>
      );
    }
    switch (courier.status) {
      case 'moving_to_pickup':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            Pickup ➔ {courier.currentTask?.targetName || 'Restaurant'}
          </span>
        );
      case 'waiting_at_pickup':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1 font-mono">
            <span>🍳</span> Kitchen Waiting
          </span>
        );
      case 'delivering':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Delivering ➔ {courier.currentTask?.targetName || 'Customer'}
          </span>
        );
      case 'trapped_in_closure':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 font-mono font-bold animate-pulse">
            <span>🚧</span> Atrapado en Cierre (4 km/h)
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            ⚪ Idle (Available)
          </span>
        );
    }
  };

  const net = courier.netEarnings ?? courier.currentEarnings;

  return (
    <div
      className={`bg-[#111827]/80 backdrop-blur border ${borderColor} rounded-xl p-5 flex flex-col justify-between shadow-xl`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider bg-white/10 text-slate-200">
            {tag}
          </span>
        </div>

        <div className="flex justify-between items-center my-3">
          <div>
            <EarningsCounter amount={courier.currentEarnings} />
            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
              Neto:{' '}
              <strong className={net < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                ${net.toFixed(1)} MXN
              </strong>
            </span>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">Distance Traveled</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.totalKm.toFixed(1)} km
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Orders Completed</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.completedOrders} orders
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Carrying in Bag</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {courier.carryingOrders?.length || 0} active
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Incidentes / Multas</span>
            <span
              className={`font-mono font-bold text-sm ${
                courier.incidentsCount ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {courier.incidentsCount
                ? `⚠️ ${courier.incidentsCount} (-$${courier.penaltiesMXN || 0})`
                : '🛡️ 0 (Seguro)'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Rechazos / Cooldown</span>
            <span
              className={`font-mono font-bold text-sm ${
                (courier.dispatchCooldownTicks || 0) > 0
                  ? 'text-purple-400 animate-pulse'
                  : (courier.consecutiveSkips || 0) >= 3
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              {(courier.dispatchCooldownTicks || 0) > 0
                ? `⏳ ${courier.dispatchCooldownTicks}m cooldown`
                : `${courier.consecutiveSkips || 0}/4 seguidos (${courier.skippedOrders} tot)`}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Eficiencia $/km</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              ${courier.totalKm > 0 ? (net / courier.totalKm).toFixed(1) : '0.0'}/km
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPanel;
