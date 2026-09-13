import { NextResponse } from 'next/server';
import { ShiftEngine } from '@/lib/simulator/shift';
import { DEMO_PRESET_EVENTS } from '@/lib/simulator/events';
import { DisruptionEvent } from '@/lib/types';

export const maxDuration = 300; // Allow up to 5 minutes if needed

interface ScenarioDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  eventIndices: number[]; // Indices into DEMO_PRESET_EVENTS: 0: Surge, 1: Road Closure, 2: Rain, 3: Unsafe Zone
}

const BENCHMARK_SCENARIOS: ScenarioDefinition[] = [
  // 0: Sin nada (Baseline limpio)
  {
    id: 'clean_baseline',
    code: 'NONE',
    name: '00. Sin Eventos (Control Limpio)',
    description: 'Tráfico habitual de Monterrey, sin disrupciones climáticas ni bloqueos.',
    eventIndices: [],
  },
  // 1-4: Un evento individual cada uno
  {
    id: 'single_surge',
    code: 'S',
    name: '01. Solo Surge (2.5x Valle)',
    description: 'Alta demanda en San Pedro / Valle Oriente con multiplicador 2.5x.',
    eventIndices: [0],
  },
  {
    id: 'single_closure',
    code: 'C',
    name: '02. Solo Cierre Vial (Constitución)',
    description: 'Bloqueo severo en Av. Constitución / Pino Suárez (velocidad cae a 4 km/h).',
    eventIndices: [1],
  },
  {
    id: 'single_rain',
    code: 'R',
    name: '03. Solo Tormenta Torrencial',
    description: 'Lluvia torrencial en Monterrey: -40% velocidad promedio y propinas más altas.',
    eventIndices: [2],
  },
  {
    id: 'single_unsafe',
    code: 'U',
    name: '04. Solo Zona de Riesgo',
    description: 'Inseguridad crítica en Independencia / Campana (-$45 MXN por incidente).',
    eventIndices: [3],
  },
  // 5-10: Combinaciones de 2 eventos (Pares)
  {
    id: 'pair_surge_closure',
    code: 'S+C',
    name: '05. Surge + Cierre Vial',
    description: 'Tarifas altas en San Pedro combinadas con arteria principal bloqueada.',
    eventIndices: [0, 1],
  },
  {
    id: 'pair_surge_rain',
    code: 'S+R',
    name: '06. Surge + Tormenta',
    description: 'Lluvia torrencial con alta demanda combinada.',
    eventIndices: [0, 2],
  },
  {
    id: 'pair_surge_unsafe',
    code: 'S+U',
    name: '07. Surge + Zona de Riesgo',
    description: 'Bonos de tarifa pero con trampa de pedidos peligrosos en zona sur.',
    eventIndices: [0, 3],
  },
  {
    id: 'pair_closure_rain',
    code: 'C+R',
    name: '08. Cierre Vial + Tormenta',
    description: 'Inundación urbana: arterias tapadas y asfalto resbaloso simultáneo.',
    eventIndices: [1, 2],
  },
  {
    id: 'pair_closure_unsafe',
    code: 'C+U',
    name: '09. Cierre Vial + Zona de Riesgo',
    description: 'Desvíos forzados hacia corredores periféricos peligrosos.',
    eventIndices: [1, 3],
  },
  {
    id: 'pair_rain_unsafe',
    code: 'R+U',
    name: '10. Tormenta + Zona de Riesgo',
    description: 'Visibilidad nula, lentitud y riesgo criminal combinado.',
    eventIndices: [2, 3],
  },
  // 11-14: Combinaciones de 3 eventos (Tríos)
  {
    id: 'triple_surge_closure_rain',
    code: 'S+C+R',
    name: '11. Surge + Cierre + Tormenta',
    description: 'Alta demanda en caos vial absoluto por tormenta e inundación.',
    eventIndices: [0, 1, 2],
  },
  {
    id: 'triple_surge_closure_unsafe',
    code: 'S+C+U',
    name: '12. Surge + Cierre + Zona Riesgo',
    description: 'Precios atractivos con rutas bloqueadas y peligro delictivo.',
    eventIndices: [0, 1, 3],
  },
  {
    id: 'triple_surge_rain_unsafe',
    code: 'S+R+U',
    name: '13. Surge + Tormenta + Zona Riesgo',
    description: 'Tormenta con surge pero exposición a robos en colonias vulnerables.',
    eventIndices: [0, 2, 3],
  },
  {
    id: 'triple_closure_rain_unsafe',
    code: 'C+R+U',
    name: '14. Cierre + Tormenta + Zona Riesgo',
    description: 'Sin incentivo de surge: pura fricción operativa, lentitud y peligro.',
    eventIndices: [1, 2, 3],
  },
  // 15: Los 4 eventos simultáneos (Tormenta Perfecta)
  {
    id: 'all_events',
    code: 'S+C+R+U',
    name: '15. Tormenta Perfecta (4 Eventos)',
    description: 'Surge 2.5x + Cierre Constitución + Tormenta -40% + Inseguridad Crítica.',
    eventIndices: [0, 1, 2, 3],
  },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const durationMin = parseInt(url.searchParams.get('durationMin') || '480', 10);
  const seed = parseInt(url.searchParams.get('seed') || '42', 10);
  const halfTick = Math.floor(durationMin / 2);

  const results = [];

  for (const scenario of BENCHMARK_SCENARIOS) {
    const shiftId = `bench_${scenario.id}_${Date.now()}`;
    const engine = new ShiftEngine(shiftId, durationMin, seed, 0, true);

    // Asegurar sin eventos al inicio
    engine.setDisruptionEvents([]);

    // 1. Simular primera mitad (Ticks 1 hasta halfTick) sin eventos
    for (let t = 0; t < halfTick; t++) {
      await engine.tick();
    }

    // 2. A la mitad del turno (halfTick), inyectar los eventos correspondientes
    const activeEventsToInject: DisruptionEvent[] = scenario.eventIndices.map((idx) => ({
      ...DEMO_PRESET_EVENTS[idx],
    }));
    engine.setDisruptionEvents(activeEventsToInject);

    // 3. Simular segunda mitad (halfTick hasta durationMin) con eventos activos
    for (let t = halfTick; t < durationMin; t++) {
      await engine.tick();
    }

    engine.stop();

    const state = engine.state;
    const agentA = state.agents.agent_a;
    const agentB = state.agents.agent_b;
    const base = state.agents.baseline;

    const calculateCosts = (c: typeof agentA) => {
      const fuel = c.fuelCostMXN ?? Math.round(c.totalKm * 0.70 * 10) / 10;
      const pen = c.penaltiesMXN ?? 0;
      return Math.round((fuel + pen) * 10) / 10;
    };

    const calculateNet = (c: typeof agentA) => {
      if (c.netEarnings !== undefined) return c.netEarnings;
      const costs = calculateCosts(c);
      return Math.round((c.currentEarnings - costs) * 10) / 10;
    };

    const baseNet = calculateNet(base);
    const aNet = calculateNet(agentA);
    const bNet = calculateNet(agentB);

    results.push({
      scenario: {
        id: scenario.id,
        code: scenario.code,
        name: scenario.name,
        description: scenario.description,
        eventCount: scenario.eventIndices.length,
      },
      durationMin,
      halfTick,
      agent_a: {
        name: 'The Economist (DQN)',
        gross: agentA.currentEarnings,
        km: agentA.totalKm,
        orders: agentA.completedOrders,
        skipped: agentA.skippedOrders,
        incidents: agentA.incidentsCount || 0,
        costs: calculateCosts(agentA),
        fuelCost: agentA.fuelCostMXN || 0,
        penalties: agentA.penaltiesMXN || 0,
        net: aNet,
        netPerKm: agentA.totalKm > 0 ? Math.round((aNet / agentA.totalKm) * 10) / 10 : 0,
        deltaVsBase: Math.round((aNet - baseNet) * 10) / 10,
        trapped: agentA.status === 'trapped_in_closure',
      },
      agent_b: {
        name: 'The Hustler (OR-Tools+XGB)',
        gross: agentB.currentEarnings,
        km: agentB.totalKm,
        orders: agentB.completedOrders,
        skipped: agentB.skippedOrders,
        incidents: agentB.incidentsCount || 0,
        costs: calculateCosts(agentB),
        fuelCost: agentB.fuelCostMXN || 0,
        penalties: agentB.penaltiesMXN || 0,
        net: bNet,
        netPerKm: agentB.totalKm > 0 ? Math.round((bNet / agentB.totalKm) * 10) / 10 : 0,
        deltaVsBase: Math.round((bNet - baseNet) * 10) / 10,
        trapped: agentB.status === 'trapped_in_closure',
      },
      baseline: {
        name: 'Traditional Baseline (FIFO Naive)',
        gross: base.currentEarnings,
        km: base.totalKm,
        orders: base.completedOrders,
        skipped: base.skippedOrders,
        incidents: base.incidentsCount || 0,
        costs: calculateCosts(base),
        fuelCost: base.fuelCostMXN || 0,
        penalties: base.penaltiesMXN || 0,
        net: baseNet,
        netPerKm: base.totalKm > 0 ? Math.round((baseNet / base.totalKm) * 10) / 10 : 0,
        deltaVsBase: 0,
        trapped: base.status === 'trapped_in_closure',
      },
    });
  }

  return NextResponse.json({
    ok: true,
    totalScenarios: results.length,
    shiftDuration: durationMin,
    eventInjectionTick: halfTick,
    seed,
    results,
  });
}
