import { ShiftState, CourierState, DisasterEvent } from '@/lib/types';
import { generateOrders } from './orderStream';
import { createEventFromPreset } from './events';
import { decideBaseline } from './baseline';
import { getAgentDecision } from '@/lib/agents/agentClient';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';
import { Decision } from '@/lib/db/DecisionModel';

type StateSubscriber = (state: ShiftState) => void;

export class ShiftEngine {
  public state: ShiftState;
  private intervalTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<StateSubscriber> = new Set();
  private isRunning: boolean = false;

  constructor(shiftId: string, durationTicks: number = 60, _seed: number = 42) {
    this.state = {
      shiftId,
      currentTick: 0,
      totalTicks: durationTicks,
      activeEvents: [],
      orders: [],
      agents: {
        agent_a: this.createInitialCourier('agent_a', 25.6692, -100.3099),
        agent_b: this.createInitialCourier('agent_b', 25.6514, -100.3235),
        baseline: this.createInitialCourier('baseline', 25.6766, -100.3444),
      },
    };
  }

  private createInitialCourier(
    agentId: 'agent_a' | 'agent_b' | 'baseline',
    lat: number,
    lng: number
  ): CourierState {
    return {
      agentId,
      lat,
      lng,
      currentEarnings: 0,
      totalKm: 0,
      completedOrders: 0,
      skippedOrders: 0,
      activeRoute: [{ lat, lng }],
      status: 'idle',
    };
  }

