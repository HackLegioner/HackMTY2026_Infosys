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
      name: 'Agent A — The Economist 🧊',
      model: 'DQN (Zero-Risk & Profit-Density)',
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
      name: 'Agent B — The Hustler ⚡',
      model: 'OR-Tools + XGBoost (Throughput)',
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
      name: 'Traditional App Baseline 📱',
      model: 'FIFO Naive (Sin IA Contextual)',
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
    <div className="bg-[#111827]/80 backdrop-blur border border-slate-800 rounded-xl overflow-hidden mt-6 shadow-xl">
      <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h4 className="text-base font-bold text-white">Live Benchmark & Financial Balance</h4>
          <p className="text-[11px] text-slate-400">
            Costo combustible ($0.70/km - Moto 125/150cc) + Penalizaciones de riesgo vs Ingresos brutos
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="px-4 py-3">Agente</th>
              <th className="px-4 py-3">Estrategia</th>
              <th className="px-4 py-3">Ingresos Brutos</th>
              <th className="px-4 py-3">Incidentes / Cierres</th>
              <th className="px-4 py-3">Costos + Multas</th>
              <th className="px-4 py-3">Ganancia Neta</th>
              <th className="px-4 py-3">Margen Neto/KM</th>
              <th className="px-4 py-3">Delta Neto vs Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3.5 font-sans font-semibold text-slate-200">{r.name}</td>
                <td className="px-4 py-3.5 text-slate-400 text-[11px]">{r.model}</td>
                <td className="px-4 py-3.5 text-slate-300">${r.earnings.toFixed(1)}</td>
                <td className="px-4 py-3.5">
                  {r.trapped ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px] animate-pulse">
                      🚧 Atrapado en Cierre
                    </span>
                  ) : r.incidents > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-[10px]">
                      ⚠️ {r.incidents} Incidente(s)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold text-[11px]">🛡️ 0 (Seguro)</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-rose-400">-${r.costs.toFixed(1)}</td>
                <td className="px-4 py-3.5 font-bold text-white">
                  <span className={r.netEarnings >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    ${r.netEarnings.toFixed(1)} MXN
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-300">${r.netRate.toFixed(1)}/km</td>
                <td className="px-4 py-3.5">
                  {i === 2 ? (
                    <span className="text-slate-500">Benchmark Base</span>
                  ) : r.deltaNet > 0 ? (
                    <span className="text-emerald-400 font-bold">
                      +${r.deltaNet.toFixed(1)} MXN
                    </span>
                  ) : r.deltaNet < 0 ? (
                    <span className="text-rose-400 font-bold">
                      -${Math.abs(r.deltaNet).toFixed(1)} MXN
                    </span>
                  ) : (
                    <span className="text-slate-400">$0.0</span>
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
