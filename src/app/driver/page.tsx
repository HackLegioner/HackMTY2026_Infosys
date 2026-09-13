'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNavbar from '@/components/TopNavbar';
import RouteNetworkMap from '@/components/dashboard/RouteNetworkMap';
import VehicleDonutChart from '@/components/dashboard/VehicleDonutChart';
import { useShiftControl } from '@/hooks/useShiftControl';
import { useShiftStream } from '@/hooks/useShiftStream';

export default function DriverDashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, 'en_ruta' | 'disponible'>>({});
  const { startShift, stopShift, loading } = useShiftControl();
  const { state: shiftState } = useShiftStream(activeShiftId);

  // Sync active shift ID from localStorage if exists
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('courier_active_shift_id') : null;
    if (saved) {
      setActiveShiftId(saved);
    }
  }, []);

  useEffect(() => {
    if (activeShiftId) {
      localStorage.setItem('courier_active_shift_id', activeShiftId);
    } else {
      localStorage.removeItem('courier_active_shift_id');
    }
  }, [activeShiftId]);


  // Estado de simulación activa (corriendo ticks > 0 y dentro del límite total)
  const isSimulationRunning = Boolean(
    activeShiftId &&
    shiftState &&
    shiftState.tick > 0 &&
    shiftState.totalMinutes > 0 &&
    shiftState.tick < shiftState.totalMinutes
  );

  // Al finalizar la simulación por llegar al límite de ticks, limpiar overrides
  useEffect(() => {
    if (shiftState && shiftState.totalMinutes > 0 && shiftState.tick >= shiftState.totalMinutes) {
      setManualOverrides({});
    }
  }, [shiftState?.tick, shiftState?.totalMinutes]);

  // Toggle live simulation
  const handleToggleSimulation = async () => {
    setManualOverrides({});
    if (!isSimulationRunning) {
      const res = await startShift(480, 42, 1000);
      if (res) setActiveShiftId(res.shiftId);
    } else if (activeShiftId) {
      await stopShift(activeShiftId);
      setActiveShiftId(null);
    }
  };

  // Courier agent values (defaults start at 0)
  const agentA = shiftState?.agents.agent_a || {
    currentEarnings: 0,
    netEarnings: 0,
    totalKm: 0,
    completedOrders: 0,
    skippedOrders: 0,
    status: 'idle' as const,
    activeRoute: [],
  };

  const agentB = shiftState?.agents.agent_b || {
    currentEarnings: 0,
    netEarnings: 0,
    totalKm: 0,
    completedOrders: 0,
    skippedOrders: 0,
    status: 'idle' as const,
    activeRoute: [],
  };

  const baseline = shiftState?.agents.baseline || {
    currentEarnings: 0,
    netEarnings: 0,
    totalKm: 0,
    completedOrders: 0,
    skippedOrders: 0,
    status: 'idle' as const,
    activeRoute: [],
  };

  // Determinar estado de cada repartidor:
  // 1. En un principio: Todos en "Disponible"
  // 2. Durante la simulación:
  //    - Si el repartidor está aceptando órdenes (status === 'delivering') -> se cambia a "En Ruta"
  //    - A MENOS QUE: el repartidor no esté aceptando órdenes (status === 'idle') -> se queda en "Disponible"
  //    - Y cuando vuelva a aceptar órdenes -> regresa a "En Ruta"
  // 3. Cuando termine la simulación (!isSimulationRunning): Todos regresan a "Disponible"
  const resolveCourierStatus = (
    courierId: string,
    courier: {
      status?: 'idle' | 'moving_to_pickup' | 'waiting_at_pickup' | 'delivering' | 'rerouting' | 'trapped_in_closure';
      activeRoute?: any[];
      netEarnings?: number;
      fuelCostMXN?: number;
      penaltiesMXN?: number;
    }
  ) => {
    // Si el usuario aplicó un override manual para prueba o demo
    if (manualOverrides[courierId]) {
      const overrideType = manualOverrides[courierId];
      return {
        status: overrideType === 'en_ruta' ? 'En Ruta' : 'Disponible',
        statusType: overrideType,
      };
    }

    // Al inicio O cuando termine la simulación: Todos regresan a "Disponible"
    if (!isSimulationRunning) {
      return { status: 'Disponible', statusType: 'disponible' as const };
    }

    // Durante la simulación en curso:
    // Si está en misión activa (pickup, waiting o delivering) -> "En Ruta"
    if (courier.status && courier.status !== 'idle') {
      return { status: 'En Ruta', statusType: 'en_ruta' as const };
    }

    // Si no tiene órdenes activas (idle) -> "Disponible"
    return { status: 'Disponible', statusType: 'disponible' as const };
  };

  const handleToggleManualStatus = (driverId: string, currentStatusType: 'en_ruta' | 'disponible') => {
    const nextType = currentStatusType === 'en_ruta' ? 'disponible' : 'en_ruta';
    setManualOverrides((prev) => ({
      ...prev,
      [driverId]: nextType,
    }));
  };

  const statusA = resolveCourierStatus('REP-4091', agentA);
  const statusB = resolveCourierStatus('REP-2104', agentB);
  const statusBase = resolveCourierStatus('REP-3301', baseline);

  // Drivers Table Data (Entregas inician en 0 para todos)
  const driversList = [
    {
      id: 'REP-4091',
      name: 'Agent A — The Economist',
      zone: 'San Pedro / Centrito & Calzada del Valle',
      vehicle: 'Moto',
      deliveriesToday: agentA.completedOrders ?? 0,
      status: statusA.status,
      statusType: statusA.statusType,
      currentCorridor: (agentA as any).corridorName || 'Calzada del Valle',
      netEarnings: (agentA as any).netEarnings ?? agentA.currentEarnings,
    },
    {
      id: 'REP-2104',
      name: 'Agent B — The Hustler',
      zone: 'Monterrey Sur / Garza Sada & Nuevo Sur',
      vehicle: 'Moto',
      deliveriesToday: agentB.completedOrders ?? 0,
      status: statusB.status,
      statusType: statusB.statusType,
      currentCorridor: (agentB as any).corridorName || 'Av. Eugenio Garza Sada',
      netEarnings: (agentB as any).netEarnings ?? agentB.currentEarnings,
    },
    {
      id: 'REP-3301',
      name: 'Traditional App Baseline',
      zone: 'Monterrey Centro / Macroplaza & Morelos',
      vehicle: 'Moto',
      deliveriesToday: baseline.completedOrders ?? 0,
      status: statusBase.status,
      statusType: statusBase.statusType,
      currentCorridor: (baseline as any).corridorName || 'Av. Constitución',
      netEarnings: (baseline as any).netEarnings ?? baseline.currentEarnings,
    },
  ];

  // Total funcional de pedidos entregados en el día (empieza en 0)
  const totalDeliveredToday = driversList.reduce((sum, d) => sum + d.deliveriesToday, 0);
  const deliveryGrowth = totalDeliveredToday === 0
    ? '+0.0%'
    : `+${(totalDeliveredToday * 4.5).toFixed(1)}%`;

  const filteredDrivers = driversList.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Recent Orders Data (Dynamic when shift is running or authentic Monterrey fallbacks)
  const recentOrders =
    shiftState?.newOrders && shiftState.newOrders.length > 0
      ? shiftState.newOrders.slice(0, 4).map((ord, idx) => ({
          id: (ord.id || ord.order_id || `ORD-${idx}`).toUpperCase().slice(0, 8),
          destination: ord.dropoff.name
            ? `${ord.dropoff.name}, ${ord.dropoff.zone || 'Monterrey'}`
            : `${ord.dropoff.zone || 'Monterrey Residencial'}`,
          restaurant: ord.restaurant_name || ord.pickup.name || 'Restaurante Monterrey',
          assignedTime: `Tick ${shiftState.tick || 1}`,
          courier: idx % 2 === 0 ? 'Agent A (Economist)' : 'Agent B (Hustler)',
          amount: `$${(ord.payout || ord.total_pay || 35).toFixed(2)}`,
        }))
      : [
          {
            id: 'ORD-2391',
            destination: 'Colonia Del Valle, San Pedro Garza García',
            restaurant: 'Sonora Grill Prime (Centrito Valle)',
            assignedTime: '14:32',
            courier: 'Agent A (Economist)',
            amount: '$48.50',
          },
          {
            id: 'ORD-9910',
            destination: 'DistritoTec / Roma, Monterrey Sur',
            restaurant: 'Taquería Juárez (Garza Sada)',
            assignedTime: '14:35',
            courier: 'Agent B (Hustler)',
            amount: '$36.00',
          },
          {
            id: 'ORD-4491',
            destination: 'Fuentes del Valle, San Pedro',
            restaurant: 'Cara de Vaca (Calzada del Valle)',
            assignedTime: '14:41',
            courier: 'Agent A (Economist)',
            amount: '$54.20',
          },
          {
            id: 'ORD-1049',
            destination: 'Calle Morelos #550, Barrio Antiguo Centro',
            restaurant: 'Almacén 42 (Morelos)',
            assignedTime: '14:48',
            courier: 'Traditional Baseline',
            amount: '$28.90',
          },
        ];

  const handleExportReport = () => {
    const reportData = {
      title: 'The Courier — Monterrey Multi-Agent Shift Report',
      exportedAt: new Date().toISOString(),
      shiftId: activeShiftId || 'offline_preview',
      currentTick: shiftState?.tick || 0,
      totalTicks: shiftState?.totalMinutes || 480,
      weather: shiftState?.weather || { description: 'Clear / Standard Monterrey 28.5°C' },
      traffic: shiftState?.traffic || { formattedTime: '12:00 PM', averageSpeedKmh: 25 },
      agents: {
        agent_a: {
          name: 'The Economist (DQN RL)',
          earningsMxn: agentA.currentEarnings,
          netEarningsMxn: agentA.netEarnings ?? agentA.currentEarnings,
          totalKm: agentA.totalKm,
          completedOrders: agentA.completedOrders,
          skippedOrders: agentA.skippedOrders,
        },
        agent_b: {
          name: 'The Hustler (OR-Tools + XGBoost)',
          earningsMxn: agentB.currentEarnings,
          netEarningsMxn: agentB.netEarnings ?? agentB.currentEarnings,
          totalKm: agentB.totalKm,
          completedOrders: agentB.completedOrders,
          skippedOrders: agentB.skippedOrders,
        },
        baseline: {
          name: 'Traditional App Baseline (FIFO Naive)',
          earningsMxn: baseline.currentEarnings,
          netEarningsMxn: baseline.netEarnings ?? baseline.currentEarnings,
          totalKm: baseline.totalKm,
          completedOrders: baseline.completedOrders,
          skippedOrders: baseline.skippedOrders,
        },
      },
      drivers: driversList,
      database: 'MongoDB Atlas Cloud Verified (courier-cluster)',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courier_shift_report_${activeShiftId || 'latest'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans">
      {/* Top Navbar */}
      <TopNavbar showBrand={true} brandTitle="The Courier" activeTab="driver" />

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight">
              Control de Repartidores
            </h1>
            <p className="text-xs text-[#71717a] mt-1">
              Monitoreo operativo y despacho de flota en tiempo real.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272a] text-xs font-mono tracking-wider text-[#fafafa] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SISTEMA ACTIVO</span>
            </div>

            {/* Quick Simulation Trigger button */}
            <button
              onClick={handleToggleSimulation}
              disabled={loading}
              className="text-xs px-3.5 py-1.5 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#09090b] rounded-md font-semibold transition cursor-pointer disabled:opacity-40"
            >
              {loading
                ? 'Cargando...'
                : isSimulationRunning
                ? `Detener Turno (Tick ${shiftState?.tick || 0})`
                : 'Simular Flota'}
            </button>
          </div>
        </div>

        {/* Top 4 KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Entregas Hoy */}
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Entregas Hoy
              </span>
              <span className="text-[11px] font-mono text-[#71717a]">
                {deliveryGrowth}
              </span>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#fafafa]">
              {totalDeliveredToday}
            </div>
          </div>

          {/* KPI 2: Repartidores Activos */}
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Repartidores Activos
              </span>
              <span className="text-[11px] font-mono text-[#71717a]">
                96%
              </span>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#fafafa]">
              48 <span className="text-lg text-[#71717a] font-normal">/ 50</span>
            </div>
          </div>

          {/* KPI 3: Tiempo Promedio */}
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Tiempo Promedio de Entrega
              </span>
              <span className="text-[11px] font-mono text-[#71717a]">
                -1.8 min
              </span>
            </div>
            <div className="flex items-baseline font-mono tracking-tight">
              <span className="text-3xl font-bold text-[#fafafa]">22</span>
              <span className="text-sm text-[#71717a] ml-1.5">min</span>
            </div>
          </div>

          {/* KPI 4: Incidencias Críticas (Highlighted border) */}
          <div className="bg-[#121215] border border-[#3f3f46] rounded-md p-5 flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#a1a1aa] font-medium">
                Incidencias Críticas
              </span>
              <span className="text-[11px] font-mono uppercase text-[#71717a]">
                ATENDIDAS
              </span>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight text-[#fafafa]">
              03
            </div>
          </div>
        </div>

        {/* 3-Column Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Agent Cards (3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Agent A Card */}
            <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#fafafa]">
                    Agent A — The Economist
                  </h3>
                  <span className="text-xs font-mono text-[#71717a]">DQN Reinforcement</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a] uppercase px-1.5 py-0.5 rounded-[4px] border border-[#27272a]">MXN</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#fafafa] flex items-baseline">
                <span className="text-base text-[#71717a] font-normal mr-0.5">$</span>
                {agentA.currentEarnings}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-2.5 border-t border-[#27272a] text-[#71717a]">
                <div>
                  Distancia:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {agentA.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Entregas:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {agentA.completedOrders}
                  </span>
                </div>
                <div>
                  Omitidas:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {agentA.skippedOrders}
                  </span>
                </div>
                <div>
                  Rentabilidad:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    ${agentA.totalKm > 0 ? (agentA.currentEarnings / agentA.totalKm).toFixed(0) : 0}/km
                  </span>
                </div>
              </div>
            </div>

            {/* Agent B Card */}
            <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#fafafa]">
                    Agent B — The Hustler
                  </h3>
                  <span className="text-xs font-mono text-[#71717a]">OR-Tools + XGBoost</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a] uppercase px-1.5 py-0.5 rounded-[4px] border border-[#27272a]">MXN</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#fafafa] flex items-baseline">
                <span className="text-base text-[#71717a] font-normal mr-0.5">$</span>
                {agentB.currentEarnings}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-2.5 border-t border-[#27272a] text-[#71717a]">
                <div>
                  Distancia:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {agentB.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Entregas:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {agentB.completedOrders}
                  </span>
                </div>
                <div>
                  Omitidas:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {agentB.skippedOrders}
                  </span>
                </div>
                <div>
                  Rentabilidad:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    ${agentB.totalKm > 0 ? (agentB.currentEarnings / agentB.totalKm).toFixed(0) : 0}/km
                  </span>
                </div>
              </div>
            </div>

            {/* Baseline Card */}
            <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#fafafa]">
                    Traditional App Baseline
                  </h3>
                  <span className="text-xs font-mono text-[#71717a]">FIFO Naive</span>
                </div>
                <span className="text-[10px] font-mono text-[#71717a] uppercase px-1.5 py-0.5 rounded-[4px] border border-[#27272a]">MXN</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#fafafa] flex items-baseline">
                <span className="text-base text-[#71717a] font-normal mr-0.5">$</span>
                {baseline.currentEarnings}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-2.5 border-t border-[#27272a] text-[#71717a]">
                <div>
                  Distancia:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {baseline.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Entregas:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {baseline.completedOrders}
                  </span>
                </div>
                <div>
                  Omitidas:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    {baseline.skippedOrders}
                  </span>
                </div>
                <div>
                  Rentabilidad:{' '}
                  <span className="font-mono text-[#fafafa] font-semibold">
                    ${baseline.totalKm > 0 ? (baseline.currentEarnings / baseline.totalKm).toFixed(0) : 0}/km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Tables (6 cols on desktop) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Table 1: Repartidores Activos */}
            <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#fafafa]">
                    Repartidores Activos
                  </h3>
                  <p className="text-xs text-[#71717a]">
                    Flota de reparto en operaciones durante el turno actual.
                  </p>
                </div>

                {/* Filter input */}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#71717a]">
                    <svg className="w-3.5 h-3.5 text-[#71717a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar repartidores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-md bg-[#18181b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#3f3f46] font-mono w-48"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27272a] text-[10px] uppercase font-mono text-[#71717a] tracking-wider">
                      <th className="pb-2.5 font-semibold">REPARTIDOR</th>
                      <th className="pb-2.5 font-semibold">ZONA ASIGNADA</th>
                      <th className="pb-2.5 font-semibold">VEHÍCULO</th>
                      <th className="pb-2.5 font-semibold">ENTREGAS (HOY)</th>
                      <th className="pb-2.5 font-semibold text-right">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]">
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-[#18181b]/50 transition">
                        <td className="py-3">
                          <div className="font-medium text-[#fafafa] text-xs">
                            {driver.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#71717a]">
                            {driver.id}
                          </div>
                        </td>
                        <td className="py-3 text-xs text-[#a1a1aa]">
                          {driver.zone}
                        </td>
                        <td className="py-3 text-xs text-[#71717a] flex items-center gap-1 font-mono">
                          <span className="text-[11px]">⊗</span> {driver.vehicle}
                        </td>
                        <td className="py-3 font-mono font-medium text-[#fafafa]">
                          {driver.deliveriesToday}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleManualStatus(driver.id, driver.statusType)}
                            title="Alternar estado (Disponible / En Ruta)"
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                              driver.statusType === 'en_ruta'
                                ? 'bg-[#ffffff] text-[#09090b] font-semibold'
                                : 'bg-[#18181b] border border-[#27272a] text-[#71717a] font-mono hover:border-[#3f3f46]'
                            }`}
                          >
                            {driver.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Lugares mas concurridos */}
            <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#fafafa]">
                  Lugares más concurridos
                </h3>
                <p className="text-xs text-[#71717a]">
                  Últimas órdenes en curso asignadas o en espera.
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27272a] text-[10px] uppercase font-mono text-[#71717a] tracking-wider">
                      <th className="pb-2.5 font-semibold">ID PEDIDO</th>
                      <th className="pb-2.5 font-semibold">DIRECCIÓN DESTINO</th>
                      <th className="pb-2.5 font-semibold">H. ASIGNACIÓN</th>
                      <th className="pb-2.5 font-semibold">REPARTIDOR</th>
                      <th className="pb-2.5 font-semibold text-right">VALOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a] font-mono text-xs">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#18181b]/50 transition">
                        <td className="py-3 font-bold text-[#fafafa]">
                          {order.id}
                        </td>
                        <td className="py-3 font-sans text-xs text-[#71717a]">
                          {order.destination}
                        </td>
                        <td className="py-3 text-xs text-[#71717a]">
                          {order.assignedTime}
                        </td>
                        <td className="py-3 font-sans text-xs font-medium text-[#fafafa]">
                          {order.courier}
                        </td>
                        <td className="py-3 text-right font-semibold text-[#fafafa]">
                          {order.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Operative Actions, Map, Vehicles (3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Card 1: Acciones Operativas */}
            <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#fafafa]">
                Acciones Operativas
              </h3>
              
              <div className="space-y-2 pt-1">
                <Link
                  href="/"
                  className="w-full bg-[#ffffff] hover:bg-[#e4e4e7] text-[#09090b] text-xs font-semibold py-2 rounded-md transition text-center block"
                >
                  Ver Simulación y Mapa OSRM
                </Link>

                <button
                  type="button"
                  onClick={() => alert('Alerta enviada a la flota: Tráfico pesado detectado en Gonzalitos y Morones Prieto.')}
                  className="w-full bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa] text-xs font-medium py-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>ⓘ</span> Alertar a la Flota
                </button>

                <button
                  type="button"
                  onClick={handleExportReport}
                  className="w-full bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa] text-xs font-medium py-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⤓</span> Exportar Reporte de Turno (JSON)
                </button>

                <Link
                  href="/audit"
                  className="w-full bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] text-xs font-medium py-2 rounded-md transition text-center block"
                >
                  Panel de Auditoría y Compliance
                </Link>
              </div>
            </div>

            {/* Card 2: Rutas de Reparto (Zona Centro) Minimalist Map */}
            <RouteNetworkMap />

            {/* Card 3: División de Vehículos Donut Chart */}
            <VehicleDonutChart />
          </div>
        </div>
      </main>
    </div>
  );
}
