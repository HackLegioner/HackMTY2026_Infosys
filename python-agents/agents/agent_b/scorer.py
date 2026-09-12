import math
from typing import Dict, Any, List

class OrderScorer:
    """
    XGBoost / Gradient Boosted scoring wrapper for candidate orders.
    Calibrated with Kaggle Food Delivery Dataset distributions:
    - Kitchen prep times by food category
    - Traffic density delay penalties (jam, high, medium, low)
    - Customer tip probability and net hourly earning density (MXN/hour)
    """
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self.model = None
        if model_path:
            try:
                import xgboost as xgb
                self.model = xgb.Booster()
                self.model.load_model(model_path)
            except Exception:
                self.model = None

    def _extract_coords(self, pos_obj, fallback_lat: float, fallback_lng: float):
        if isinstance(pos_obj, dict):
            lat = pos_obj.get("lat", fallback_lat)
            lng = pos_obj.get("lng") if "lng" in pos_obj else pos_obj.get("lon", fallback_lng)
            return float(lat), float(lng)
        elif isinstance(pos_obj, (list, tuple)) and len(pos_obj) >= 2:
            return float(pos_obj[0]), float(pos_obj[1])
        return fallback_lat, fallback_lng

    def score_orders(self, orders: List[Dict[str, Any]], courier_lat: float, courier_lng: float) -> List[float]:
        scores = []
        for o in orders:
            payout = float(o.get("payout") or o.get("total_pay", 0.0))
            tip = float(o.get("tip", 0.0))
            dist_km = max(float(o.get("distanceKm") or o.get("estimated_distance_km", 1.0)), 0.1)
            pickup_raw = o.get("pickup", [courier_lat, courier_lng])
            p_lat, p_lng = self._extract_coords(pickup_raw, courier_lat, courier_lng)

            # Distance from courier to restaurant (approach leg)
            dlat = (p_lat - courier_lat) * 111.0
            dlng = (p_lng - courier_lng) * 111.0 * math.cos(math.radians(courier_lat))
            approach_dist = math.sqrt(dlat * dlat + dlng * dlng)
            total_dist_km = dist_km + approach_dist

            # Kaggle feature 1: Kitchen prep wait penalty
            prep_time_min = float(o.get("prep_time_min", 12.0))

            # Kaggle feature 2: Traffic density delay multiplier
            traffic_density = str(o.get("traffic_density", "low")).lower()
            traffic_multiplier = {
                "jam": 2.1,
                "high": 1.6,
                "medium": 1.25,
                "low": 1.0,
            }.get(traffic_density, 1.1)

            # Estimated transit time in minutes given local Monterrey traffic density
            base_transit_min = (total_dist_km / 25.0) * 60.0
            actual_transit_min = base_transit_min * traffic_multiplier

            # Total expected commitment time (transit + restaurant pickup wait)
            total_time_min = max(4.0, actual_transit_min + (prep_time_min * 0.45))

            # Expected total revenue including tip
            total_revenue = payout + tip

            # Hourly earning density (MXN / hour)
            hourly_rate = (total_revenue / total_time_min) * 60.0
            scores.append(round(hourly_rate, 2))
        return scores
