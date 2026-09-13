import os
import math
from typing import List, Dict, Any

def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return 2 * r * math.asin(math.sqrt(a))

def _is_in_hazard(ord_item, event):
    e_lat = event.get("lat")
    e_lon = event.get("lon")
    radius = float(event.get("radius_km") or 1.0)
    if e_lat is None or e_lon is None:
        return False
    p = ord_item.get("pickup", {})
    d = ord_item.get("dropoff", {})
    plat = float(p.get("lat", 0)) if isinstance(p, dict) else (float(p[0]) if isinstance(p, (list, tuple)) and len(p) > 0 else 0)
    plon = float(p.get("lon") or p.get("lng", 0)) if isinstance(p, dict) else (float(p[1]) if isinstance(p, (list, tuple)) and len(p) > 1 else 0)
    dlat = float(d.get("lat", 0)) if isinstance(d, dict) else (float(d[0]) if isinstance(d, (list, tuple)) and len(d) > 0 else 0)
    dlon = float(d.get("lon") or d.get("lng", 0)) if isinstance(d, dict) else (float(d[1]) if isinstance(d, (list, tuple)) and len(d) > 1 else 0)
    if plat == 0 or dlat == 0:
        return False
    if _haversine_km(plat, plon, e_lat, e_lon) <= radius:
        return True
    if _haversine_km(dlat, dlon, e_lat, e_lon) <= radius:
        return True
    return _haversine_km((plat+dlat)/2, (plon+dlon)/2, e_lat, e_lon) <= (radius * 0.9)

class AgentAEconomist:
    """
    Agent A — 'The Economist'
    Maximizes net earnings per km using DQN / profit-density policy.
    Rejects low-margin orders, evades hazards/closures, seeks surge zones.
    """
    def __init__(self, weights_path: str = None):
        self.weights_path = weights_path or os.path.join(
            os.path.dirname(__file__), "weights", "dqn_courier.zip"
        )
        self.min_efficiency_threshold = 9.0  # MXN per door-to-door km (approach + delivery)

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

        surge_active = any(ev.get("type") == "surge" or ev.get("event_type") == "surge" for ev in events)
        rain_active = any(ev.get("type") == "rain" or ev.get("event_type") == "rain" for ev in events)
        active_closures = [ev for ev in events if ev.get("type") == "road_closure" or ev.get("event_type") == "road_closure"]
        active_unsafe = [ev for ev in events if ev.get("type") == "unsafe_zone" or ev.get("event_type") == "unsafe_zone"]

        courier_lat = float(state.get("lat") or 25.6692)
        courier_lng = float(state.get("lng") or state.get("lon") or -100.3099)

        base_threshold = 11.5 if rain_active else self.min_efficiency_threshold
        threshold = base_threshold * (1.25 if surge_active else 1.0)

        for ord_item in orders:
            order_id = ord_item.get("id") or ord_item.get("order_id", "unknown")
            payout = float(ord_item.get("payout") or ord_item.get("total_pay", 0.0))
            dist_km = max(float(ord_item.get("distanceKm") or ord_item.get("estimated_distance_km", 1.0)), 0.5)

            # Deadhead approach distance from courier to restaurant pickup
            p = ord_item.get("pickup", {})
            plat = float(p.get("lat", 0)) if isinstance(p, dict) else (float(p[0]) if isinstance(p, (list, tuple)) and len(p) > 0 else 0)
            plon = float(p.get("lon") or p.get("lng", 0)) if isinstance(p, dict) else (float(p[1]) if isinstance(p, (list, tuple)) and len(p) > 1 else 0)
            approach_km = _haversine_km(courier_lat, courier_lng, plat, plon) if plat != 0 else 0.5
            total_dist_km = dist_km + approach_km

            # Evade unsafe zone
            if any(_is_in_hazard(ord_item, ev) for ev in active_unsafe):
                skipped.append(order_id)
                reasoning_details.append({"order_id": order_id, "action": "SKIP", "reason": "UNSAFE_ZONE_EVADED"})
                continue

            # Evade road closure
            if any(_is_in_hazard(ord_item, ev) for ev in active_closures):
                skipped.append(order_id)
                reasoning_details.append({"order_id": order_id, "action": "SKIP", "reason": "ROAD_CLOSURE_EVADED"})
                continue

            # True door-to-door profit density
            efficiency = payout / total_dist_km

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
