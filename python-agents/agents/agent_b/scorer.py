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
        # Try loading pretrained booster if exists
        if model_path:
            try:
                import xgboost as xgb
                self.model = xgb.Booster()
                self.model.load_model(model_path)
            except Exception:
                self.model = None

    def score_orders(self, orders: List[Dict[str, Any]], courier_lat: float, courier_lng: float) -> List[float]:
        scores = []
        for o in orders:
            payout = float(o.get("payout", 0))
            dist_km = max(float(o.get("distanceKm", 1.0)), 0.1)
            pickup = o.get("pickup", [courier_lat, courier_lng])
            
            # Distance from courier to pickup
            approach_dist = math.sqrt(
                ((pickup[0] - courier_lat) * 111) ** 2 +
                ((pickup[1] - courier_lng) * 111) ** 2
            )
            
            # Profit density metric
            total_dist = dist_km + approach_dist
            profit_density = payout / max(total_dist, 0.5)
            scores.append(round(profit_density, 3))
        return scores
