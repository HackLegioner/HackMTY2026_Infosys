import { Order, AgentDecisionData } from '@/lib/types';

export class BaselineAgent {
  private totalEarnings = 0;
  private totalKm = 0;
  private completedCount = 0;
  private skippedCount = 0;

  public decide(orders: Order[]): AgentDecisionData {
    const accepted: string[] = [];
    const skipped: string[] = [];

    // Naive FIFO: Accept the first available order only
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (i === 0) {
        accepted.push(order.order_id);
        this.totalEarnings += order.total_pay;
        this.totalKm += order.estimated_distance_km;
        this.completedCount += 1;
      } else {
        skipped.push(order.order_id);
        this.skippedCount += 1;
      }
    }

    return {
      agent_id: 'baseline',
      label: 'Traditional App Baseline 📱',
      accepted,
      skipped,
      earnings_total: Math.round(this.totalEarnings * 100) / 100,
      km_total: Math.round(this.totalKm * 100) / 100,
      orders_completed: this.completedCount,
      orders_skipped: this.skippedCount,
      strategy: 'Naive FIFO (Traditional Delivery App)',
      primary_reasoning: accepted.length
        ? 'Accepted first available order (no spatial optimization)'
        : 'No orders available',
    };
  }

  public reset() {
    this.totalEarnings = 0;
    this.totalKm = 0;
    this.completedCount = 0;
    this.skippedCount = 0;
  }
}
