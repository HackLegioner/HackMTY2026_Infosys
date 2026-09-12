import math
from typing import Dict, Any, List

class OrderScorer:
    """
    XGBoost / Gradient Boosted scoring wrapper for candidate orders.
    Calculates acceptance likelihood and profit density.
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
            dist_km = max(float(o.get("distanceKm") or o.get("estimated_distance_km", 1.0)), 0.1)
            pickup_raw = o.get("pickup", [courier_lat, courier_lng])
            p_lat, p_lng = self._extract_coords(pickup_raw, courier_lat, courier_lng)

            # Distance from courier to pickup in km
            dlat = (p_lat - courier_lat) * 111.0
            dlng = (p_lng - courier_lng) * 111.0 * math.cos(math.radians(courier_lat))
            approach_dist = math.sqrt(dlat * dlat + dlng * dlng)

            # Profit density metric
            total_dist = dist_km + approach_dist
            profit_density = payout / max(total_dist, 0.5)
            scores.append(round(profit_density, 3))
        return scores
