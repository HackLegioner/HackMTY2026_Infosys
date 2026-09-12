export type AuditTier = 'public' | 'business' | 'gov';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Order {
  order_id: string;
  id?: string;
  platform: string;
  order_type: string;
  pickup: { lat: number; lon: number; zone: string };
  dropoff: { lat: number; lon: number; zone: string };
  base_pay: number;
  surge_multiplier: number;
  total_pay: number;
  payout?: number;
  pay_per_km: number;
  pay_per_min: number;
  estimated_distance_km: number;
  distanceKm?: number;
  estimated_time_min: number;
  expires_in_seconds: number;
  expireAtTick?: number;
}

export interface DisruptionEvent {
  event_id: string;
  id?: string;
  event_type: 'surge' | 'rain' | 'road_closure' | 'unsafe_zone';
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

export interface CourierState {
  agentId: 'agent_a' | 'agent_b' | 'baseline';
  lat: number;
  lng: number;
  currentEarnings: number;
  totalKm: number;
  completedOrders: number;
  skippedOrders: number;
  activeRoute: Coordinates[];
  status: 'idle' | 'en_route' | 'delivering';
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
}
