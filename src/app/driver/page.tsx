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

  const currentTick = shiftState ? (shiftState.tick ?? (shiftState as any).currentTick ?? 0) : 0;
  const totalTicks = shiftState ? (shiftState.totalMinutes ?? (shiftState as any).totalTicks ?? 480) : 480;

  // Estado de simulación activa (corriendo ticks > 0 y dentro del límite total)
  const isSimulationRunning = Boolean(
    activeShiftId &&
    shiftState &&
    currentTick > 0 &&
    currentTick < totalTicks
  );

  // Al finalizar la simulación por llegar al límite de ticks, limpiar overrides
  useEffect(() => {
    if (shiftState && shiftState.totalTicks > 0 && shiftState.currentTick >= shiftState.totalTicks) {
      setManualOverrides({});
    }
  }, [shiftState?.currentTick, shiftState?.totalTicks]);

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
    totalKm: 0,
    completedOrders: 0,
    skippedOrders: 0,
    status: 'idle' as const,
    activeRoute: [],
  };

  const agentB = shiftState?.agents.agent_b || {
    currentEarnings: 0,
    totalKm: 0,
    completedOrders: 0,
    skippedOrders: 0,
    status: 'idle' as const,
    activeRoute: [],
  };

  const baseline = shiftState?.agents.baseline || {
    currentEarnings: 0,
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
    courier: { status?: 'idle' | 'delivering' | 'rerouting'; activeRoute?: any[] }
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
    // Si está aceptando órdenes y entregando -> "En Ruta"
    if (courier.status === 'delivering') {
      return { status: 'En Ruta', statusType: 'en_ruta' as const };
    }

    // Si no está aceptando órdenes (idle) -> "Disponible"
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
      zone: 'Norte Centro',
      vehicle: 'Moto',
      deliveriesToday: agentA.completedOrders ?? 0,
      status: statusA.status,
      statusType: statusA.statusType,
    },
    {
      id: 'REP-2104',
      name: 'Agent B — The Hustler',
      zone: 'San Isidro',
      vehicle: 'Moto',
      deliveriesToday: agentB.completedOrders ?? 0,
      status: statusB.status,
      statusType: statusB.statusType,
    },
    {
      id: 'REP-3301',
      name: 'Traditional App Baseline',
      zone: 'Surco',
      vehicle: 'Moto',
      deliveriesToday: baseline.completedOrders ?? 0,
      status: statusBase.status,
      statusType: statusBase.statusType,
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

  // Recent Orders Data
  const recentOrders = [
    {
      id: 'ORD-2391',
      destination: 'Av. Javier Prado Este 2401',
      assignedTime: '14:32',
      courier: 'Carlos Mendoza',
      amount: '$24.50',
    },
    {
      id: 'ORD-9910',
      destination: 'Calle Las Camelias 432, San Isidro',
      assignedTime: '14:35',
      courier: 'Sofía Altamirano',
      amount: '$18.00',
    },
    {
      id: 'ORD-4491',
      destination: 'Av. Benavides 1840, Miraflores',
      assignedTime: '14:41',
      courier: 'Mateo Ruiz',
      amount: '$45.20',
    },
    {
      id: 'ORD-1049',
      destination: 'Jr. Centenario 105, Barranco',
      assignedTime: '14:48',
      courier: 'Sin Asignar',
      amount: '$12.90',
    },
  ];

  const handleExportReport = () => {
    const reportData = {
      title: 'The Courier — Monterrey Multi-Agent Shift Report',
      exportedAt: new Date().toISOString(),
      shiftId: activeShiftId || 'offline_preview',
      currentTick,
      totalTicks,
      weather: shiftState?.weather || { description: 'Clear / Standard Monterrey 28.5°C' },
      traffic: shiftState?.traffic || { formattedTime: '12:00 PM', averageSpeedKmh: 25 },
      agents: {
        agent_a: {
          name: 'The Economist 🧊 (DQN RL)',
          earningsMxn: agentA.currentEarnings,
          totalKm: agentA.totalKm,
          completedOrders: agentA.completedOrders,
          skippedOrders: agentA.skippedOrders,
        },
        agent_b: {
          name: 'The Hustler ⚡ (OR-Tools + XGBoost)',
          earningsMxn: agentB.currentEarnings,
          totalKm: agentB.totalKm,
          completedOrders: agentB.completedOrders,
          skippedOrders: agentB.skippedOrders,
        },
        baseline: {
          name: 'Traditional App Baseline 📱 (FIFO Naive)',
          earningsMxn: baseline.currentEarnings,
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
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#09090B] text-[#09090B] dark:text-zinc-100 font-sans transition-colors">
      {/* Top Navbar */}
      <TopNavbar showBrand={true} />

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#09090B] dark:text-zinc-100 tracking-tight">
              Control de Repartidores
            </h1>
            <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-1">
              Monitoreo operativo y despacho de flota en tiempo real.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 text-[11px] font-bold font-mono tracking-wider text-[#09090B] dark:text-zinc-100 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#09090B] dark:bg-emerald-400 animate-pulse" />
              <span>SISTEMA ACTIVO</span>
            </div>

            {/* Quick Simulation Trigger button */}
            <button
              onClick={handleToggleSimulation}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-[#09090B] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md font-semibold hover:opacity-85 transition"
            >
              {loading
                ? 'Cargando...'
                : isSimulationRunning
                ? `⏹ Detener Turno (Tick ${shiftState?.currentTick || 0})`
                : '▶ Simular Flota'}
            </button>
          </div>
        </div>

        {/* Top 4 KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1: Entregas Hoy (Funcional iniciando en 0) */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#71717A] dark:text-zinc-400 font-medium">
                Entregas Hoy
              </span>
              <span className="text-[11px] font-mono font-bold text-[#09090B] dark:text-zinc-200">
                {deliveryGrowth}
              </span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-[#09090B] dark:text-zinc-100">
              {totalDeliveredToday}
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#71717A] dark:text-zinc-400 font-medium">
                Repartidores Activos
              </span>
              <span className="text-[11px] font-mono font-bold text-[#09090B] dark:text-zinc-200">
                96%
              </span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-[#09090B] dark:text-zinc-100">
              48 / 50
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#71717A] dark:text-zinc-400 font-medium">
                Tiempo Promedio de Entrega
              </span>
              <span className="text-[11px] font-mono font-bold text-[#09090B] dark:text-zinc-200">
                -1.8 min
              </span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-[#09090B] dark:text-zinc-100">
              22 min
            </div>
          </div>

          {/* KPI 4 (Emphasized dark border) */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-[#09090B] dark:border-zinc-400 p-5 flex flex-col justify-between shadow-sm h-28">
            <div className="flex justify-between items-start">
              <span className="text-xs text-[#71717A] dark:text-zinc-400 font-medium">
                Incidencias Críticas
              </span>
              <span className="text-[11px] font-semibold text-[#09090B] dark:text-zinc-200">
                Atendidas
              </span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-[#09090B] dark:text-zinc-100">
              03
            </div>
          </div>
        </div>

        {/* 3-Column Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Agent Cards (3 cols on desktop) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Agent A Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                  Agent A — The Economist
                </h3>
                <span className="text-xs text-[#71717A] dark:text-zinc-400">MXN</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#09090B] dark:text-zinc-100">
                ${agentA.currentEarnings}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-1 border-t border-[#E4E4E7] dark:border-zinc-800 text-[#71717A] dark:text-zinc-400">
                <div>
                  Distance:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {agentA.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Orders Done:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {agentA.completedOrders}
                  </span>
                </div>
                <div>
                  Skipped:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {agentA.skippedOrders}
                  </span>
                </div>
                <div>
                  Avg Rate:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    ${agentA.totalKm > 0 ? (agentA.currentEarnings / agentA.totalKm).toFixed(0) : 0}/km
                  </span>
                </div>
              </div>
            </div>

            {/* Agent B Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                  Agent B — The Hustler
                </h3>
                <span className="text-xs text-[#71717A] dark:text-zinc-400">MXN</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#09090B] dark:text-zinc-100">
                ${agentB.currentEarnings}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-1 border-t border-[#E4E4E7] dark:border-zinc-800 text-[#71717A] dark:text-zinc-400">
                <div>
                  Distance:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {agentB.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Orders Done:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {agentB.completedOrders}
                  </span>
                </div>
                <div>
                  Skipped:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {agentB.skippedOrders}
                  </span>
                </div>
                <div>
                  Avg Rate:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    ${agentB.totalKm > 0 ? (agentB.currentEarnings / agentB.totalKm).toFixed(0) : 0}/km
                  </span>
                </div>
              </div>
            </div>

            {/* Baseline Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                  Traditional App Baseline
                </h3>
                <span className="text-xs text-[#71717A] dark:text-zinc-400">MXN</span>
              </div>
              <div className="text-2xl font-mono font-bold text-[#09090B] dark:text-zinc-100">
                ${baseline.currentEarnings}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px] pt-1 border-t border-[#E4E4E7] dark:border-zinc-800 text-[#71717A] dark:text-zinc-400">
                <div>
                  Distance:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {baseline.totalKm.toFixed(1)} km
                  </span>
                </div>
                <div>
                  Orders Done:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {baseline.completedOrders}
                  </span>
                </div>
                <div>
                  Skipped:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    {baseline.skippedOrders}
                  </span>
                </div>
                <div>
                  Avg Rate:{' '}
                  <span className="font-mono text-[#09090B] dark:text-zinc-200 font-semibold">
                    ${baseline.totalKm > 0 ? (baseline.currentEarnings / baseline.totalKm).toFixed(0) : 0}/km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Tables (6 cols on desktop) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Table 1: Repartidores Activos */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                    Repartidores Activos
                  </h3>
                  <p className="text-xs text-[#71717A] dark:text-zinc-400">
                    Flota de reparto en operaciones durante el turno actual.
                  </p>
                </div>

                {/* Filter input */}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#71717A]">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar repartidores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 pr-3 py-1 text-xs rounded-md bg-[#F4F4F5] dark:bg-zinc-800 border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-44"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-zinc-800 text-[10px] uppercase font-bold text-[#71717A] tracking-wider">
                      <th className="pb-2.5 font-semibold">REPARTIDOR</th>
                      <th className="pb-2.5 font-semibold">ZONA ASIGNADA</th>
                      <th className="pb-2.5 font-semibold">VEHÍCULO</th>
                      <th className="pb-2.5 font-semibold">ENTREGAS (HOY)</th>
                      <th className="pb-2.5 font-semibold text-right">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]/60 dark:divide-zinc-800/60">
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-[#F4F4F5]/50 dark:hover:bg-zinc-800/30 transition">
                        <td className="py-3">
                          <div className="font-semibold text-[#09090B] dark:text-zinc-100 text-xs">
                            {driver.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#71717A]">
                            {driver.id}
                          </div>
                        </td>
                        <td className="py-3 text-xs text-[#09090B] dark:text-zinc-300">
                          {driver.zone}
                        </td>
                        <td className="py-3 text-xs text-[#71717A] dark:text-zinc-400 flex items-center gap-1">
                          <span className="text-[11px]">⊗</span> {driver.vehicle}
                        </td>
                        <td className="py-3 font-mono font-medium text-[#09090B] dark:text-zinc-200">
                          {driver.deliveriesToday}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleManualStatus(driver.id, driver.statusType)}
                            title="Alternar estado (Disponible / En Ruta)"
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                              driver.statusType === 'en_ruta'
                                ? 'bg-[#09090B] text-white dark:bg-white dark:text-zinc-950 shadow-sm hover:opacity-90'
                                : 'bg-white dark:bg-transparent border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-200 hover:border-zinc-500'
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

            {/* Table 2: Pedidos Recientes & Despacho */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                  Pedidos Recientes & Despacho
                </h3>
                <p className="text-xs text-[#71717A] dark:text-zinc-400">
                  Últimas órdenes en curso asignadas o en espera.
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-zinc-800 text-[10px] uppercase font-bold text-[#71717A] tracking-wider">
                      <th className="pb-2.5 font-semibold">ID PEDIDO</th>
                      <th className="pb-2.5 font-semibold">DIRECCIÓN DESTINO</th>
                      <th className="pb-2.5 font-semibold">H. ASIGNACIÓN</th>
                      <th className="pb-2.5 font-semibold">REPARTIDOR</th>
                      <th className="pb-2.5 font-semibold text-right">VALOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]/60 dark:divide-zinc-800/60 font-mono text-xs">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#F4F4F5]/50 dark:hover:bg-zinc-800/30 transition">
                        <td className="py-3 font-semibold text-[#09090B] dark:text-zinc-100">
                          {order.id}
                        </td>
                        <td className="py-3 font-sans text-xs text-[#09090B] dark:text-zinc-300">
                          {order.destination}
                        </td>
                        <td className="py-3 text-xs text-[#71717A] dark:text-zinc-400">
                          {order.assignedTime}
                        </td>
                        <td className="py-3 font-sans text-xs text-[#09090B] dark:text-zinc-200">
                          {order.courier}
                        </td>
                        <td className="py-3 text-right font-bold text-[#09090B] dark:text-zinc-100">
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
          <div className="lg:col-span-3 space-y-5">
            {/* Card 1: Acciones Operativas */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                Acciones Operativas
              </h3>
              
              <div className="space-y-2.5 pt-1">
                <Link
                  href="/"
                  className="w-full bg-[#09090B] hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold py-2.5 rounded-lg transition shadow-sm text-center block"
                >
                  🗺️ Ver Mapa de Ruteo OSRM en Vivo
                </Link>

                <button
                  type="button"
                  onClick={() => alert('Alerta enviada a la flota: Tráfico pesado detectado en Gonzalitos y Morones Prieto.')}
                  className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-200 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>ⓘ</span> Alertar a la Flota
                </button>
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-200 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>⤓</span> Exportar Reporte de Turno (JSON)
                </button>
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
