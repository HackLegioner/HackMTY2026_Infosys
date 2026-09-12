'use client';

import React, { useState } from 'react';
import { useShiftStream } from '@/hooks/useShiftStream';
import { useShiftControl } from '@/hooks/useShiftControl';
import AgentPanel from '@/components/dashboard/AgentPanel';
import MapView from '@/components/map/MapView';
import EventBanner from '@/components/dashboard/EventBanner';
import ComparisonTable from '@/components/dashboard/ComparisonTable';
import OrderCard from '@/components/dashboard/OrderCard';
import Link from 'next/link';

export default function Home() {
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const { startShift, stopShift, triggerDisaster, loading } = useShiftControl();
  const { state: shiftState } = useShiftStream(activeShiftId);

  const handleStart = async () => {
    const res = await startShift(60, 42);
    if (res) {
      setActiveShiftId(res.shiftId);
    }
  };

  const handleStop = async () => {
    if (activeShiftId) {
      await stopShift(activeShiftId);
    }
  };

  const handleTriggerEvent = (presetIndex: number) => {
    if (activeShiftId) {
      triggerDisaster(activeShiftId, presetIndex);
    }
  };

  // Mock courier values before shift start
  const defaultCourier = (agentId: 'agent_a' | 'agent_b' | 'baseline') => ({
    agentId,
    lat: 25.6692,
    lng: -100.3099,
    currentEarnings: 0,
    totalKm: 0,
    completedOrders: 0,
    skippedOrders: 0,
    activeRoute: [],
    carryingOrders: [],
    status: 'idle' as const,
    speedKmh: 25.0,
    corridorName: 'Monterrey Zona Metropolitana',
  });

  const agentA = shiftState?.agents.agent_a || defaultCourier('agent_a');
  const agentB = shiftState?.agents.agent_b || defaultCourier('agent_b');
  const baseline = shiftState?.agents.baseline || defaultCourier('baseline');

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            🚀 The Courier <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-mono">v2</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-Time Multi-Agent Courier Optimization — Monterrey Live Simulation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Open-Meteo & Rush-Hour Badges */}
          {shiftState?.weather && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-[11px] font-mono text-slate-300">
              <span>{shiftState.weather.description}</span>
            </div>
          )}
          {shiftState?.traffic && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-[11px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${shiftState.traffic.isRushHour ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-slate-400">{shiftState.traffic.formattedTime}</span>
              <span className="text-slate-300 font-semibold">{shiftState.traffic.averageSpeedKmh} km/h</span>
            </div>
          )}
          {shiftState && activeShiftId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">
                Tick {shiftState.tick}/{shiftState.totalMinutes}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-semibold">{shiftState.elapsedMinutes}m</span>
            </div>
          )}

          <Link
            href="/driver"
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition border border-zinc-700 flex items-center gap-1.5"
          >
            <span>🛵</span> Panel Repartidores
          </Link>
          <Link
            href={activeShiftId ? `/audit?shiftId=${activeShiftId}` : '/audit'}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition border border-slate-700"
          >
            🔍 Audit Panel
          </Link>
          {!activeShiftId ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-lg shadow-emerald-950 transition cursor-pointer"
            >
              {loading ? 'Starting...' : '▶ Start Shift (60 Ticks)'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-bold shadow-lg shadow-rose-950 transition cursor-pointer"
            >
              ⏹ Stop Shift
            </button>
          )}
        </div>
      </header>

      {/* Tri-Agent Dashboard Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AgentPanel
          title="Agent A — The Economist 🧊"
          subtitle="DQN Reinforcement Learning"
          tag="Profit Density"
          borderColor="border-blue-500/40"
          courier={agentA}
        />
        <AgentPanel
          title="Agent B — The Hustler ⚡"
          subtitle="OR-Tools CVRPTW + XGBoost"
          tag="Batching Optimization"
          borderColor="border-emerald-500/40"
          courier={agentB}
        />
        <AgentPanel
          title="Traditional App Baseline 📱"
          subtitle="FIFO Unoptimized Standard"
          tag="Naive Benchmark"
          borderColor="border-slate-700"
          courier={baseline}
        />
      </div>

      {/* Disaster & Surge Scenario Controls */}
      <EventBanner
        events={shiftState?.activeEvents || []}
        onTriggerEvent={activeShiftId ? handleTriggerEvent : undefined}
      />

      {/* Monterrey Live Map View */}
      <MapView shiftState={shiftState} />

      {/* Live Order Feed */}
      {shiftState && shiftState.newOrders && shiftState.newOrders.length > 0 && (
        <div className="bg-[#111827]/80 backdrop-blur border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Live Order Dispatch Feed (Tick {shiftState.tick}) — Kaggle Calibrated Kitchens
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {shiftState.newOrders.length} incoming requests
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {shiftState.newOrders.slice(0, 3).map((ord) => {
              const ordId = ord.id || ord.order_id;
              const isAcceptedA = shiftState.decisions?.agent_a?.accepted?.includes(ordId);
              const isAcceptedB = shiftState.decisions?.agent_b?.accepted?.includes(ordId);
              const isAcceptedBase = shiftState.decisions?.baseline?.accepted?.includes(ordId);
              const decision = isAcceptedA || isAcceptedB || isAcceptedBase ? 'accept' : 'skip';
              return (
                <OrderCard key={ordId} order={ord} decision={decision} />
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Metrics */}
      <ComparisonTable state={shiftState} />
    </main>
  );
}
