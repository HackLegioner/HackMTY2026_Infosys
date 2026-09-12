import os
from typing import List, Dict, Any

class AgentAEconomist:
    """
    Agent A — 'The Economist 🧊'
    Maximizes net earnings per km using DQN / profit-density policy.
    Rejects low-margin orders, seeks surge zones.
    """
    def __init__(self, weights_path: str = None):
        self.weights_path = weights_path or os.path.join(
            os.path.dirname(__file__), "weights", "dqn_courier.zip"
        )
        self.min_efficiency_threshold = 16.0  # MXN per km

    def decide_raw(
        self,
        orders: List[Dict[str, Any]],
        state: Dict[str, Any],
        events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not isinstance(orders, list):
            orders = []
        if not isinstance(state, dict):
            state = {}
        if not isinstance(events, list):
            events = []

        accepted = []
        skipped = []
        earnings_sum = 0.0
        reasoning_details = []

        # Analyze surge influence
        surge_active = any(ev.get("type") == "surge" or ev.get("event_type") == "surge" for ev in events)

        for ord_item in orders:
            order_id = ord_item.get("id") or ord_item.get("order_id", "unknown")
            payout = float(ord_item.get("payout") or ord_item.get("total_pay", 0.0))
            dist_km = max(float(ord_item.get("distanceKm") or ord_item.get("estimated_distance_km", 1.0)), 0.5)

            efficiency = payout / dist_km
            threshold = self.min_efficiency_threshold * (1.3 if surge_active else 1.0)

            # Only accept 1 high-value order at a time (selective philosophy)
            if efficiency >= threshold and len(accepted) < 1:
                accepted.append(order_id)
                earnings_sum += payout
                reasoning_details.append({
                    "order_id": order_id,
                    "action": "ACCEPT",
                    "efficiency_mxn_km": round(efficiency, 2),
                    "threshold": round(threshold, 2),
                    "payout": payout
                })
            else:
                skipped.append(order_id)
                reasoning_details.append({
                    "order_id": order_id,
                    "action": "SKIP",
                    "efficiency_mxn_km": round(efficiency, 2),
                    "threshold": round(threshold, 2),
                    "payout": payout
                })

        summary = (
            f"Economist: Accepted {len(accepted)} high-efficiency order(s) (≥{self.min_efficiency_threshold:.1f} MXN/km). "
            f"Skipped {len(skipped)} lower-margin candidates."
        )

        return {
            "agent_id": "agent_a",
            "accepted": accepted,
            "skipped": skipped,
            "earnings_total": round(earnings_sum, 2),
            "reasoning": summary,
            "detailed_reasoning": {
                "strategy": "dqn_profit_density",
                "surge_multiplier_applied": surge_active,
                "decisions": reasoning_details,
            },
        }
