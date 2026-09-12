import { Order, CourierState } from '@/lib/types';

export interface BaselineDecision {
  accepted: string[];
  skipped: string[];
  reasoning: string;
}

export function decideBaseline(orders: Order[], _courier: CourierState): BaselineDecision {
  if (orders.length === 0) {
    return {
      accepted: [],
      skipped: [],
      reasoning: 'No active orders available on standard app queue.',
    };
  }

  // Naive FIFO: Accept only the first order in queue, regardless of profitability or distance
  const first = orders[0];
  const accepted = [first.id];
  const skipped = orders.slice(1).map((o) => o.id);

  return {
    accepted,
    skipped,
    reasoning: `Traditional App: FIFO auto-assigned first dispatched order ${first.id} ($${first.payout} MXN, ${first.distanceKm}km).`,
  };
}
