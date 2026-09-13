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
        <span className="text-xs px-2.5 py-1 rounded-[4px] font-mono text-[#a1a1aa] border border-[#27272a] bg-transparent flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
          Cooldown ({courier.dispatchCooldownTicks}m)
        </span>
      );
    }
    switch (courier.status) {
      case 'moving_to_pickup':
        return (
          <span className="text-xs px-2.5 py-1 rounded-[4px] font-mono text-[#a1a1aa] border border-[#27272a] bg-transparent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Pickup: {courier.currentTask?.targetName || 'Restaurant'}
          </span>
        );
      case 'waiting_at_pickup':
        return (
          <span className="text-xs px-2.5 py-1 rounded-[4px] font-mono text-[#a1a1aa] border border-[#27272a] bg-transparent flex items-center gap-1.5">
            En Cocina
          </span>
        );
      case 'delivering':
        return (
          <span className="text-xs px-2.5 py-1 rounded-[4px] font-mono text-[#a1a1aa] border border-[#27272a] bg-transparent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Entregando
          </span>
        );
      case 'trapped_in_closure':
        return (
          <span className="text-xs px-2.5 py-1 rounded-[4px] font-mono text-rose-400 border border-rose-900/50 bg-transparent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Atrapado en Cierre
          </span>
        );
      default:
        return (
          <span className="text-xs px-2.5 py-1 rounded-[4px] font-mono text-[#71717a] border border-[#27272a] bg-transparent">
            Disponible (Idle)
          </span>
        );
    }
  };

  const net = courier.netEarnings ?? courier.currentEarnings;
  const profitPerKm = courier.totalKm > 0
    ? (net / courier.totalKm).toFixed(2)
    : '0.00';

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between hover:border-[#3f3f46] transition-colors">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#fafafa] tracking-tight">{title}</h3>
            <p className="text-xs font-mono text-[#71717a] mt-0.5">{subtitle}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-[4px] font-mono uppercase tracking-wider text-[#71717a] border border-[#27272a] bg-transparent">
            {tag}
          </span>
        </div>

        <div className="flex justify-between items-center my-3">
          <div>
            <EarningsCounter amount={courier.currentEarnings} />
            {courier.netEarnings !== undefined && (
              <span className="text-[11px] font-mono text-[#71717a] block mt-0.5">
                Neto: <strong className="text-[#fafafa] font-semibold">${net.toFixed(1)}</strong>
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#27272a] text-xs">
          <div>
            <span className="text-[#71717a] block text-xs mb-0.5">Distancia</span>
            <div className="font-mono text-xs sm:text-sm">
              <span className="text-[#fafafa] font-semibold">{courier.totalKm.toFixed(1)}</span>
              <span className="text-[#71717a] text-xs ml-1">km</span>
            </div>
          </div>
          <div>
            <span className="text-[#71717a] block text-xs mb-0.5">Entregas</span>
            <div className="font-mono text-xs sm:text-sm">
              <span className="text-[#fafafa] font-semibold">{courier.completedOrders}</span>
              <span className="text-[#71717a] text-xs ml-1">pedidos</span>
            </div>
          </div>
          <div>
            <span className="text-[#71717a] block text-xs mb-0.5">En Mochila</span>
            <div className="font-mono text-xs sm:text-sm">
              <span className="text-[#fafafa] font-semibold">{courier.carryingOrders?.length || 0}</span>
              <span className="text-[#71717a] text-xs ml-1">ítems</span>
            </div>
          </div>
          <div>
            <span className="text-[#71717a] block text-xs mb-0.5">Incidentes</span>
            <div className="font-mono text-xs sm:text-sm">
              {courier.incidentsCount ? (
                <span className="text-rose-400 font-semibold">
                  {courier.incidentsCount} (-${courier.penaltiesMXN || 0})
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">0 (Seguro)</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-[#71717a] block text-xs mb-0.5">Rechazos</span>
            <div className="font-mono text-xs sm:text-sm">
              {(courier.dispatchCooldownTicks || 0) > 0 ? (
                <span className="text-purple-400 font-semibold animate-pulse">
                  {courier.dispatchCooldownTicks}m cooldown
                </span>
              ) : (
                <span className="text-[#fafafa] font-semibold">
                  {courier.consecutiveSkips || 0}/4 <span className="text-[#71717a] text-xs">({courier.skippedOrders || 0} tot)</span>
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-[#71717a] block text-xs mb-0.5">Rentabilidad</span>
            <div className="font-mono text-xs sm:text-sm">
              <span className="text-[#71717a] text-xs">$</span>
              <span className="text-[#fafafa] font-semibold">{profitPerKm}</span>
              <span className="text-[#71717a] text-xs ml-1">/km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPanel;
