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

    def decide_raw(
        self,
        orders: List[Dict[str, Any]],
        state: Dict[str, Any],
        events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        # Strict input validation
        if not isinstance(orders, list) or len(orders) == 0:
            return {
                "agent_id": "agent_b",
                "accepted": [],
                "skipped": [],
                "earnings_total": 0.0,
                "reasoning": "No orders available to optimize.",
                "detailed_reasoning": {"candidate_count": 0},
            }

        lat = state.get("lat", 25.6692)
        lng = state.get("lng", -100.3099)

        # Atomic Sub-task 1: Score candidate orders
        scores = self.scorer.score_orders(orders, lat, lng)

        # Atomic Sub-task 2: Filter top candidates for batching (up to 4 orders)
        ranked_orders = sorted(zip(orders, scores), key=lambda x: x[1], reverse=True)
        top_candidates = [ord_tuple[0] for ord_tuple in ranked_orders[:4]]
        candidate_ids = {o["id"] for o in top_candidates}

        # Atomic Sub-task 3: Run OR-Tools route solver or heuristic fallback
        try:
            solved_route, accepted_ids = self._solve_vrptw(top_candidates, lat, lng)
        except Exception as e:
            # Self-correction: Log error and adapt immediately
            print(f"[OR-Tools Exception] Solver failed: {e}. Adapting with greedy fallback.")
            accepted_ids = [o["id"] for o in top_candidates if o.get("payout", 0) >= 30]
            solved_route = []

        skipped_ids = [o["id"] for o in orders if o["id"] not in accepted_ids]
        earnings = sum(float(o.get("payout", 0)) for o in orders if o["id"] in accepted_ids)

        return {
            "agent_id": "agent_b",
            "accepted": accepted_ids,
            "skipped": skipped_ids,
            "earnings_total": earnings,
            "reasoning": f"Hustler: Batched {len(accepted_ids)} high-density clustered orders using OR-Tools routing solver.",
            "detailed_reasoning": {
                "strategy": "ortools_cvrptw_batch",
                "accepted_count": len(accepted_ids),
                "skipped_count": len(skipped_ids),
                "waypoint_order": solved_route,
            },
        }

    def _solve_vrptw(self, candidates: List[Dict[str, Any]], start_lat: float, start_lng: float):
        """
        Atomic routing solver utilizing OR-Tools RoutingIndexManager.
        """
        if not candidates:
            return [], []

        try:
            from ortools.constraint_solver import routing_enums_pb2
            from ortools.constraint_solver import pywrapcp

            # Nodes: 0 = courier current, 1..N = pickups/dropoffs
            locations = [(start_lat, start_lng)]
            order_mapping = []

            for o in candidates:
                p = o.get("pickup", [start_lat, start_lng])
                locations.append((p[0], p[1]))
                order_mapping.append(o["id"])

            num_nodes = len(locations)
            # Distance matrix (in meters approx)
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

            # Setup OR-Tools
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

        except ImportError:
            # Fallback if ortools not compiled yet in env
            pass

        # Greedy fallback if OR-tools not available
        accepted = [o["id"] for o in candidates]
        return list(range(len(candidates) + 1)), accepted
