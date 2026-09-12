'use client';

import React from 'react';
import { ShiftState } from '@/lib/types';

interface ComparisonTableProps {
  state: ShiftState | null;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ state }) => {
  if (!state) return null;

  const { agent_a, agent_b, baseline } = state.agents;

  const rows = [
    {
      name: 'Agent A — The Economist 🧊',
      model: 'DQN (Profit-Density)',
      earnings: agent_a.currentEarnings,
      km: agent_a.totalKm,
      orders: agent_a.completedOrders,
      rate: agent_a.totalKm > 0 ? agent_a.currentEarnings / agent_a.totalKm : 0,
      delta: agent_a.currentEarnings - baseline.currentEarnings,
    },
    {
      name: 'Agent B — The Hustler ⚡',
      model: 'OR-Tools + XGBoost',
      earnings: agent_b.currentEarnings,
      km: agent_b.totalKm,
      orders: agent_b.completedOrders,
      rate: agent_b.totalKm > 0 ? agent_b.currentEarnings / agent_b.totalKm : 0,
      delta: agent_b.currentEarnings - baseline.currentEarnings,
    },
    {
      name: 'Traditional App Baseline 📱',
      model: 'FIFO Naive',
      earnings: baseline.currentEarnings,
      km: baseline.totalKm,
      orders: baseline.completedOrders,
      rate: baseline.totalKm > 0 ? baseline.currentEarnings / baseline.totalKm : 0,
      delta: 0,
    },
  ];

  return (
    <div className="bg-[#111827]/80 backdrop-blur border border-slate-800 rounded-xl overflow-hidden mt-6 shadow-xl">
      <div className="px-5 py-4 border-b border-slate-800">
        <h4 className="text-base font-bold text-white">Live Benchmark & Profit Delta</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="px-5 py-3">Agent</th>
              <th className="px-5 py-3">Strategy</th>
              <th className="px-5 py-3">Total Earnings</th>
              <th className="px-5 py-3">Distance</th>
              <th className="px-5 py-3">Deliveries</th>
              <th className="px-5 py-3">MXN / KM</th>
              <th className="px-5 py-3">Delta vs Baseline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition">
                <td className="px-5 py-3.5 font-sans font-semibold text-slate-200">{r.name}</td>
                <td className="px-5 py-3.5 text-slate-400">{r.model}</td>
                <td className="px-5 py-3.5 font-bold text-white">${r.earnings}</td>
                <td className="px-5 py-3.5 text-slate-300">{r.km.toFixed(1)} km</td>
                <td className="px-5 py-3.5 text-slate-300">{r.orders}</td>
                <td className="px-5 py-3.5 text-slate-300">${r.rate.toFixed(1)}</td>
                <td className="px-5 py-3.5">
                  {r.delta > 0 ? (
                    <span className="text-emerald-400 font-bold">+${r.delta} MXN</span>
                  ) : r.delta < 0 ? (
                    <span className="text-rose-400 font-bold">-${Math.abs(r.delta)} MXN</span>
                  ) : (
                    <span className="text-slate-500">Benchmark</span>
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
