'use client';

import React, { useState, useEffect } from 'react';
import TopNavbar from '@/components/TopNavbar';
import RouteNetworkMap from '@/components/dashboard/RouteNetworkMap';
import VehicleDonutChart from '@/components/dashboard/VehicleDonutChart';
import { useShiftControl } from '@/hooks/useShiftControl';
import { useShiftStream } from '@/hooks/useShiftStream';
import Link from 'next/link';

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
    if (shiftState && totalTicks > 0 && currentTick >= totalTicks) {
      setManualOverrides({});
    }
  }, [currentTick, totalTicks, shiftState]);

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

  const resolveCourierStatus = (
    courierId: string,
    courier: { status?: string; activeRoute?: any[] }
  ) => {
    if (manualOverrides[courierId]) {
      const overrideType = manualOverrides[courierId];
      return {
        status: overrideType === 'en_ruta' ? 'En Ruta' : 'Disponible',
        statusType: overrideType,
      };
    }

    if (!isSimulationRunning) {
      return { status: 'Disponible', statusType: 'disponible' as const };
    }

    if (
      courier.status === 'delivering' ||
      courier.status === 'moving_to_pickup' ||
      courier.status === 'waiting_at_pickup'
    ) {
      return { status: 'En Ruta', statusType: 'en_ruta' as const };
    }

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
      zone: 'Centro / Macroplaza',
      vehicle: 'Moto',
      deliveriesToday: agentA.completedOrders ?? 0,
      status: statusA.status,
      statusType: statusA.statusType,
    },
    {
      id: 'REP-2104',
      name: 'Agent B — The Hustler',
      zone: 'Centrito San Pedro',
      vehicle: 'Moto',
      deliveriesToday: agentB.completedOrders ?? 0,
      status: statusB.status,
      statusType: statusB.statusType,
    },
    {
      id: 'REP-3301',
      name: 'Traditional App Baseline',
      zone: 'Tec / Garza Sada',
      vehicle: 'Moto',
      deliveriesToday: baseline.completedOrders ?? 0,
      status: statusBase.status,
      statusType: statusBase.statusType,
    },
  ];

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

  // Live or fallback Recent Orders Data
  const recentOrders =
    shiftState && shiftState.newOrders && shiftState.newOrders.length > 0
      ? shiftState.newOrders.slice(0, 4).map((ord) => ({
          id: (ord.id || ord.order_id).substring(0, 10).toUpperCase(),
          destination: `${ord.dropoff.zone} (${ord.food_type || 'comida'})`,
          assignedTime: `${shiftState.traffic?.formattedTime || '18:30'}`,
          courier:
            shiftState.decisions?.agent_b?.accepted?.includes(ord.id || ord.order_id)
              ? 'Agent B'
              : shiftState.decisions?.agent_a?.accepted?.includes(ord.id || ord.order_id)
                ? 'Agent A'
                : 'En espera',
          amount: `$${ord.total_pay.toFixed(2)} MXN`,
        }))
      : [
          {
            id: 'ORD-2391',
            destination: 'Centro Monterrey (snack)',
            assignedTime: '18:15',
            courier: 'Agent B',
            amount: '$42.50 MXN',
          },
          {
            id: 'ORD-9910',
            destination: 'San Pedro / Calzada (fast_food)',
            assignedTime: '18:19',
            courier: 'Agent A',
            amount: '$58.00 MXN',
          },
          {
            id: 'ORD-4491',
            destination: 'Valle Oriente (buffet_gourmet)',
            assignedTime: '18:24',
            courier: 'En espera',
            amount: '$95.20 MXN',
          },
          {
            id: 'ORD-1049',
            destination: 'Tec / Garza Sada (groceries)',
            assignedTime: '18:28',
            courier: 'Baseline',
            amount: '$48.90 MXN',
          },
        ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#09090B] text-[#09090B] dark:text-zinc-100 font-sans transition-colors">
      {/* Top Navbar */}
      <TopNavbar showBrand={true} />

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#09090B] dark:text-zinc-100">
              Panel de Repartidores & Flota (IRL Monterrey)
            </h1>
            <p className="text-xs text-[#71717A] dark:text-zinc-400">
              Supervisión operativa de couriers, estado en ruta y órdenes en curso.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-200 rounded-md font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-sm"
            >
              ← Simulador Split-Screen
            </Link>

            <button
              type="button"
              disabled={loading}
              onClick={handleToggleSimulation}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                isSimulationRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-[#09090B] dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90'
              }`}
            >
              <span>{isSimulationRunning ? '⏹' : '▶'}</span>
              <span>{loading ? 'Procesando...' : isSimulationRunning ? 'Detener Turno' : 'Iniciar Turno'}</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Repartidores Activos */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#71717A] dark:text-zinc-400">
                Repartidores Activos
              </span>
              <span className="text-xs text-[#71717A]">👥</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-zinc-100">
                3
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                100% flota
              </span>
            </div>
          </div>

          {/* Card 2: En Ruta */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#71717A] dark:text-zinc-400">
                En Ruta
              </span>
              <span className="text-xs text-[#71717A]">🛵</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-zinc-100">
                {driversList.filter((d) => d.statusType === 'en_ruta').length}
              </span>
              <span className="text-xs text-[#71717A] dark:text-zinc-400">
                de 3 couriers
              </span>
            </div>
          </div>

          {/* Card 3: Disponibles */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#71717A] dark:text-zinc-400">
                Disponibles
              </span>
              <span className="text-xs text-[#71717A]">⏳</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-zinc-100">
                {driversList.filter((d) => d.statusType === 'disponible').length}
              </span>
              <span className="text-xs text-[#71717A] dark:text-zinc-400">
                en espera
              </span>
            </div>
          </div>

          {/* Card 4: Entregas (Hoy) */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[#71717A] dark:text-zinc-400">
                Entregas (Hoy)
              </span>
              <span className="text-xs text-[#71717A]">📦</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-zinc-100">
                {totalDeliveredToday}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {deliveryGrowth}
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
          {/* Left Column: Tables (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Table 1: Estado de Repartidores */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E4E4E7] dark:border-zinc-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#09090B] dark:text-zinc-100">
                    Estado de Repartidores
                  </h3>
                  <p className="text-xs text-[#71717A] dark:text-zinc-400">
                    Monitoreo en tiempo real de couriers asignados y disponibilidad.
                  </p>
                </div>

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
                  Pedidos Recientes & Despacho (Kaggle Calibrated)
                </h3>
                <p className="text-xs text-[#71717A] dark:text-zinc-400">
                  Últimas órdenes en curso asignadas o en espera de preparación de cocina.
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
                  Ver Mapa de Ruteo OSRM
                </Link>

                <button
                  type="button"
                  onClick={() => alert('Alerta enviada a la flota: Zona Centro con alta congestión')}
                  className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-200 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>ⓘ</span> Alertar a la Flota
                </button>

                <button
                  type="button"
                  onClick={() => alert('Reporte de turno descargado')}
                  className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-[#E4E4E7] dark:border-zinc-700 text-[#09090B] dark:text-zinc-200 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>⤓</span> Exportar Reporte de Turno
                </button>
              </div>
            </div>

            {/* Card 2: Rutas de Reparto Minimalist Map */}
            <RouteNetworkMap />

            {/* Card 3: División de Vehículos Donut Chart */}
            <VehicleDonutChart />
          </div>
        </div>
      </main>
    </div>
  );
}
