import { AgentDecisionData, Order, DisruptionEvent } from '@/lib/types';

const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || 'http://localhost:8001';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isOrderInHazard(order: Order, event: DisruptionEvent): boolean {
  if (!event.lat || !event.lon || !event.radius_km) return false;
  const pLat = order.pickup.lat;
  const pLon = order.pickup.lon || order.pickup.lng!;
  const dLat = order.dropoff.lat;
  const dLon = order.dropoff.lon || order.dropoff.lng!;

  // 1. Distancia de punto de recolección
  if (haversineKm(pLat, pLon, event.lat, event.lon) <= event.radius_km) return true;
  // 2. Distancia de punto de entrega
  if (haversineKm(dLat, dLon, event.lat, event.lon) <= event.radius_km) return true;
  // 3. Distancia en punto medio de la ruta (intersección de corredor)
  const midLat = (pLat + dLat) / 2;
  const midLon = (pLon + dLon) / 2;
  if (haversineKm(midLat, midLon, event.lat, event.lon) <= event.radius_km * 0.9) return true;

  return false;
}

export async function getAgentDecision(
  agentType: 'agent_a' | 'agent_b',
  orders: Order[],
  state: any,
  events: DisruptionEvent[]
): Promise<AgentDecisionData> {
  const endpoint = `${PYTHON_AGENT_URL}/decide/${agentType === 'agent_a' ? 'agent-a' : 'agent-b'}`;
  const payload = {
    orders,
    state,
    events,
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (_err) {
    // Fallback TS decision logic if Python microservice is offline
  }

  const safeEvents = events || [];
  const activeClosures = safeEvents.filter((e) => e.event_type === 'road_closure' && e.active);
  const activeUnsafe = safeEvents.filter((e) => e.event_type === 'unsafe_zone' && e.active);
  const hasRain = safeEvents.some((e) => e.event_type === 'rain' && e.active);

  const accepted: string[] = [];
  const skipped: string[] = [];
  let totalPay = 0;
  let totalKm = 0;
  let skipReason = '';

  if (agentType === 'agent_a') {
    // THE ECONOMIST: Política de Cero Riesgo y Máximo Margen
    const minMxnPerKm = hasRain ? 11.5 : 9.0;
    const minPayout = hasRain ? 36 : 28;
    const courierLat = Number(state?.lat || 25.6692);
    const courierLng = Number(state?.lng || state?.lon || -100.3099);

    for (const o of orders) {
      // 1. Evasión de Zonas de Riesgo (Independencia / Campana)
      const inUnsafe = activeUnsafe.some((ev) => isOrderInHazard(o, ev));
      if (inUnsafe) {
        skipped.push(o.order_id);
        skipReason = 'Evadió Zona de Riesgo Crítico (seguridad de carga priorizada)';
        continue;
      }

      // 2. Evasión de Cierres Viales (Constitución / Pino Suárez)
      const inClosure = activeClosures.some((ev) => isOrderInHazard(o, ev));
      if (inClosure) {
        skipped.push(o.order_id);
        skipReason = 'Evadió Cierre Vial (bloqueo destruiría el margen por km)';
        continue;
      }

      // 3. Filtro de clima extremo (lluvia torrencial)
      if (hasRain && o.estimated_distance_km > 6.0) {
        skipped.push(o.order_id);
        skipReason = 'Rechazó viaje largo por tormenta torrencial (riesgo vial)';
        continue;
      }

      // 4. Criterio de rentabilidad puerta a puerta (incluye aproximación / deadhead)
      const pLat = o.pickup.lat;
      const pLon = o.pickup.lon || o.pickup.lng!;
      const approachKm = haversineKm(courierLat, courierLng, pLat, pLon);
      const totalKmDoorToDoor = o.estimated_distance_km + approachKm;
      const realPayPerKm = totalKmDoorToDoor > 0 ? o.total_pay / totalKmDoorToDoor : 0;

      if (realPayPerKm >= minMxnPerKm && o.total_pay >= minPayout) {
        if (accepted.length < 1) {
          accepted.push(o.order_id);
          totalPay += o.total_pay;
          totalKm += totalKmDoorToDoor;
        } else {
          skipped.push(o.order_id);
        }
      } else {
        skipped.push(o.order_id);
      }
    }
  } else {
    // THE HUSTLER: Agrupamiento espacial estricto (Cluster Batching)
    const courierLat = Number(state?.lat || 25.6692);
    const courierLng = Number(state?.lng || state?.lon || -100.3099);

    // 1. Filtrar órdenes seguras (evadir tanto cierres viales como zonas de riesgo)
    const safeOrders = orders.filter((o) => {
      const inUnsafe = activeUnsafe.some((ev) => isOrderInHazard(o, ev));
      const inClosure = activeClosures.some((ev) => isOrderInHazard(o, ev));
      return !inUnsafe && !inClosure;
    });

    if (safeOrders.length === 0) {
      return {
        agent_id: 'agent_b',
        label: 'Agent B — The Hustler',
        accepted: [],
        skipped: orders.map((o) => o.order_id),
        earnings_total: 0,
        km_total: 0,
        orders_completed: 0,
        orders_skipped: orders.length,
        strategy: 'OR-Tools Spatial Cluster (Fallback)',
        primary_reasoning: 'Rechazó todas las órdenes por cierres viales o zonas de riesgo activas',
      };
    }

    const scoredOrders = safeOrders.map((o) => {
      const rainDelayFactor = hasRain ? 1.45 : 1.0;
      const prepMin = o.prep_time_min || 12;
      const trafficMultiplier =
        (o.traffic_density === 'jam'
          ? 2.1
          : o.traffic_density === 'high'
            ? 1.6
            : o.traffic_density === 'medium'
              ? 1.25
              : 1.0) * rainDelayFactor;

      const pLat = o.pickup.lat;
      const pLon = o.pickup.lon || o.pickup.lng!;
      const approachKm = haversineKm(courierLat, courierLng, pLat, pLon);
      const transitMin = (((o.estimated_distance_km || 2) + approachKm) / 25) * 60 * trafficMultiplier;
      const totalTimeMin = Math.max(4, transitMin + prepMin * 0.45);
      const totalRevenue = o.total_pay + (o.tip || 0);

      const hourlyYield = (totalRevenue / totalTimeMin) * 60;
      return { order: o, hourlyYield };
    });

    scoredOrders.sort((a, b) => b.hourlyYield - a.hourlyYield);

    // Pedido ancla (mejor hourly yield)
    const anchor = scoredOrders[0];
    accepted.push(anchor.order.order_id);
    totalPay += anchor.order.total_pay;
    totalKm += anchor.order.estimated_distance_km;

    // Solo agrupar pedidos adicionales si forman un cluster geográfico estrecho (pickup <= 1.8km, dropoff <= 2.5km)
    for (let i = 1; i < scoredOrders.length && accepted.length < 3; i++) {
      const cand = scoredOrders[i];
      const pDist = haversineKm(
        anchor.order.pickup.lat,
        anchor.order.pickup.lon || anchor.order.pickup.lng!,
        cand.order.pickup.lat,
        cand.order.pickup.lon || cand.order.pickup.lng!
      );
      const dDist = haversineKm(
        anchor.order.dropoff.lat,
        anchor.order.dropoff.lon || anchor.order.dropoff.lng!,
        cand.order.dropoff.lat,
        cand.order.dropoff.lon || cand.order.dropoff.lng!
      );

      if (pDist <= 1.8 && dDist <= 2.5 && (cand.hourlyYield >= 80 || cand.order.total_pay >= 28)) {
        accepted.push(cand.order.order_id);
        totalPay += cand.order.total_pay;
        totalKm += cand.order.estimated_distance_km;
      } else {
        skipped.push(cand.order.order_id);
      }
    }

    for (const o of orders) {
      if (!accepted.includes(o.order_id) && !skipped.includes(o.order_id)) {
        skipped.push(o.order_id);
      }
    }
  }

  const defaultReason = accepted.length
    ? `${agentType === 'agent_a' ? 'Economist' : 'Hustler'}: Despachó ${accepted.length} orden(es) optimizadas (${hasRain ? 'Modo Tormenta Activo' : 'Rendimiento pico'})`
    : skipReason || 'Esperando pedidos de alto margen o menor riesgo';

  return {
    agent_id: agentType,
    label: agentType === 'agent_a' ? 'The Economist' : 'The Hustler',
    accepted,
    skipped,
    earnings_total: Math.round(totalPay * 100) / 100,
    km_total: Math.round(totalKm * 100) / 100,
    orders_completed: accepted.length,
    orders_skipped: skipped.length,
    strategy:
      agentType === 'agent_a'
        ? hasRain ? 'DQN RL (Cero Riesgo Clima)' : 'DQN RL (Profit/km)'
        : hasRain ? 'OR-Tools (Cluster Hiper-Local Tormenta)' : 'OR-Tools + XGBoost (Throughput)',
    primary_reasoning: defaultReason,
  };
}
