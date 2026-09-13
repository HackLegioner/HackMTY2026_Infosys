import { ShiftState, CourierState, Order, CourierTask, DisruptionEvent } from '@/lib/types';
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
import {
  saveShiftState,
  getShiftState,
  popPendingEvents,
  setShiftStatus,
} from '@/lib/security/redisClient';

declare global {
  var __shiftsMap: Map<string, ShiftEngine> | undefined;
}

const shiftsMap: Map<string, ShiftEngine> =
  globalThis.__shiftsMap ?? (globalThis.__shiftsMap = new Map<string, ShiftEngine>());

export function getOrCreateShift(
  shiftId: string,
  durationMin: number = 480,
  seed: number = 42,
  tickSpeedMs: number = 1000
): ShiftEngine {
  if (!shiftsMap.has(shiftId)) {
    const engine = new ShiftEngine(shiftId, durationMin, seed, tickSpeedMs);
    shiftsMap.set(shiftId, engine);
  }
  return shiftsMap.get(shiftId)!;
}

export async function getOrHydrateShift(
  shiftId: string,
  durationMin: number = 480,
  seed: number = 42,
  tickSpeedMs: number = 1000
): Promise<ShiftEngine> {
  let engine = shiftsMap.get(shiftId);
  if (!engine) {
    engine = new ShiftEngine(shiftId, durationMin, seed, tickSpeedMs);
    try {
      const cached = await getShiftState(shiftId);
      if (cached) {
        engine.hydrateState(cached);
      }
    } catch (_err) {}
    shiftsMap.set(shiftId, engine);
  }
  return engine;
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
  public tickSpeedMs: number;
  public timer: NodeJS.Timeout | null = null;
  public historicalDecisions: Array<any> = [];
  public immediateHandle: NodeJS.Immediate | null = null;
  public isRunning: boolean = false;
  public isFastForwarding: boolean = false;
  public isBenchmark: boolean = false;
  private isTicking: boolean = false;
  private subscribers: Array<(state: ShiftState) => void> = [];

  public getState(): ShiftState {
    return this.state;
  }

  public hydrateState(savedState: ShiftState) {
    this.state = savedState;
    this.durationMin = savedState.totalMinutes;
  }

  constructor(
    shiftId: string,
    durationMin: number = 480,
    seed: number = 42,
    tickSpeedMs: number = 1000,
    isBenchmark: boolean = false
  ) {
    this.shiftId = shiftId;
    this.durationMin = durationMin;
    this.seed = seed;
    this.tickSpeedMs = tickSpeedMs;
    this.isBenchmark = isBenchmark;
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
      penaltiesMXN: 0,
      fuelCostMXN: 0,
      netEarnings: 0,
      incidentsCount: 0,
      consecutiveSkips: 0,
      dispatchCooldownTicks: 0,
    });

    this.state = {
      shiftId,
      tick: 0,
      elapsedMinutes: 0,
      totalMinutes: durationMin,
      agents: {
        agent_a: initialCourier('agent_a', 25.6692, -100.3099), // Centro / Macroplaza
        agent_b: initialCourier('agent_b', 25.6574, -100.3684), // Centrito Valle
        baseline: initialCourier('baseline', 25.6514, -100.2895), // Tec / DistritoTec
      },
      activeEvents: [],
      newOrders: [],
      decisions: {
        agent_a: {
          agent_id: 'agent_a',
          label: 'The Economist',
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
          label: 'The Hustler',
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
          label: 'Traditional App Baseline',
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
        description: 'Monterrey despejado',
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
    if (this.isRunning) return;
    this.isRunning = true;

    // Fetch live Monterrey weather via Open-Meteo API if not in benchmark mode
    if (!this.isBenchmark) {
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

        if (weather.isRain && !this.eventEngine.getActiveEvents().some((e) => e.event_type === 'rain')) {
          this.eventEngine.addEvent({
            event_id: `evt_meteo_rain_${Date.now()}`,
            event_type: 'rain',
            affected_zones: [
              'Centro / Macroplaza',
              'Centrito Valle',
              'Valle Oriente / Fashion Drive',
              'Plaza Cumbres (Leones)',
              'Tec / DistritoTec',
              'Galerías Monterrey / San Jerónimo',
            ],
            metadata: { multiplier: weather.suggestedSurgeMultiplier, reason: weather.description },
            description: weather.description,
            active: true,
          });
        } else if (
          weather.isExtremeHeat &&
          !this.eventEngine.getActiveEvents().some((e) => e.event_type === 'extreme_heat')
        ) {
          this.eventEngine.addEvent({
            event_id: `evt_meteo_heat_${Date.now()}`,
            event_type: 'extreme_heat',
            affected_zones: [
              'Centro / Macroplaza',
              'Centrito Valle',
              'Valle Oriente / Fashion Drive',
              'Apodaca Centro',
              'Paseo La Fe / Citadel',
              'Escobedo / Plaza Sendero',
            ],
            metadata: { multiplier: weather.suggestedSurgeMultiplier, reason: weather.description },
            description: weather.description,
            active: true,
          });
        }
        this.state.activeEvents = this.eventEngine.getActiveEvents();
      } catch (err) {
        console.warn('[ShiftEngine] Weather fetch error on start:', err);
      }
    }

    await this.tick();

    if (!this.isBenchmark) {
      await setShiftStatus(this.shiftId, 'running').catch(() => {});
      await saveShiftState(this.shiftId, this.state).catch(() => {});

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
    }

    this.scheduleNext();
  }

  private scheduleNext() {
    if (!this.isRunning || this.isFastForwarding) return;
    if (this.state.elapsedMinutes >= this.state.totalMinutes) {
      this.stop();
      return;
    }

    if (this.tickSpeedMs <= 5) {
      this.immediateHandle = setImmediate(async () => {
        this.immediateHandle = null;
        if (!this.isRunning || this.isFastForwarding) return;
        await this.tick();
        this.scheduleNext();
      });
    } else {
      this.timer = setTimeout(async () => {
        this.timer = null;
        if (!this.isRunning || this.isFastForwarding) return;
        await this.tick();
        this.scheduleNext();
      }, this.tickSpeedMs);
    }
  }

  public setTickSpeed(speedMs: number) {
    this.tickSpeedMs = Math.max(0, speedMs);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.immediateHandle) {
      clearImmediate(this.immediateHandle);
      this.immediateHandle = null;
    }
    if (this.isRunning && !this.isFastForwarding) {
      this.scheduleNext();
    }
  }

  public async fastForwardToEnd(): Promise<ShiftState> {
    if (this.isFastForwarding) return this.state;
    this.isFastForwarding = true;
    this.isRunning = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.immediateHandle) {
      clearImmediate(this.immediateHandle);
      this.immediateHandle = null;
    }

    // Wait if a tick is currently running
    while (this.isTicking) {
      await new Promise((r) => setTimeout(r, 10));
    }

    this.isRunning = true;
    while (this.isRunning && this.state.elapsedMinutes < this.state.totalMinutes) {
      await this.tick();
      // Yield briefly to event loop so I/O, SSE, and HTTP requests breathe
      await new Promise((r) => setImmediate(r));
    }
    this.stop();
    this.isFastForwarding = false;
    return this.state;
  }

  public addDisruptionEvent(event: DisruptionEvent) {
    this.eventEngine.addEvent(event);
    this.state.activeEvents = this.eventEngine.getActiveEvents();
  }

  public setDisruptionEvents(events: DisruptionEvent[]) {
    this.eventEngine.setEvents(events);
    this.state.activeEvents = this.eventEngine.getActiveEvents();
  }

  public stop() {
    this.isRunning = false;
    this.isFastForwarding = false;
    if (this.timer) {
      clearTimeout(this.timer);
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.immediateHandle) {
      clearImmediate(this.immediateHandle);
      this.immediateHandle = null;
    }

    // Reset status of all couriers to idle when simulation ends
    this.state.agents.agent_a.status = 'idle';
    this.state.agents.agent_a.activeRoute = [];
    this.state.agents.agent_b.status = 'idle';
    this.state.agents.agent_b.activeRoute = [];
    this.state.agents.baseline.status = 'idle';
    this.state.agents.baseline.activeRoute = [];

    setShiftStatus(this.shiftId, 'stopped').catch(() => {});
    saveShiftState(this.shiftId, this.state).catch(() => {});

    this.subscribers.forEach((cb) => {
      try {
        cb(this.state);
      } catch (_err) {}
    });

    connectDB().then(async (conn) => {
      if (conn) {
        try {
          await Shift.updateOne(
            { shiftId: this.shiftId },
            {
              $set: {
                agentAEarnings: this.state.agents.agent_a.currentEarnings,
                agentBEarnings: this.state.agents.agent_b.currentEarnings,
                baselineEarnings: this.state.agents.baseline.currentEarnings,
                agentAKm: this.state.agents.agent_a.totalKm,
                agentBKm: this.state.agents.agent_b.totalKm,
                baselineKm: this.state.agents.baseline.totalKm,
                status: 'stopped',
              },
            }
          );
        } catch (_err) {}
      }
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
    if (this.isTicking) return;
    if (this.state.elapsedMinutes >= this.state.totalMinutes) {
      this.stop();
      return;
    }

    this.isTicking = true;
    try {
      // 0. Consume pending events queued from other serverless lambdas via Upstash Redis
      if (!this.isBenchmark) {
        try {
          const pendingEvents = await popPendingEvents(this.shiftId);
          if (pendingEvents && pendingEvents.length > 0) {
            for (const pe of pendingEvents) {
              if (!this.state.activeEvents.some((e) => e.event_id === pe.event_id)) {
                this.state.activeEvents.push(pe);
              }
            }
          }
        } catch (_err) {}
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

    // 7. Async persistence & in-memory buffer
    if (!this.isBenchmark) {
      const decisionRecords = [
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
      ];

      this.historicalDecisions.push(...decisionRecords);
      if (this.historicalDecisions.length > 300) {
        this.historicalDecisions.splice(0, this.historicalDecisions.length - 300);
      }

      // Persist current state snapshot to Upstash Redis
      saveShiftState(this.shiftId, this.state).catch(() => {});

      connectDB().then(async (conn) => {
        if (conn) {
          try {
            await Promise.all([
              Decision.create(decisionRecords),
              Shift.updateOne(
                { shiftId: this.shiftId },
                {
                  $set: {
                    agentAEarnings: this.state.agents.agent_a.currentEarnings,
                    agentBEarnings: this.state.agents.agent_b.currentEarnings,
                    baselineEarnings: this.state.agents.baseline.currentEarnings,
                    agentAKm: this.state.agents.agent_a.totalKm,
                    agentBKm: this.state.agents.agent_b.totalKm,
                    baselineKm: this.state.agents.baseline.totalKm,
                    eventsTriggered: this.state.activeEvents.length,
                    status: this.state.tick >= this.state.totalMinutes ? 'completed' : 'active',
                  },
                },
                { upsert: true }
              ),
            ]);
          } catch (_err) {}
        }
      });
    }
    } finally {
      this.isTicking = false;
    }
  }

  private async evaluateDispatch(newOrders: Order[]) {
    if (newOrders.length === 0) return;

    const courierA = this.state.agents.agent_a;
    const courierB = this.state.agents.agent_b;
    const courierBase = this.state.agents.baseline;

    // Platform dispatch cooldown decrement
    if ((courierA.dispatchCooldownTicks || 0) > 0) {
      courierA.dispatchCooldownTicks = courierA.dispatchCooldownTicks! - 1;
    }
    if ((courierB.dispatchCooldownTicks || 0) > 0) {
      courierB.dispatchCooldownTicks = courierB.dispatchCooldownTicks! - 1;
    }
    if ((courierBase.dispatchCooldownTicks || 0) > 0) {
      courierBase.dispatchCooldownTicks = courierBase.dispatchCooldownTicks! - 1;
    }

    // Agent A (Economist): Max capacity = 1 order in bag (selective high-yield)
    if (courierA.carryingOrders.length < 1 && (courierA.dispatchCooldownTicks || 0) === 0) {
      const decA = await getAgentDecision('agent_a', newOrders, courierA, this.state.activeEvents);
      this.state.decisions.agent_a = decA;
      if (decA.accepted.length > 0) {
        courierA.consecutiveSkips = 0;
        const orderId = decA.accepted[0];
        const ord = newOrders.find((o) => o.id === orderId || o.order_id === orderId);
        if (ord && !courierA.carryingOrders.some((o) => o.id === ord.id)) {
          courierA.carryingOrders.push({ ...ord, pickedUp: false, assignedAtTick: this.state.tick });
          await this.initCourierTask(courierA);
        }
      } else {
        courierA.skippedOrders += decA.skipped.length;
        courierA.consecutiveSkips = (courierA.consecutiveSkips || 0) + 1;
        if (courierA.consecutiveSkips >= 4) {
          courierA.dispatchCooldownTicks = 6; // 6-minute platform timeout
          courierA.consecutiveSkips = 0;
        }
      }
    }

    // Agent B (Hustler): Max capacity = 3 orders (OR-Tools multi-drop clustering)
    if (courierB.carryingOrders.length < 3 && (courierB.dispatchCooldownTicks || 0) === 0) {
      const decB = await getAgentDecision('agent_b', newOrders, courierB, this.state.activeEvents);
      this.state.decisions.agent_b = decB;
      if (decB.accepted.length > 0) {
        courierB.consecutiveSkips = 0;
        for (const orderId of decB.accepted) {
          if (courierB.carryingOrders.length >= 3) break;
          const ord = newOrders.find((o) => o.id === orderId || o.order_id === orderId);
          if (ord && !courierB.carryingOrders.some((o) => o.id === ord.id)) {
            courierB.carryingOrders.push({ ...ord, pickedUp: false, assignedAtTick: this.state.tick });
          }
        }
        if (courierB.carryingOrders.length > 0 && !courierB.currentTask) {
          await this.initCourierTask(courierB);
        }
      } else {
        courierB.skippedOrders += decB.skipped.length;
        courierB.consecutiveSkips = (courierB.consecutiveSkips || 0) + 1;
        if (courierB.consecutiveSkips >= 5) {
          courierB.dispatchCooldownTicks = 4;
          courierB.consecutiveSkips = 0;
        }
      }
    }

    // Baseline: Max capacity = 1 (FIFO naive standard)
    if (courierBase.carryingOrders.length < 1 && (courierBase.dispatchCooldownTicks || 0) === 0) {
      const decBase = this.baselineAgent.decide(newOrders);
      this.state.decisions.baseline = decBase;
      if (decBase.accepted.length > 0) {
        courierBase.consecutiveSkips = 0;
        const orderId = decBase.accepted[0];
        const ord = newOrders.find((o) => o.id === orderId || o.order_id === orderId);
        if (ord && !courierBase.carryingOrders.some((o) => o.id === ord.id)) {
          courierBase.carryingOrders.push({ ...ord, pickedUp: false, assignedAtTick: this.state.tick });
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

    // 1. Prioritize picking up all assigned orders first (interleaved multi-drop clustering)
    const unpicked = courier.carryingOrders.filter((o) => !o.pickedUp);

    if (unpicked.length > 0) {
      // Pick nearest pickup
      let bestOrder = unpicked[0];
      let bestDist = haversineKm(
        courier.lat,
        courier.lng,
        bestOrder.pickup.lat,
        bestOrder.pickup.lon || bestOrder.pickup.lng!
      );
      for (let i = 1; i < unpicked.length; i++) {
        const d = haversineKm(
          courier.lat,
          courier.lng,
          unpicked[i].pickup.lat,
          unpicked[i].pickup.lon || unpicked[i].pickup.lng!
        );
        if (d < bestDist) {
          bestDist = d;
          bestOrder = unpicked[i];
        }
      }

      const target = {
        lat: bestOrder.pickup.lat,
        lng: bestOrder.pickup.lon || bestOrder.pickup.lng!,
      };

      courier.status = 'moving_to_pickup';
      const route = await fetchRoute({ lat: courier.lat, lng: courier.lng }, target);
      const prepMin = bestOrder.prep_time_min || 10;
      const waitTicks = Math.max(1, Math.min(3, Math.round(prepMin / 7)));

      courier.currentTask = {
        orderId: bestOrder.id || bestOrder.order_id,
        phase: 'to_pickup',
        target,
        targetName: bestOrder.pickup.zone,
        waitTicksRemaining: waitTicks,
        waypoints: route.waypoints,
        waypointIndex: 0,
        totalRouteKm: route.distanceKm,
      };

      courier.activeRoute =
        route.waypoints && route.waypoints.length > 0
          ? route.waypoints
          : [{ lat: courier.lat, lng: courier.lng }, target];
      return;
    }

    // 2. All carrying orders are in bag -> Deliver to nearest dropoff
    const pickedUpOrders = courier.carryingOrders.filter((o) => o.pickedUp);
    if (pickedUpOrders.length > 0) {
      let bestOrder = pickedUpOrders[0];
      let bestDist = haversineKm(
        courier.lat,
        courier.lng,
        bestOrder.dropoff.lat,
        bestOrder.dropoff.lon || bestOrder.dropoff.lng!
      );
      for (let i = 1; i < pickedUpOrders.length; i++) {
        const d = haversineKm(
          courier.lat,
          courier.lng,
          pickedUpOrders[i].dropoff.lat,
          pickedUpOrders[i].dropoff.lon || pickedUpOrders[i].dropoff.lng!
        );
        if (d < bestDist) {
          bestDist = d;
          bestOrder = pickedUpOrders[i];
        }
      }

      const target = {
        lat: bestOrder.dropoff.lat,
        lng: bestOrder.dropoff.lon || bestOrder.dropoff.lng!,
      };

      courier.status = 'delivering';
      const route = await fetchRoute({ lat: courier.lat, lng: courier.lng }, target);

      courier.currentTask = {
        orderId: bestOrder.id || bestOrder.order_id,
        phase: 'to_dropoff',
        target,
        targetName: bestOrder.dropoff.zone,
        waitTicksRemaining: 0,
        waypoints: route.waypoints,
        waypointIndex: 0,
        totalRouteKm: route.distanceKm,
      };

      courier.activeRoute =
        route.waypoints && route.waypoints.length > 0
          ? route.waypoints
          : [{ lat: courier.lat, lng: courier.lng }, target];
      return;
    }
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
      courier.fuelCostMXN = Math.round(courier.totalKm * 0.70 * 10) / 10;
      courier.netEarnings =
        Math.round((courier.currentEarnings - courier.fuelCostMXN - (courier.penaltiesMXN || 0)) * 10) / 10;
      return;
    }

    // 0. Detectar si el repartidor está dentro de un cierre vial activo
    const activeClosures = (this.state.activeEvents || []).filter(
      (e) => e.event_type === 'road_closure' && e.active && e.lat && e.lon
    );
    const isTrappedInClosure = activeClosures.some(
      (rc) => haversineKm(courier.lat, courier.lng, rc.lat!, rc.lon!) <= (rc.radius_km || 0.8)
    );

    // En cierre vial, la velocidad se reduce drásticamente a 4.0 km/h (embotellamiento detenido)
    let effectiveStepKm = stepKm;
    if (isTrappedInClosure) {
      effectiveStepKm = Math.min(stepKm, 4.0 / 60);
      courier.speedKmh = 4.0;
    }

    // 1. Moving to restaurant / pickup along real street waypoints
    if (task.phase === 'to_pickup') {
      const arrived = this.advanceAlongWaypoints(courier, task, effectiveStepKm);
      if (arrived) {
        task.phase = 'waiting';
        courier.status = 'waiting_at_pickup';
        courier.activeRoute = [];
      } else {
        courier.status = isTrappedInClosure ? 'trapped_in_closure' : 'moving_to_pickup';
      }
    } else if (task.phase === 'waiting' || courier.status === 'waiting_at_pickup') {
      // 2. Waiting at kitchen for preparation (calibrated via Kaggle prep times)
      task.waitTicksRemaining -= 1;
      if (task.waitTicksRemaining <= 0) {
        // Order is ready! Mark as picked up in courier's bag
        const order = courier.carryingOrders.find(
          (o) => o.id === task.orderId || o.order_id === task.orderId
        );
        if (order) {
          order.pickedUp = true;
        }
        // Advance to next stop (another pickup if batched, or dropoff)
        await this.initCourierTask(courier);
      }
    } else if (task.phase === 'to_dropoff') {
      // 3. Delivering order to customer along real street waypoints
      const arrived = this.advanceAlongWaypoints(courier, task, effectiveStepKm);
      if (arrived) {
        // Order Delivered!
        const completedIndex = courier.carryingOrders.findIndex(
          (o) => o.id === task.orderId || o.order_id === task.orderId
        );
        if (completedIndex >= 0) {
          const completedOrder = courier.carryingOrders[completedIndex];
          const assignedTick = completedOrder.assignedAtTick ?? this.state.tick;
          const elapsedDeliveryMinutes = this.state.tick - assignedTick;
          const maxAllowedMinutes = (completedOrder.estimated_time_min || 15) + 12;

          let finalPay = completedOrder.total_pay;
          if (elapsedDeliveryMinutes > maxAllowedMinutes) {
            // Entrega tardía: revocación de propina del cliente y penalización por demora
            const tipRevoked = completedOrder.tip || 0;
            finalPay = Math.max(0, finalPay - tipRevoked);
            courier.penaltiesMXN = Math.round(((courier.penaltiesMXN || 0) + 15.0) * 10) / 10;
            courier.lateDeliveriesCount = (courier.lateDeliveriesCount || 0) + 1;
          }

          courier.currentEarnings =
            Math.round((courier.currentEarnings + finalPay) * 10) / 10;
          courier.completedOrders += 1;

          // Verificar si el pedido tocó una zona de riesgo peligrosa (penalización por incidente)
          const activeUnsafe = (this.state.activeEvents || []).filter(
            (e) => e.event_type === 'unsafe_zone' && e.active && e.lat && e.lon
          );
          const touchedUnsafe = activeUnsafe.some((uz) => {
            const pDist = haversineKm(completedOrder.pickup.lat, completedOrder.pickup.lon, uz.lat!, uz.lon!);
            const dDist = haversineKm(completedOrder.dropoff.lat, completedOrder.dropoff.lon, uz.lat!, uz.lon!);
            return pDist <= (uz.radius_km || 2.0) || dDist <= (uz.radius_km || 2.0);
          });

          if (touchedUnsafe) {
            const penalty = 45.0; // Multa / daño / incidente
            courier.penaltiesMXN = Math.round(((courier.penaltiesMXN || 0) + penalty) * 10) / 10;
            courier.incidentsCount = (courier.incidentsCount || 0) + 1;
          }

          courier.carryingOrders.splice(completedIndex, 1);
        }

        // Check if there are other batched orders to deliver
        await this.initCourierTask(courier);
      } else {
        courier.status = isTrappedInClosure ? 'trapped_in_closure' : 'delivering';
      }
    }

    // Riesgo vial y desgaste mecánico por lluvia torrencial (vados inundados, mojado de motor)
    const hasTorrentialRain =
      (this.state.activeEvents || []).some((e) => e.event_type === 'rain' && e.active) ||
      (this.state.weather?.isRain && (this.state.weather.rainMm || 0) > 8);

    if (hasTorrentialRain) {
      const rainHazardRoll = Math.abs(Math.sin(this.state.tick * 37.19 + courier.lat * 100)) % 1;
      if (rainHazardRoll < 0.02) {
        courier.penaltiesMXN = Math.round(((courier.penaltiesMXN || 0) + 20.0) * 10) / 10;
        courier.incidentsCount = (courier.incidentsCount || 0) + 1;
      }
    }

    // Actualizar costo de combustible ($0.70 MXN / km para motocicleta 125/150cc) y ganancia neta en tiempo real
    courier.fuelCostMXN = Math.round(courier.totalKm * 0.70 * 10) / 10;
    courier.netEarnings =
      Math.round((courier.currentEarnings - courier.fuelCostMXN - (courier.penaltiesMXN || 0)) * 10) / 10;
  }
}
