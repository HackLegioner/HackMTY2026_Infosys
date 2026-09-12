import { ShiftState, CourierState, Order, CourierTask } from '@/lib/types';
import { OrderStream } from './orderStream';
import { EventEngine } from './events';
import { BaselineAgent } from './baseline';
import { getAgentDecision } from '@/lib/agents/agentClient';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';
import { fetchRoute } from '@/lib/routing/osrmClient';
import { fetchMonterreyWeather } from '@/lib/weather/openMeteoClient';
import { calculateCourierTrafficSpeed, getMonterreyTimeOfDay } from '@/lib/traffic/congestionModel';

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
      speedKmh: 25.0,
      corridorName: 'Monterrey Zona Metropolitana',
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
      weather: {
        temperature: 28.5,
        rainMm: 0,
        condition: 'clear',
        isRain: false,
        isExtremeHeat: false,
        description: '☀️ Monterrey despejado',
      },
      traffic: {
        formattedTime: '18:15',
        isRushHour: true,
        averageSpeedKmh: 22.0,
        congestionLevel: 'moderate',
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

    // Fetch live Monterrey weather via Open-Meteo API
    try {
      const weather = await fetchMonterreyWeather();
      this.state.weather = {
        temperature: weather.temperature,
        rainMm: Math.round((weather.rainMm + weather.showersMm) * 10) / 10,
        condition: weather.condition,
        isRain: weather.isRain,
        isExtremeHeat: weather.isExtremeHeat,
        description: weather.description,
      };

      if (weather.isRain && !this.state.activeEvents.some((e) => e.event_type === 'rain')) {
        this.state.activeEvents.push({
          event_id: `evt_meteo_rain_${Date.now()}`,
          event_type: 'rain',
          affected_zones: ['Centro', 'San Pedro', 'Valle Oriente', 'Cumbres', 'Tec / ITESM'],
          metadata: { multiplier: weather.suggestedSurgeMultiplier, reason: weather.description },
          description: weather.description,
          active: true,
        });
      } else if (
        weather.isExtremeHeat &&
        !this.state.activeEvents.some((e) => e.event_type === 'extreme_heat')
      ) {
        this.state.activeEvents.push({
          event_id: `evt_meteo_heat_${Date.now()}`,
          event_type: 'extreme_heat',
          affected_zones: ['Centro', 'San Pedro', 'Valle Oriente', 'Apodaca', 'Escobedo'],
          metadata: { multiplier: weather.suggestedSurgeMultiplier, reason: weather.description },
          description: weather.description,
          active: true,
        });
      }
    } catch (err) {
      console.warn('[ShiftEngine] Weather fetch error on start:', err);
    }

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

    // Reset status of all couriers to idle when simulation ends
    this.state.agents.agent_a.status = 'idle';
    this.state.agents.agent_a.activeRoute = [];
    this.state.agents.agent_b.status = 'idle';
    this.state.agents.agent_b.activeRoute = [];
    this.state.agents.baseline.status = 'idle';
    this.state.agents.baseline.activeRoute = [];

    this.subscribers.forEach((cb) => {
      try {
        cb(this.state);
      } catch (_err) {}
    });
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

    // 1. Weather speed impact
    const hasRain =
      this.state.weather?.isRain || this.state.activeEvents.some((e) => e.event_type === 'rain');
    const hasHeat =
      this.state.weather?.isExtremeHeat ||
      this.state.activeEvents.some((e) => e.event_type === 'extreme_heat');
    const weatherSpeedFactor = hasRain ? 0.64 : hasHeat ? 0.88 : 1.0;

    // 2. Courier-specific traffic congestion based on Monterrey coordinates & rush hours
    const courierA = this.state.agents.agent_a;
    const courierB = this.state.agents.agent_b;
    const courierBase = this.state.agents.baseline;

    const trafficA = calculateCourierTrafficSpeed(
      courierA.lat,
      courierA.lng,
      this.state.elapsedMinutes,
      weatherSpeedFactor
    );
    courierA.speedKmh = trafficA.speedKmh;
    courierA.corridorName = trafficA.corridorName;

    const trafficB = calculateCourierTrafficSpeed(
      courierB.lat,
      courierB.lng,
      this.state.elapsedMinutes,
      weatherSpeedFactor
    );
    courierB.speedKmh = trafficB.speedKmh;
    courierB.corridorName = trafficB.corridorName;

    const trafficBase = calculateCourierTrafficSpeed(
      courierBase.lat,
      courierBase.lng,
      this.state.elapsedMinutes,
      weatherSpeedFactor
    );
    courierBase.speedKmh = trafficBase.speedKmh;
    courierBase.corridorName = trafficBase.corridorName;

    const timeInfo = getMonterreyTimeOfDay(this.state.elapsedMinutes);
    this.state.traffic = {
      formattedTime: timeInfo.formattedTime,
      isRushHour: timeInfo.isRushHour,
      averageSpeedKmh:
        Math.round(((trafficA.speedKmh + trafficB.speedKmh + trafficBase.speedKmh) / 3) * 10) / 10,
      congestionLevel: trafficA.congestionLevel,
    };

    // 3. Generate new incoming orders with Kaggle distributions
    const newOrders = this.orderStream.generateTick(
      this.state.elapsedMinutes * 60,
      this.state.activeEvents
    );
    this.state.newOrders = newOrders;
    this.state.activeEvents = this.eventEngine.getActiveEvents();

    // 4. Dispatch decisions for couriers who have available capacity
    await this.evaluateDispatch(newOrders);

    // 5. Advance physical movement & order lifecycle along real street waypoints with calibrated speeds
    await this.stepCourierPhysics('agent_a', trafficA.speedKmPerMin);
    await this.stepCourierPhysics('agent_b', trafficB.speedKmPerMin);
    await this.stepCourierPhysics('baseline', trafficBase.speedKmPerMin);

    // 6. Broadcast live state to SSE subscribers
    this.subscribers.forEach((cb) => {
      try {
        cb(this.state);
      } catch (_err) {}
    });

    // 7. Async persistence
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

    // Calibrated kitchen prep wait time based on Kaggle food type (1-3 ticks)
    const prepMin = nextOrder.prep_time_min || 10;
    const waitTicks = Math.max(1, Math.min(3, Math.round(prepMin / 7)));

    courier.currentTask = {
      orderId: nextOrder.id || nextOrder.order_id,
      phase: 'to_pickup',
      target,
      targetName: nextOrder.pickup.zone,
      waitTicksRemaining: waitTicks,
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

    // 2. Waiting at kitchen for preparation (calibrated via Kaggle prep times)
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
