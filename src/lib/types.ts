export interface Coordinates {
  lat: number;
  lng: number;
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
  status: 'idle' | 'delivering' | 'rerouting';
}

export interface Order {
  id: string;
  pickup: Coordinates;
  dropoff: Coordinates;
  payout: number;
  distanceKm: number;
  expireAtTick: number;
  status?: 'available' | 'assigned' | 'completed' | 'expired';
}

export interface DisasterEvent {
  id: string;
  type: 'surge' | 'closure' | 'rain';
  description?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  durationTicks?: number;
}

export interface ShiftState {
  shiftId: string;
  currentTick: number;
  totalTicks: number;
  activeEvents: DisasterEvent[];
  orders: Order[];
  agents: {
    agent_a: CourierState;
    agent_b: CourierState;
    baseline: CourierState;
  };
}

export type AuditTier = 'public' | 'business' | 'gov';
