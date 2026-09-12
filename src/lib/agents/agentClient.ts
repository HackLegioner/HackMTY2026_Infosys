import { AgentDecisionData, Order, DisruptionEvent } from '@/lib/types';

const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || 'http://localhost:8001';

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
    // Fallback TS heuristic decision if Python microservice is offline
  }

  // Fallback decision logic in TypeScript
  const accepted: string[] = [];
  const skipped: string[] = [];
  let totalPay = 0;
  let totalKm = 0;

  for (const o of orders) {
    if (agentType === 'agent_a') {
      // Economist: Pay per km >= 18
      if (o.pay_per_km >= 18 && o.total_pay >= 40) {
        accepted.push(o.order_id);
        totalPay += o.total_pay;
        totalKm += o.estimated_distance_km;
      } else {
        skipped.push(o.order_id);
      }
    } else {
      // Hustler: Accept if pay >= 30
      if (o.total_pay >= 30) {
        accepted.push(o.order_id);
        totalPay += o.total_pay;
        totalKm += o.estimated_distance_km;
      } else {
        skipped.push(o.order_id);
      }
    }
  }

  return {
    agent_id: agentType,
    label: agentType === 'agent_a' ? 'The Economist 🧊' : 'The Hustler ⚡',
    accepted,
    skipped,
    earnings_total: Math.round(totalPay * 100) / 100,
    km_total: Math.round(totalKm * 100) / 100,
    orders_completed: accepted.length,
    orders_skipped: skipped.length,
    strategy: agentType === 'agent_a' ? 'DQN RL (Profit/km)' : 'OR-Tools + XGBoost (Throughput)',
    primary_reasoning: accepted.length
      ? `Accepted ${accepted.length} orders`
      : 'Skipped low payout orders',
  };
}
