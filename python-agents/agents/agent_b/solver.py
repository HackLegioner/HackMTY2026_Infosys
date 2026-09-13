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

        # 0. Check active adverse events & filter out hazardous orders (unsafe zones and road closures)
        active_hazards = [
            ev for ev in (events or [])
            if ev.get("type") in ("unsafe_zone", "road_closure") or ev.get("event_type") in ("unsafe_zone", "road_closure")
        ]
        safe_orders = []
        for o in orders:
            in_hazard = False
            for ev in active_hazards:
                e_lat = ev.get("lat")
                e_lon = ev.get("lon")
                rad = float(ev.get("radius_km") or 1.5)
                if e_lat is not None and e_lon is not None:
                    plat, plon = self._extract_coords(o.get("pickup"), lat, lng)
                    dlat, dlon = self._extract_coords(o.get("dropoff"), lat, lng)
                    d1 = math.hypot((plat - e_lat) * 111.0, (plon - e_lon) * 111.0 * 0.9)
                    d2 = math.hypot((dlat - e_lat) * 111.0, (dlon - e_lon) * 111.0 * 0.9)
                    mid_lat = (plat + dlat) / 2
                    mid_lon = (plon + dlon) / 2
                    d3 = math.hypot((mid_lat - e_lat) * 111.0, (mid_lon - e_lon) * 111.0 * 0.9)
                    if d1 <= rad or d2 <= rad or d3 <= (rad * 0.9):
                        in_hazard = True
                        break
            if not in_hazard:
                safe_orders.append(o)

        if len(safe_orders) == 0:
            all_ids = [(o.get("id") or o.get("order_id")) for o in orders]
            return {
                "agent_id": "agent_b",
                "accepted": [],
                "skipped": all_ids,
                "earnings_total": 0.0,
                "reasoning": "Hustler: All orders rejected due to active hazards or road closures in path.",
                "detailed_reasoning": {"candidate_count": 0, "hazards_active": len(active_hazards)},
            }

        candidate_orders = safe_orders

        # 1. Score candidate orders
        scores = self.scorer.score_orders(candidate_orders, lat, lng)

        # 2. Select anchor candidate (highest yield) and cluster nearby compatible orders
        ranked_orders = sorted(zip(candidate_orders, scores), key=lambda x: x[1], reverse=True)
        anchor_order = ranked_orders[0][0]
        anchor_plat, anchor_plon = self._extract_coords(anchor_order.get("pickup"), lat, lng)
        anchor_dlat, anchor_dlon = self._extract_coords(anchor_order.get("dropoff"), lat, lng)

        # Only batch candidates within tight spatial proximity (pickup <= 1.8km, dropoff <= 2.5km)
        clustered_candidates = [anchor_order]
        for ord_tuple in ranked_orders[1:]:
            if len(clustered_candidates) >= 3:
                break
            cand = ord_tuple[0]
            cand_plat, cand_plon = self._extract_coords(cand.get("pickup"), lat, lng)
            cand_dlat, cand_dlon = self._extract_coords(cand.get("dropoff"), lat, lng)

            p_dist = math.hypot((cand_plat - anchor_plat) * 111.0, (cand_plon - anchor_plon) * 111.0 * 0.9)
            d_dist = math.hypot((cand_dlat - anchor_dlat) * 111.0, (cand_dlon - anchor_dlon) * 111.0 * 0.9)

            if p_dist <= 1.8 and d_dist <= 2.5:
                clustered_candidates.append(cand)

        top_candidates = clustered_candidates

        # 3. Run OR-Tools route solver
        try:
            solved_route, accepted_ids = self._solve_vrptw(top_candidates, lat, lng)
        except Exception as e:
            print(f"[OR-Tools Exception] Solver fallback: {e}")
            accepted_ids = [
                (o.get("id") or o.get("order_id"))
                for o in top_candidates
                if float(o.get("payout") or o.get("total_pay", 0)) >= 25
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
            "reasoning": f"Hustler: Batched {len(accepted_ids)} orders via OR-Tools spatial cluster solver.",
            "detailed_reasoning": {
                "strategy": "ortools_spatial_cluster_batch",
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
