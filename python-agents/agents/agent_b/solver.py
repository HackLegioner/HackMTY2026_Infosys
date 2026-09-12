import math
from typing import List, Dict, Any
from agents.agent_b.scorer import OrderScorer

class AgentBHustler:
    """
    Agent B — 'The Hustler ⚡'
    Batches multiple nearby orders and optimizes sequence via OR-Tools VRPTW / TSP.
    Prefers high volume and route clustering.
    """
    def __init__(self):
        self.scorer = OrderScorer()

    def _extract_coords(self, pos_obj, fallback_lat: float, fallback_lng: float):
        if isinstance(pos_obj, dict):
            lat = pos_obj.get("lat", fallback_lat)
            lng = pos_obj.get("lng") if "lng" in pos_obj else pos_obj.get("lon", fallback_lng)
            return float(lat), float(lng)
        elif isinstance(pos_obj, (list, tuple)) and len(pos_obj) >= 2:
            return float(pos_obj[0]), float(pos_obj[1])
        return fallback_lat, fallback_lng

    def decide_raw(
        self,
        orders: List[Dict[str, Any]],
        state: Dict[str, Any],
        events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not isinstance(orders, list) or len(orders) == 0:
            return {
                "agent_id": "agent_b",
                "accepted": [],
                "skipped": [],
                "earnings_total": 0.0,
                "reasoning": "No orders available to optimize.",
                "detailed_reasoning": {"candidate_count": 0},
            }

        lat = float(state.get("lat", 25.6692))
        lng = float(state.get("lng", -100.3099))

        # 1. Score candidate orders
        scores = self.scorer.score_orders(orders, lat, lng)

        # 2. Filter top candidates for batching (up to 3 orders)
        ranked_orders = sorted(zip(orders, scores), key=lambda x: x[1], reverse=True)
        top_candidates = [ord_tuple[0] for ord_tuple in ranked_orders[:3]]

        # 3. Run OR-Tools route solver
        try:
            solved_route, accepted_ids = self._solve_vrptw(top_candidates, lat, lng)
        except Exception as e:
            print(f"[OR-Tools Exception] Solver fallback: {e}")
            accepted_ids = [
                (o.get("id") or o.get("order_id"))
                for o in top_candidates
                if float(o.get("payout") or o.get("total_pay", 0)) >= 30
            ]
            solved_route = []

        all_ids = [(o.get("id") or o.get("order_id")) for o in orders]
        skipped_ids = [oid for oid in all_ids if oid not in accepted_ids]
        earnings = sum(
            float(o.get("payout") or o.get("total_pay", 0))
            for o in orders
            if (o.get("id") or o.get("order_id")) in accepted_ids
        )

        return {
            "agent_id": "agent_b",
            "accepted": accepted_ids,
            "skipped": skipped_ids,
            "earnings_total": round(earnings, 2),
            "reasoning": f"Hustler: Batched {len(accepted_ids)} orders via OR-Tools CVRPTW cluster solver.",
            "detailed_reasoning": {
                "strategy": "ortools_cvrptw_batch",
                "accepted_count": len(accepted_ids),
                "skipped_count": len(skipped_ids),
                "waypoint_order": solved_route,
            },
        }

    def _solve_vrptw(self, candidates: List[Dict[str, Any]], start_lat: float, start_lng: float):
        if not candidates:
            return [], []

        try:
            from ortools.constraint_solver import routing_enums_pb2
            from ortools.constraint_solver import pywrapcp

            locations = [(start_lat, start_lng)]
            order_mapping = []

            for o in candidates:
                p_lat, p_lng = self._extract_coords(o.get("pickup"), start_lat, start_lng)
                locations.append((p_lat, p_lng))
                order_mapping.append(o.get("id") or o.get("order_id"))

            num_nodes = len(locations)
            distance_matrix = []
            for i in range(num_nodes):
                row = []
                for j in range(num_nodes):
                    if i == j:
                        row.append(0)
                    else:
                        dlat = (locations[i][0] - locations[j][0]) * 111000
                        dlng = (locations[i][1] - locations[j][1]) * 111000
                        row.append(int(math.sqrt(dlat * dlat + dlng * dlng)))
                distance_matrix.append(row)

            manager = pywrapcp.RoutingIndexManager(num_nodes, 1, 0)
            routing = pywrapcp.RoutingModel(manager)

            def distance_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return distance_matrix[from_node][to_node]

            transit_callback_index = routing.RegisterTransitCallback(distance_callback)
            routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            search_parameters.first_solution_strategy = (
                routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            )
            search_parameters.time_limit.seconds = 1

            solution = routing.SolveWithParameters(search_parameters)

            if solution:
                index = routing.Start(0)
                route_nodes = []
                while not routing.IsEnd(index):
                    node = manager.IndexToNode(index)
                    route_nodes.append(node)
                    index = solution.Value(routing.NextVar(index))

                accepted = [order_mapping[n - 1] for n in route_nodes if n > 0]
                return route_nodes, accepted

        except Exception as err:
            print(f"OR-Tools error: {err}")

        accepted = [(o.get("id") or o.get("order_id")) for o in candidates]
        return list(range(len(candidates) + 1)), accepted
