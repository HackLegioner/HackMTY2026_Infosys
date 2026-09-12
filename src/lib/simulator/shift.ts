import { ShiftState, CourierState, Order, CourierTask } from '@/lib/types';
import { OrderStream } from './orderStream';
import { EventEngine } from './events';
import { BaselineAgent } from './baseline';
import { getAgentDecision } from '@/lib/agents/agentClient';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';
import { fetchRoute } from '@/lib/routing/osrmClient';

declare global {
  var __shiftsMap: Map<string, ShiftEngine> | undefined;
}

const shiftsMap: Map<string, ShiftEngine> =
  globalThis.__shiftsMap ?? (globalThis.__shiftsMap = new Map<string, ShiftEngine>());

export function getOrCreateShift(shiftId: string, durationMin: number = 60, seed: number = 42): ShiftEngine {
  if (!shiftsMap.has(shiftId)) {
    const engine = new ShiftEngine(shiftId, durationMin, seed);
    shiftsMap.set(shiftId, engine);
  }
  return shiftsMap.get(shiftId)!;
}

export function getActiveShift(shiftId: string): ShiftEngine | undefined {
  return shiftsMap.get(shiftId);
}

export function removeShift(shiftId: string): boolean {
  const engine = shiftsMap.get(shiftId);
  if (engine) {
    engine.stop();
    return shiftsMap.delete(shiftId);
  }
  return false;
}

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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class ShiftEngine {
  public shiftId: string;
  public durationMin: number;
  public seed: number;
  public state: ShiftState;
  private orderStream: OrderStream;
  private eventEngine: EventEngine;
  private baselineAgent: BaselineAgent;
  public timer: NodeJS.Timeout | null = null;
  private subscribers: Array<(state: ShiftState) => void> = [];

  constructor(shiftId: string, durationMin: number = 60, seed: number = 42) {
    this.shiftId = shiftId;
    this.durationMin = durationMin;
    this.seed = seed;
    this.orderStream = new OrderStream(seed);
    this.eventEngine = new EventEngine();
    this.baselineAgent = new BaselineAgent();

    // Couriers start in Monterrey Centro hubs with slight offset
    const initialCourier = (
      agentId: 'agent_a' | 'agent_b' | 'baseline',
      startLat: number,
      startLng: number
    ): CourierState => ({
      agentId,
      lat: startLat,
      lng: startLng,
      currentEarnings: 0,
      totalKm: 0,
      completedOrders: 0,
      skippedOrders: 0,
      activeRoute: [],
      carryingOrders: [],
      status: 'idle',
    });

    this.state = {
      shiftId,
      tick: 0,
      elapsedMinutes: 0,
      totalMinutes: durationMin,
      agents: {
        agent_a: initialCourier('agent_a', 25.6692, -100.3099), // Macroplaza
        agent_b: initialCourier('agent_b', 25.6574, -100.3684), // Centrito San Pedro
        baseline: initialCourier('baseline', 25.6866, -100.3161), // Tec de Monterrey
      },
      activeEvents: [],
      newOrders: [],
      decisions: {
        agent_a: {
          agent_id: 'agent_a',
          label: 'The Economist 🧊',
          accepted: [],
          skipped: [],
          earnings_total: 0,
          km_total: 0,
          orders_completed: 0,
          orders_skipped: 0,
          strategy: 'DQN RL (Profit/km)',
          primary_reasoning: 'Waiting for high-margin orders...',
        },
        agent_b: {
          agent_id: 'agent_b',
          label: 'The Hustler ⚡',
          accepted: [],
          skipped: [],
          earnings_total: 0,
          km_total: 0,
          orders_completed: 0,
          orders_skipped: 0,
          strategy: 'OR-Tools + XGBoost (Throughput)',
          primary_reasoning: 'Scanning for batch opportunities...',
        },
        baseline: {
          agent_id: 'baseline',
          label: 'Traditional App Baseline 📱',
          accepted: [],
          skipped: [],
          earnings_total: 0,
          km_total: 0,
          orders_completed: 0,
          orders_skipped: 0,
          strategy: 'Naive FIFO',
          primary_reasoning: 'FIFO queue active...',
        },
      },
    };
  }

  public subscribe(callback: (state: ShiftState) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  public async start() {
    if (this.timer) return;

    await this.tick();

    connectDB().then(async (conn) => {
      if (conn) {
        try {
          await Shift.updateOne(
            { shiftId: this.shiftId },
            {
              shiftId: this.shiftId,
              durationMin: this.durationMin,
              seed: this.seed,
            },
            { upsert: true }
          );
        } catch (_err) {}
      }
    });

    this.timer = setInterval(async () => {
      await this.tick();
    }, 2000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public triggerEvent(presetIndex?: number) {
    const evt = this.eventEngine.triggerPreset(presetIndex || 0);
    if (evt) {
      this.state.activeEvents = this.eventEngine.getActiveEvents();
    }
    return evt;
  }

  public async tick() {
    if (this.state.elapsedMinutes >= this.state.totalMinutes) {
      this.stop();
      return;
    }

    this.state.tick += 1;
    this.state.elapsedMinutes += 1;

    // 1. Check traffic speed based on weather and road disruptions
    const hasRain = this.state.activeEvents.some((e) => e.event_type === 'rain');
    const hasRoadClosure = this.state.activeEvents.some((e) => e.event_type === 'road_closure');
    // Normal city motorcycle speed: 25 km/h -> 0.42 km/min.
    // Rain: 16 km/h. Road closure bottleneck: 18 km/h. Both: 12 km/h.
    let speedKmh = 25;
    if (hasRain && hasRoadClosure) speedKmh = 12;
    else if (hasRain) speedKmh = 16;
    else if (hasRoadClosure) speedKmh = 18;
    const speedKmPerMin = speedKmh / 60;

    // 2. Generate new incoming orders in Monterrey
    const newOrders = this.orderStream.generateTick(
      this.state.elapsedMinutes * 60,
      this.state.activeEvents
    );
    this.state.newOrders = newOrders;
    this.state.activeEvents = this.eventEngine.getActiveEvents();

    // 3. Dispatch decisions for couriers who have available capacity
    await this.evaluateDispatch(newOrders);

    // 4. Advance physical movement & order lifecycle along real street waypoints
    await this.stepCourierPhysics('agent_a', speedKmPerMin);
    await this.stepCourierPhysics('agent_b', speedKmPerMin);
    await this.stepCourierPhysics('baseline', speedKmPerMin);

    // 5. Broadcast live state to SSE subscribers
    this.subscribers.forEach((cb) => {
      try {
        cb(this.state);
      } catch (_err) {}
    });

    // 6. Async persistence
    connectDB().then(async (conn) => {
      if (conn) {
        try {
          await Decision.create([
            {
              shiftId: this.shiftId,
              tick: this.state.tick,
              agentId: 'agent_a',
              accepted: this.state.decisions.agent_a.accepted.length,
              skipped: this.state.decisions.agent_a.skipped.length,
              reasoning: this.state.decisions.agent_a.primary_reasoning,
              payload: this.state.decisions.agent_a,
            },
            {
              shiftId: this.shiftId,
              tick: this.state.tick,
              agentId: 'agent_b',
              accepted: this.state.decisions.agent_b.accepted.length,
              skipped: this.state.decisions.agent_b.skipped.length,
              reasoning: this.state.decisions.agent_b.primary_reasoning,
              payload: this.state.decisions.agent_b,
            },
            {
              shiftId: this.shiftId,
              tick: this.state.tick,
              agentId: 'baseline',
              accepted: this.state.decisions.baseline.accepted.length,
              skipped: this.state.decisions.baseline.skipped.length,
              reasoning: this.state.decisions.baseline.primary_reasoning,
              payload: this.state.decisions.baseline,
            },
          ]);
        } catch (_err) {}
      }
    });
  }

  private async evaluateDispatch(newOrders: Order[]) {
    if (newOrders.length === 0) return;

    const courierA = this.state.agents.agent_a;
    const courierB = this.state.agents.agent_b;
    const courierBase = this.state.agents.baseline;

    // Agent A (Economist): Max capacity = 1 order in bag (selective high-yield)
    if (courierA.carryingOrders.length < 1) {
      const decA = await getAgentDecision('agent_a', newOrders, courierA, this.state.activeEvents);
      this.state.decisions.agent_a = decA;
      if (decA.accepted.length > 0) {
        const orderId = decA.accepted[0];
        const ord = newOrders.find((o) => o.id === orderId || o.order_id === orderId);
        if (ord && !courierA.carryingOrders.some((o) => o.id === ord.id)) {
          courierA.carryingOrders.push(ord);
          await this.initCourierTask(courierA);
        }
      } else {
        courierA.skippedOrders += decA.skipped.length;
      }
    }

    // Agent B (Hustler): Max capacity = 3 orders (OR-Tools multi-drop clustering)
    if (courierB.carryingOrders.length < 3) {
      const decB = await getAgentDecision('agent_b', newOrders, courierB, this.state.activeEvents);
      this.state.decisions.agent_b = decB;
      for (const orderId of decB.accepted) {
        if (courierB.carryingOrders.length >= 3) break;
        const ord = newOrders.find((o) => o.id === orderId || o.order_id === orderId);
        if (ord && !courierB.carryingOrders.some((o) => o.id === ord.id)) {
          courierB.carryingOrders.push(ord);
        }
      }
      if (courierB.carryingOrders.length > 0 && !courierB.currentTask) {
        await this.initCourierTask(courierB);
      }
      courierB.skippedOrders += decB.skipped.length;
    }

    // Baseline: Max capacity = 1 (FIFO naive standard)
    if (courierBase.carryingOrders.length < 1) {
      const decBase = this.baselineAgent.decide(newOrders);
      this.state.decisions.baseline = decBase;
      if (decBase.accepted.length > 0) {
        const orderId = decBase.accepted[0];
        const ord = newOrders.find((o) => o.id === orderId || o.order_id === orderId);
        if (ord && !courierBase.carryingOrders.some((o) => o.id === ord.id)) {
          courierBase.carryingOrders.push(ord);
          await this.initCourierTask(courierBase);
        }
      } else {
        courierBase.skippedOrders += decBase.skipped.length;
      }
    }
  }

  private async initCourierTask(courier: CourierState) {
    if (courier.carryingOrders.length === 0) {
      courier.status = 'idle';
      courier.currentTask = undefined;
      courier.activeRoute = [];
      return;
    }

    const nextOrder = courier.carryingOrders[0];
    const target = {
      lat: nextOrder.pickup.lat,
      lng: nextOrder.pickup.lon || nextOrder.pickup.lng!,
    };

    courier.status = 'moving_to_pickup';

    // Fetch real street-following geometry via OSRM / Monterrey road grid
    const route = await fetchRoute({ lat: courier.lat, lng: courier.lng }, target);

    courier.currentTask = {
      orderId: nextOrder.id || nextOrder.order_id,
      phase: 'to_pickup',
      target,
      targetName: nextOrder.pickup.zone,
      waitTicksRemaining: 1, // 1 minute prep at kitchen
      waypoints: route.waypoints,
      waypointIndex: 0,
      totalRouteKm: route.distanceKm,
    };

    courier.activeRoute =
      route.waypoints && route.waypoints.length > 0
        ? route.waypoints
        : [{ lat: courier.lat, lng: courier.lng }, target];
  }

  /**
   * Advances courier along street waypoints tick-by-tick.
   * Returns true if courier reached final target.
   */
  private advanceAlongWaypoints(
    courier: CourierState,
    task: CourierTask,
    stepKm: number
  ): boolean {
    let remainingStepKm = stepKm;

    if (!task.waypoints || task.waypoints.length === 0) {
      const dist = haversineKm(courier.lat, courier.lng, task.target.lat, task.target.lng);
      if (dist <= remainingStepKm) {
        courier.lat = task.target.lat;
        courier.lng = task.target.lng;
        courier.totalKm = Math.round((courier.totalKm + dist) * 10) / 10;
        courier.activeRoute = [];
        return true;
      }
      const ratio = remainingStepKm / dist;
      courier.lat += (task.target.lat - courier.lat) * ratio;
      courier.lng += (task.target.lng - courier.lng) * ratio;
      courier.totalKm = Math.round((courier.totalKm + remainingStepKm) * 10) / 10;
      courier.activeRoute = [{ lat: courier.lat, lng: courier.lng }, task.target];
      return false;
    }

    let idx = task.waypointIndex ?? 0;

    while (remainingStepKm > 0.0001 && idx < task.waypoints.length) {
      const nextWp = task.waypoints[idx];
      const distToWp = haversineKm(courier.lat, courier.lng, nextWp.lat, nextWp.lng);

      if (distToWp <= 0.002) {
        idx++;
        task.waypointIndex = idx;
        continue;
      }

      if (remainingStepKm >= distToWp) {
        // Reached this street waypoint on this step
        courier.lat = nextWp.lat;
        courier.lng = nextWp.lng;
        courier.totalKm = Math.round((courier.totalKm + distToWp) * 10) / 10;
        remainingStepKm -= distToWp;
        idx++;
        task.waypointIndex = idx;
      } else {
        // Advance partway towards waypoint along street line
        const ratio = remainingStepKm / distToWp;
        courier.lat += (nextWp.lat - courier.lat) * ratio;
        courier.lng += (nextWp.lng - courier.lng) * ratio;
        courier.totalKm = Math.round((courier.totalKm + remainingStepKm) * 10) / 10;
        remainingStepKm = 0;
        break;
      }
    }

    task.waypointIndex = idx;

    if (idx >= task.waypoints.length) {
      const finalDist = haversineKm(courier.lat, courier.lng, task.target.lat, task.target.lng);
      courier.lat = task.target.lat;
      courier.lng = task.target.lng;
      if (finalDist > 0.001) {
        courier.totalKm = Math.round((courier.totalKm + finalDist) * 10) / 10;
      }
      courier.activeRoute = [];
      return true;
    }

    // Active route is current courier position + remaining unreached street waypoints
    courier.activeRoute = [
      { lat: courier.lat, lng: courier.lng },
      ...task.waypoints.slice(idx),
    ];
    return false;
  }

  private async stepCourierPhysics(
    agentKey: 'agent_a' | 'agent_b' | 'baseline',
    stepKm: number
  ) {
    const courier = this.state.agents[agentKey];
    const task = courier.currentTask;

    if (!task || courier.status === 'idle') {
      courier.activeRoute = [];
      return;
    }

    // 1. Moving to restaurant / pickup along real street waypoints
    if (task.phase === 'to_pickup') {
      const arrived = this.advanceAlongWaypoints(courier, task, stepKm);
      if (arrived) {
        courier.status = 'waiting_at_pickup';
        courier.activeRoute = [];
      } else {
        courier.status = 'moving_to_pickup';
      }
      return;
    }

    // 2. Waiting at kitchen for preparation
    if (courier.status === 'waiting_at_pickup') {
      task.waitTicksRemaining -= 1;
      if (task.waitTicksRemaining <= 0) {
        // Order is ready! Switch phase to dropoff
        const order = courier.carryingOrders.find(
          (o) => o.id === task.orderId || o.order_id === task.orderId
        );
        if (order) {
          const dropoffTarget = {
            lat: order.dropoff.lat,
            lng: order.dropoff.lon || order.dropoff.lng!,
          };
          const route = await fetchRoute({ lat: courier.lat, lng: courier.lng }, dropoffTarget);

          task.phase = 'to_dropoff';
          task.target = dropoffTarget;
          task.targetName = order.dropoff.zone;
          task.waypoints = route.waypoints;
          task.waypointIndex = 0;
          task.totalRouteKm = route.distanceKm;

          courier.status = 'delivering';
          courier.activeRoute =
            route.waypoints && route.waypoints.length > 0
              ? route.waypoints
              : [{ lat: courier.lat, lng: courier.lng }, dropoffTarget];
        } else {
          await this.initCourierTask(courier);
        }
      }
      return;
    }

    // 3. Delivering order to customer along real street waypoints
    if (task.phase === 'to_dropoff') {
      const arrived = this.advanceAlongWaypoints(courier, task, stepKm);
      if (arrived) {
        // Order Delivered!
        const completedIndex = courier.carryingOrders.findIndex(
          (o) => o.id === task.orderId || o.order_id === task.orderId
        );
        if (completedIndex >= 0) {
          const completedOrder = courier.carryingOrders[completedIndex];
          courier.currentEarnings =
            Math.round((courier.currentEarnings + completedOrder.total_pay) * 10) / 10;
          courier.completedOrders += 1;
          courier.carryingOrders.splice(completedIndex, 1);
        }

        // Check if there are other batched orders to deliver
        await this.initCourierTask(courier);
      } else {
        courier.status = 'delivering';
      }
    }
  }
}