  public subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    for (const sub of this.subscribers) {
      try {
        sub(this.state);
      } catch (err) {
        console.error('[ShiftEngine] Subscriber notification error:', err);
      }
    }
  }

  public triggerEvent(presetIndex: number = 0): DisasterEvent {
    const event = createEventFromPreset(presetIndex);
    this.state.activeEvents.push(event);
    this.notify();
    return event;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial batch of orders
    this.state.orders = generateOrders(this.state.currentTick, 4);
    this.notify();

    // Tick loop (1 tick per second)
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
  }

  private async tick(): Promise<void> {
    if (this.state.currentTick >= this.state.totalTicks) {
      this.stop();
      this.persistFinalShift();
      return;
    }

    this.state.currentTick += 1;

    // Expire old events
    this.state.activeEvents = this.state.activeEvents.filter((ev) => {
      if (!ev.durationTicks) return true;
      ev.durationTicks -= 1;
      return ev.durationTicks > 0;
    });

    // Generate new orders and filter expired ones
    const newOrders = generateOrders(this.state.currentTick, 2);
    const existingOrders = this.state.orders.filter(
      (o) => o.expireAtTick > this.state.currentTick && o.status === 'available'
    );
    this.state.orders = [...existingOrders, ...newOrders];

    // Run decisions in parallel for all 3 agents
    const availableOrders = [...this.state.orders];

    const [decisionA, decisionB, decisionBase] = await Promise.all([
      getAgentDecision('agent_a', availableOrders, this.state.agents.agent_a, this.state.activeEvents),
      getAgentDecision('agent_b', availableOrders, this.state.agents.agent_b, this.state.activeEvents),
      Promise.resolve(decideBaseline(availableOrders, this.state.agents.baseline)),
    ]);

    // Apply Agent A updates
    this.applyAgentDecision('agent_a', decisionA.accepted, decisionA.skipped, availableOrders);

    // Apply Agent B updates
    this.applyAgentDecision('agent_b', decisionB.accepted, decisionB.skipped, availableOrders);

    // Apply Baseline updates
    this.applyAgentDecision('baseline', decisionBase.accepted, decisionBase.skipped, availableOrders);

    // Persist decisions asynchronously (non-blocking)
    this.recordDecisionAsync(decisionA, decisionB, decisionBase);

    this.notify();
  }

  private applyAgentDecision(
    agentId: 'agent_a' | 'agent_b' | 'baseline',
    acceptedIds: string[],
    skippedIds: string[],
    availableOrders: any[]
  ) {
    const courier = this.state.agents[agentId];
    courier.skippedOrders += skippedIds.length;

    let tickPayout = 0;
    let tickDistance = 0;

    for (const id of acceptedIds) {
      const order = availableOrders.find((o) => o.id === id);
      if (order) {
        tickPayout += order.payout;
        tickDistance += order.distanceKm;
        courier.completedOrders += 1;
        // Move courier to dropoff
        courier.lat = order.dropoff.lat;
        courier.lng = order.dropoff.lng;
        courier.activeRoute = [order.pickup, order.dropoff];
      }
    }

    courier.currentEarnings += tickPayout;
    courier.totalKm = Number((courier.totalKm + tickDistance).toFixed(2));
    courier.status = acceptedIds.length > 0 ? 'delivering' : 'idle';
  }

  private async recordDecisionAsync(decisionA: any, decisionB: any, decisionBase: any) {
    try {
      const db = await connectDB();
      if (!db) return;

      await Decision.insertMany(
        [
          {
            shiftId: this.state.shiftId,
            tick: this.state.currentTick,
            agentId: 'agent_a',
            accepted: decisionA.accepted.length,
            skipped: decisionA.skipped.length,
            reasoning: decisionA.reasoning,
            payload: decisionA.detailed_reasoning,
          },
          {
            shiftId: this.state.shiftId,
            tick: this.state.currentTick,
            agentId: 'agent_b',
            accepted: decisionB.accepted.length,
            skipped: decisionB.skipped.length,
            reasoning: decisionB.reasoning,
            payload: decisionB.detailed_reasoning,
          },
          {
            shiftId: this.state.shiftId,
            tick: this.state.currentTick,
            agentId: 'baseline',
            accepted: decisionBase.accepted.length,
            skipped: decisionBase.skipped.length,
            reasoning: decisionBase.reasoning,
            payload: { model: 'FIFO Baseline Standard' },
          },
        ],
        { ordered: false }
      );
    } catch {
      // Non-fatal if DB is unavailable in dev
    }
  }

  private async persistFinalShift() {
    try {
      const db = await connectDB();
      if (!db) return;

      await Shift.findOneAndUpdate(
        { shiftId: this.state.shiftId },
        {
          shiftId: this.state.shiftId,
          durationMin: Math.round(this.state.totalTicks / 60),
          agentAEarnings: this.state.agents.agent_a.currentEarnings,
          agentBEarnings: this.state.agents.agent_b.currentEarnings,
          baselineEarnings: this.state.agents.baseline.currentEarnings,
          agentAKm: this.state.agents.agent_a.totalKm,
          agentBKm: this.state.agents.agent_b.totalKm,
          eventsTriggered: this.state.activeEvents.length,
        },
        { upsert: true }
      );
    } catch {
      // Non-fatal
    }
  }
}

// In-memory registry of active shifts attached to globalThis for Next.js dev server singleton
const globalForShifts = globalThis as unknown as {
  activeShifts: Map<string, ShiftEngine> | undefined;
};

const activeShifts = globalForShifts.activeShifts ?? new Map<string, ShiftEngine>();
globalForShifts.activeShifts = activeShifts;

export function getOrCreateShift(
  shiftId: string,
  durationMin: number = 60,
  seed: number = 42
): ShiftEngine {
  let engine = activeShifts.get(shiftId);
  if (!engine) {
    engine = new ShiftEngine(shiftId, durationMin, seed);
    activeShifts.set(shiftId, engine);
  }
  return engine;
}

export function getActiveShift(shiftId: string): ShiftEngine | undefined {
  return activeShifts.get(shiftId);
}

export function removeShift(shiftId: string): void {
  const engine = activeShifts.get(shiftId);
  if (engine) {
    engine.stop();
    activeShifts.delete(shiftId);
  }
}
