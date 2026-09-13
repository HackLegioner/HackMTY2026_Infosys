'use client';

import React, { useState, useEffect } from 'react';
import { useShiftStream } from '@/hooks/useShiftStream';
import { useShiftControl } from '@/hooks/useShiftControl';
import TopNavbar from '@/components/TopNavbar';
import AgentPanel from '@/components/dashboard/AgentPanel';
import MapView from '@/components/map/MapView';
import EventBanner from '@/components/dashboard/EventBanner';
import ComparisonTable from '@/components/dashboard/ComparisonTable';
import OrderCard from '@/components/dashboard/OrderCard';

export default function Home() {
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState<number>(480);
  const [tickSpeedMs, setTickSpeedMs] = useState<number>(1000);
  const { startShift, stopShift, triggerDisaster, changeSpeed, fastForward, loading, error: controlError } = useShiftControl();
  const { state: shiftState } = useShiftStream(activeShiftId);

  // Sync active shift ID from localStorage if exists
  React.useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('courier_active_shift_id') : null;
    if (saved) {
      setActiveShiftId(saved);
    }
  }, []);

  React.useEffect(() => {
    if (activeShiftId) {
      localStorage.setItem('courier_active_shift_id', activeShiftId);
    } else {
      localStorage.removeItem('courier_active_shift_id');
    }
  }, [activeShiftId]);

  const handleStart = async () => {
    const res = await startShift(durationMin, 42, tickSpeedMs);
    if (res) {
      setActiveShiftId(res.shiftId);
    }
  };

  const handleStop = async () => {
    if (activeShiftId) {
      await stopShift(activeShiftId);
      setActiveShiftId(null);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setTickSpeedMs(newSpeed);
    if (activeShiftId) {
      await changeSpeed(activeShiftId, newSpeed);
    }
  };

  const handleFastForward = async () => {
    if (activeShiftId) {
      await fastForward(activeShiftId);
    }
  };

  const handleTriggerEvent = (presetIndex: number) => {
    if (activeShiftId) {
      triggerDisaster(activeShiftId, presetIndex);
    }
  };

  // Initial courier positions before shift start
  const defaultCourier = (agentId: 'agent_a' | 'agent_b' | 'baseline') => {
    const coords = {
      agent_a: { lat: 25.6692, lng: -100.3099 }, // Centro / Macroplaza
      agent_b: { lat: 25.6574, lng: -100.3684 }, // Centrito Valle
      baseline: { lat: 25.6514, lng: -100.2895 }, // Tec / DistritoTec
    };
    return {
      agentId,
      lat: coords[agentId].lat,
      lng: coords[agentId].lng,
      currentEarnings: 0,
      totalKm: 0,
      completedOrders: 0,
      skippedOrders: 0,
      activeRoute: [],
      carryingOrders: [],
      status: 'idle' as const,
      speedKmh: 25.0,
      corridorName: 'Monterrey Zona Metropolitana',
      penaltiesMXN: 0,
      fuelCostMXN: 0,
      netEarnings: 0,
      incidentsCount: 0,
    };
  };

  const agentA = shiftState?.agents.agent_a || defaultCourier('agent_a');
  const agentB = shiftState?.agents.agent_b || defaultCourier('agent_b');
  const baseline = shiftState?.agents.baseline || defaultCourier('baseline');

  // Fleet Totals for top 4 KPI cards
  const totalFleetEarnings = agentA.currentEarnings + agentB.currentEarnings + baseline.currentEarnings;
  const totalFleetDeliveries = agentA.completedOrders + agentB.completedOrders + baseline.completedOrders;
  const totalFleetKm = agentA.totalKm + agentB.totalKm + baseline.totalKm;
  const profitDensityFleet = totalFleetKm > 0 ? (totalFleetEarnings / totalFleetKm).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans">
      {/* Top Navbar */}
      <TopNavbar showBrand={true} brandTitle="DeliMan" activeTab="home" />

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight flex items-center gap-2.5">
              <span>DeliMan</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">
                v2.1
              </span>
            </h1>
            <p className="text-xs text-[#71717a] mt-1 font-normal">
              Optimización multi-agente en tiempo real — Monterrey Live (OSRM + DQN + OR-Tools)
            </p>
          </div>

          {/* Controls and Status Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pill */}
            <div className="px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272a] text-xs font-mono tracking-wider text-[#fafafa] flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${activeShiftId ? 'bg-emerald-400 animate-pulse' : 'bg-[#fafafa]'}`} />
              <span>
                {activeShiftId && shiftState
                  ? `TICK ${shiftState.tick}/${shiftState.totalMinutes}`
                  : 'SISTEMA LISTO'}
              </span>
            </div>

            {/* Speed and Duration selectors */}
            <div className="flex items-center gap-2">
              {!activeShiftId && (
                <select
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="bg-[#121215] border border-[#27272a] text-xs font-mono text-[#fafafa] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#3f3f46] cursor-pointer"
                >
                  <option value={480}>Turno Completo (8h / 480 Ticks)</option>
                  <option value={240}>Medio Turno (4h / 240 Ticks)</option>
                  <option value={120}>Turno Corto (2h / 120 Ticks)</option>
                  <option value={60}>Hora Pico (1h / 60 Ticks)</option>
                </select>
              )}
              <select
                value={tickSpeedMs}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="bg-[#121215] border border-[#27272a] text-xs font-mono text-[#fafafa] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#3f3f46] cursor-pointer"
              >
                <option value={1000}>1x (1s/tick)</option>
                <option value={500}>2x (0.5s/tick)</option>
                <option value={200}>5x (200ms/tick)</option>
                <option value={100}>10x (100ms/tick)</option>
                <option value={50}>20x (50ms/tick)</option>
                <option value={10}>Ultra (10ms)</option>
                <option value={0}>Flash (0ms)</option>
                <option value={2000}>0.5x (2s/tick)</option>
              </select>
            </div>

            {/* Primary Action Buttons */}
            {!activeShiftId ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="px-4 py-1.5 text-xs bg-[#ffffff] hover:bg-[#e4e4e7] text-[#09090b] rounded-md font-semibold transition cursor-pointer font-mono"
              >
                {loading ? 'Iniciando...' : 'Iniciar Turno'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFastForward}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-xs bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] border border-[#27272a] rounded-md font-mono transition cursor-pointer"
                  title="Ejecuta todos los ticks restantes al instante"
                >
                  Instantáneo
                </button>
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-xs bg-[#18181b] hover:bg-[#27272a] text-[#fafafa] border border-[#27272a] rounded-md font-mono transition cursor-pointer"
                >
                  Detener Turno
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert if any */}
        {controlError && (
          <div className="p-3 bg-[#18181b] border border-[#3f3f46] rounded-md text-xs font-mono text-[#a1a1aa] flex items-center justify-between">
            <span>Aviso: {controlError}</span>
          </div>
        )}

        {/* Top 4 KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Ganancias Totales */}
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Ganancias Totales
              </span>
              <span className="text-[11px] font-mono text-[#71717a]">
                MXN
              </span>
            </div>
            <div className="flex items-baseline font-mono tracking-tight">
              <span className="text-xl text-[#71717a] font-normal mr-0.5">$</span>
              <span className="text-3xl font-bold text-[#fafafa]">
                {totalFleetEarnings.toLocaleString('es-MX')}
              </span>
            </div>
          </div>

          {/* KPI 2: Pedidos Entregados */}
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Pedidos Entregados
              </span>
              <span className="text-[11px] font-mono text-[#71717a]">
                {totalFleetDeliveries > 0 ? `+${(totalFleetDeliveries * 3.2).toFixed(1)}%` : '+0.0%'}
              </span>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#fafafa]">
              {totalFleetDeliveries}
            </div>
          </div>

          {/* KPI 3: Distancia Recorrida */}
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Distancia Recorrida
              </span>
              <span className="text-[11px] font-mono uppercase text-[#71717a]">
                MONTERREY
              </span>
            </div>
            <div className="flex items-baseline font-mono tracking-tight">
              <span className="text-3xl font-bold text-[#fafafa]">
                {totalFleetKm.toFixed(1)}
              </span>
              <span className="text-sm text-[#71717a] ml-1.5">
                km
              </span>
            </div>
          </div>

          {/* KPI 4: Rendimiento por Km (Highlighted border) */}
          <div className="bg-[#121215] border border-[#3f3f46] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Rendimiento por Km
              </span>
              <span className="text-[11px] font-mono uppercase text-[#71717a]">
                FLOTA
              </span>
            </div>
            <div className="flex items-baseline font-mono tracking-tight">
              <span className="text-xl text-[#71717a] font-normal mr-0.5">$</span>
              <span className="text-3xl font-bold text-[#fafafa]">
                {profitDensityFleet}
              </span>
              <span className="text-sm text-[#71717a] ml-0.5">
                /km
              </span>
            </div>
          </div>
        </div>

        {/* Tri-Agent Dashboard Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AgentPanel
            title="Agent A — The Economist"
            subtitle="DQN Reinforcement Learning"
            tag="PROFIT DENSITY"
            borderColor="border-[#27272a]"
            courier={agentA}
          />
          <AgentPanel
            title="Agent B — The Hustler"
            subtitle="OR-Tools CVRPTW + XGBoost"
            tag="BATCHING"
            borderColor="border-[#27272a]"
            courier={agentB}
          />
          <AgentPanel
            title="Traditional App Baseline"
            subtitle="FIFO Unoptimized Standard"
            tag="NAIVE BENCHMARK"
            borderColor="border-[#27272a]"
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
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Despacho de Órdenes en Tiempo Real (Tick {shiftState.tick})
                </h3>
                <p className="text-xs text-[#71717a] mt-0.5">
                  Órdenes entrantes generadas según calibración empírica Kaggle en cocinas de Monterrey.
                </p>
              </div>
              <span className="text-[11px] text-[#71717a] font-mono">
                {shiftState.newOrders.length} solicitudes
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
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
    </div>
  );
}
