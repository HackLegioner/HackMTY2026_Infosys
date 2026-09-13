export type AuditTier = 'public' | 'business' | 'gov';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Order {
  order_id: string;
  id: string;
  platform: string;
  order_type: string;
  restaurant_name?: string;
  food_icon?: string;
  ticket_mxn?: number;
  municipality?: string;
  food_type?: 'snack' | 'fast_food' | 'casual_dining' | 'groceries' | 'buffet_gourmet';
  prep_time_min?: number;
  traffic_density?: 'low' | 'medium' | 'high' | 'jam';
  tip?: number;
  pickup: { lat: number; lon: number; lng?: number; zone: string; name?: string };
  dropoff: { lat: number; lon: number; lng?: number; zone: string; name?: string };
  base_pay: number;
  surge_multiplier: number;
  total_pay: number;
  payout: number;
  pay_per_km: number;
  pay_per_min: number;
  estimated_distance_km: number;
  distanceKm: number;
  estimated_time_min: number;
  expires_in_seconds: number;
  expireAtTick?: number;
  pickedUp?: boolean;
  assignedAtTick?: number;
}

export interface DisruptionEvent {
  event_id: string;
  id?: string;
  event_type: 'surge' | 'rain' | 'road_closure' | 'unsafe_zone' | 'extreme_heat' | 'rush_hour';
  type?: string;
  lat?: number;
  lon?: number;
  radius_km?: number;
  affected_zones: string[];
  metadata: Record<string, any>;
  description: string;
  active: boolean;
}

export type DisasterEvent = DisruptionEvent;

export interface CourierStop {
  type: 'pickup' | 'dropoff';
  orderId: string;
  target: Coordinates;
  targetName: string;
  waitTicksRemaining: number;
  waypoints?: Coordinates[];
  waypointIndex?: number;
  totalRouteKm?: number;
}

export interface CourierTask {
  orderId: string;
  phase: 'to_pickup' | 'waiting' | 'to_dropoff';
  target: Coordinates;
  targetName: string;
  waitTicksRemaining: number;
  waypoints?: Coordinates[];
  waypointIndex?: number;
  totalRouteKm?: number;
  stopQueue?: CourierStop[];
}

export interface CourierState {
  agentId: 'agent_a' | 'agent_b' | 'baseline';
  lat: number;
  lng: number;
  currentEarnings: number;
  totalKm: number;
  completedOrders: number;
  skippedOrders: number;
  activeRoute: Coordinates[];
  carryingOrders: Order[];
  currentTask?: CourierTask;
  status: 'idle' | 'moving_to_pickup' | 'waiting_at_pickup' | 'delivering' | 'trapped_in_closure';
  speedKmh?: number;
  corridorName?: string;
  penaltiesMXN?: number;
  fuelCostMXN?: number;
  netEarnings?: number;
  incidentsCount?: number;
  consecutiveSkips?: number;
  dispatchCooldownTicks?: number;
  lateDeliveriesCount?: number;
}

export interface AgentDecisionData {
  agent_id: string;
  label?: string;
  accepted: string[];
  skipped: string[];
  earnings_total: number;
  km_total: number;
  orders_completed: number;
  orders_skipped: number;
  strategy: string;
  primary_reasoning: string;
  detailed_reasoning?: Record<string, any>;
  profit_per_km?: number;
  penalties_total?: number;
  net_earnings_total?: number;
}

export interface ShiftState {
  shiftId: string;
  tick: number;
  elapsedMinutes: number;
  totalMinutes: number;
  agents: {
    agent_a: CourierState;
    agent_b: CourierState;
    baseline: CourierState;
  };
  activeEvents: DisruptionEvent[];
  newOrders: Order[];
  decisions: {
    agent_a: AgentDecisionData;
    agent_b: AgentDecisionData;
    baseline: AgentDecisionData;
  };
  weather?: {
    temperature: number;
    rainMm: number;
    condition: string;
    isRain: boolean;
    isExtremeHeat: boolean;
    description: string;
  };
  traffic?: {
    formattedTime: string;
    isRushHour: boolean;
    averageSpeedKmh: number;
    congestionLevel: string;
  };
}
