import { ShiftState, CourierState } from '@/lib/types';
import { OrderStream } from './orderStream';
import { EventEngine } from './events';
import { BaselineAgent } from './baseline';
import { getAgentDecision } from '@/lib/agents/agentClient';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';

const shiftsMap = new Map<string, ShiftEngine>();

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

export class ShiftEngine {
  public shiftId: string;
  public durationMin: number;
  public seed: number;
  public state: ShiftState;
  private orderStream: OrderStream;
  private eventEngine: EventEngine;
  private baselineAgent: BaselineAgent;
  private timer: NodeJS.Timeout | null = null;
  private subscribers: Array<(state: ShiftState) => void> = [];

  constructor(shiftId: string, durationMin: number = 60, seed: number = 42) {
    this.shiftId = shiftId;
    this.durationMin = durationMin;
    this.seed = seed;
    this.orderStream = new OrderStream(seed);
    this.eventEngine = new EventEngine();
    this.baselineAgent = new BaselineAgent();

    const initialCourier = (agentId: 'agent_a' | 'agent_b' | 'baseline'): CourierState => ({
      agentId,
      lat: 25.6692,
      lng: -100.3099,
      currentEarnings: 0,
      totalKm: 0,
      completedOrders: 0,
      skippedOrders: 0,
      activeRoute: [],
      status: 'idle',
    });

    this.state = {
      shiftId,
      tick: 0,
      elapsedMinutes: 0,
      totalMinutes: durationMin,
      agents: {
        agent_a: initialCourier('agent_a'),
        agent_b: initialCourier('agent_b'),
        baseline: initialCourier('baseline'),
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
          primary_reasoning: 'Initializing agent...',
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
          primary_reasoning: 'Initializing agent...',
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
          primary_reasoning: 'Initializing benchmark...',
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

    const newOrders = this.orderStream.generateTick(
      this.state.elapsedMinutes * 60,
      this.state.activeEvents
    );
    this.state.newOrders = newOrders;
    this.state.activeEvents = this.eventEngine.getActiveEvents();

    const [decA, decB] = await Promise.all([
      getAgentDecision('agent_a', newOrders, this.state, this.state.activeEvents),
      getAgentDecision('agent_b', newOrders, this.state, this.state.activeEvents),
    ]);
    const decBase = this.baselineAgent.decide(newOrders);

    this.state.decisions = {
      agent_a: decA,
      agent_b: decB,
      baseline: decBase,
    };

    this.updateCourier('agent_a', decA, newOrders);
    this.updateCourier('agent_b', decB, newOrders);
    this.updateCourier('baseline', decBase, newOrders);

    // Notify subscribers (SSE stream)
    this.subscribers.forEach((cb) => cb(this.state));

    connectDB().then(async (conn) => {
      if (conn) {
        try {
          await Decision.create([
            {
              shiftId: this.shiftId,
              tick: this.state.tick,
              agentId: 'agent_a',
              accepted: decA.accepted.length,
              skipped: decA.skipped.length,
              reasoning: decA.primary_reasoning,
              payload: decA,
            },
            {
              shiftId: this.shiftId,
              tick: this.state.tick,
              agentId: 'agent_b',
              accepted: decB.accepted.length,
              skipped: decB.skipped.length,
              reasoning: decB.primary_reasoning,
              payload: decB,
            },
            {
              shiftId: this.shiftId,
              tick: this.state.tick,
              agentId: 'baseline',
              accepted: decBase.accepted.length,
              skipped: decBase.skipped.length,
              reasoning: decBase.primary_reasoning,
              payload: decBase,
            },
          ]);
        } catch (_err) {}
      }
    });
  }

  private updateCourier(agentKey: 'agent_a' | 'agent_b' | 'baseline', dec: any, newOrders: any[]) {
    const courier = this.state.agents[agentKey];
    courier.currentEarnings = dec.earnings_total;
    courier.totalKm = dec.km_total;
    courier.completedOrders = dec.orders_completed;
    courier.skippedOrders = dec.orders_skipped;

    if (dec.accepted && dec.accepted.length > 0) {
      const acceptedOrder = newOrders.find((o) => o.order_id === dec.accepted[0]);
      if (acceptedOrder) {
        courier.lat = acceptedOrder.dropoff.lat;
        courier.lng = acceptedOrder.dropoff.lon;
        courier.activeRoute = [
          { lat: acceptedOrder.pickup.lat, lng: acceptedOrder.pickup.lon },
          { lat: acceptedOrder.dropoff.lat, lng: acceptedOrder.dropoff.lon },
        ];
        courier.status = 'delivering';
      }
    } else {
      courier.status = 'idle';
      courier.activeRoute = [];
    }
  }
}
