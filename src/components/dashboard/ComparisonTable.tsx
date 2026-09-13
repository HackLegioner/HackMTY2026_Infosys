'use client';

import React from 'react';
import { ShiftState } from '@/lib/types';

interface ComparisonTableProps {
  state: ShiftState | null;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ state }) => {
  if (!state) return null;

  const { agent_a, agent_b, baseline } = state.agents;

  const calculateCosts = (c: typeof agent_a) => {
    const fuel = c.fuelCostMXN ?? Math.round(c.totalKm * 0.70 * 10) / 10;
    const pen = c.penaltiesMXN ?? 0;
    return Math.round((fuel + pen) * 10) / 10;
  };

  const calculateNet = (c: typeof agent_a) => {
    if (c.netEarnings !== undefined) return c.netEarnings;
    const costs = calculateCosts(c);
    return Math.round((c.currentEarnings - costs) * 10) / 10;
  };

  const baseNet = calculateNet(baseline);

  const rows = [
    {
      name: 'Agent A — The Economist',
      model: 'DQN (Profit-Density)',
      earnings: agent_a.currentEarnings,
      km: agent_a.totalKm,
      orders: agent_a.completedOrders,
      incidents: agent_a.incidentsCount || 0,
      trapped: agent_a.status === 'trapped_in_closure',
      costs: calculateCosts(agent_a),
      netEarnings: calculateNet(agent_a),
      netRate: agent_a.totalKm > 0 ? calculateNet(agent_a) / agent_a.totalKm : 0,
      deltaNet: Math.round((calculateNet(agent_a) - baseNet) * 10) / 10,
    },
    {
      name: 'Agent B — The Hustler',
      model: 'OR-Tools + XGBoost',
      earnings: agent_b.currentEarnings,
      km: agent_b.totalKm,
      orders: agent_b.completedOrders,
      incidents: agent_b.incidentsCount || 0,
      trapped: agent_b.status === 'trapped_in_closure',
      costs: calculateCosts(agent_b),
      netEarnings: calculateNet(agent_b),
      netRate: agent_b.totalKm > 0 ? calculateNet(agent_b) / agent_b.totalKm : 0,
      deltaNet: Math.round((calculateNet(agent_b) - baseNet) * 10) / 10,
    },
    {
      name: 'Traditional App Baseline',
      model: 'FIFO Naive',
      earnings: baseline.currentEarnings,
      km: baseline.totalKm,
      orders: baseline.completedOrders,
      incidents: baseline.incidentsCount || 0,
      trapped: baseline.status === 'trapped_in_closure',
      costs: calculateCosts(baseline),
      netEarnings: calculateNet(baseline),
      netRate: baseline.totalKm > 0 ? calculateNet(baseline) / baseline.totalKm : 0,
      deltaNet: 0,
    },
  ];

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-md overflow-hidden">
      <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-[#fafafa]">
            Benchmark en Vivo & Delta de Ganancias
          </h4>
          <p className="text-xs text-[#71717a] mt-0.5">
            Costo combustible ($0.70/km) + Penalizaciones de riesgo vs Margen neto algorítmico.
          </p>
        </div>
        <span className="text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-[4px] bg-[#18181b] text-[#71717a] border border-[#27272a]">
          TICK {state.tick} / {state.totalMinutes}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18181b] text-[#71717a] uppercase font-mono text-[10px] tracking-wider border-b border-[#27272a]">
            <tr>
              <th className="px-5 py-3 font-semibold">Agente</th>
              <th className="px-5 py-3 font-semibold">Estrategia</th>
              <th className="px-5 py-3 font-semibold">Ingreso Bruto</th>
              <th className="px-5 py-3 font-semibold">Incidentes / Cierres</th>
              <th className="px-5 py-3 font-semibold">Costos + Multas</th>
              <th className="px-5 py-3 font-semibold">Ganancia Neta</th>
              <th className="px-5 py-3 font-semibold">Margen / KM</th>
              <th className="px-5 py-3 font-semibold">Delta vs Baseline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a] font-mono text-xs">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-[#18181b]/50 transition">
                <td className="px-5 py-3.5 font-sans font-medium text-[#fafafa]">{r.name}</td>
                <td className="px-5 py-3.5 text-[#71717a]">{r.model}</td>
                <td className="px-5 py-3.5 font-semibold text-[#fafafa]">${r.earnings}</td>
                <td className="px-5 py-3.5">
                  {r.trapped ? (
                    <span className="px-2 py-0.5 rounded-[4px] bg-rose-950/40 text-rose-300 border border-rose-800/50 font-mono text-[10px] flex items-center gap-1 w-fit animate-pulse">
                      <span>🚧</span> Atrapado en Cierre
                    </span>
                  ) : r.incidents > 0 ? (
                    <span className="px-2 py-0.5 rounded-[4px] bg-purple-950/40 text-purple-300 border border-purple-800/50 font-mono text-[10px] flex items-center gap-1 w-fit">
                      <span>⚠️</span> {r.incidents} Incidente(s)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#18181b] text-emerald-400 border border-emerald-900/40 font-mono text-[10px]">
                      0 (Seguro)
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-rose-400">-${r.costs.toFixed(1)}</td>
                <td className="px-5 py-3.5 font-bold text-[#fafafa]">
                  <span className={r.netEarnings >= 0 ? 'text-[#fafafa]' : 'text-rose-400'}>
                    ${r.netEarnings.toFixed(1)} MXN
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#a1a1aa]">${r.netRate.toFixed(1)}/km</td>
                <td className="px-5 py-3.5">
                  {i === 2 ? (
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#18181b] text-[#71717a] border border-[#27272a] font-mono text-xs">
                      Benchmark Base
                    </span>
                  ) : r.deltaNet > 0 ? (
                    <span className="px-2 py-0.5 rounded-[4px] bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-mono text-xs font-semibold">
                      +${r.deltaNet.toFixed(1)} MXN
                    </span>
                  ) : r.deltaNet < 0 ? (
                    <span className="px-2 py-0.5 rounded-[4px] bg-rose-950/40 text-rose-300 border border-rose-800/50 font-mono text-xs font-semibold">
                      -${Math.abs(r.deltaNet).toFixed(1)} MXN
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#18181b] text-[#71717a] border border-[#27272a] font-mono text-xs">
                      $0.0
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;
