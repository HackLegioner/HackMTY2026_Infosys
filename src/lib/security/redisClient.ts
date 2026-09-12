import { ShiftState, DisruptionEvent } from '@/lib/types';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Local in-memory fallback cache for when Redis credentials are not configured
const inMemoryStore = new Map<string, { value: any; expiresAt: number }>();
const inMemoryQueues = new Map<string, any[]>();

export interface RedisPingResult {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

async function executeCommand<T = any>(command: any[]): Promise<T | null> {
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command]),
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      return (data[0]?.result ?? null) as T;
    }
  } catch (err) {
    // Network or timeout failure; caller will fall back
  }
  return null;
}

export async function pingRedis(): Promise<RedisPingResult> {
  const start = Date.now();
  if (!url || !token) {
    return { ok: false, latencyMs: 0, message: 'Upstash credentials missing' };
  }

  try {
    const result = await executeCommand<string>(['PING']);
    const latencyMs = Date.now() - start;
    if (result === 'PONG') {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, message: `Unexpected response: ${result}` };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

/**
 * Save current shift state into Upstash Redis with a TTL (default 2 hours).
 */
export async function saveShiftState(
  shiftId: string,
  state: ShiftState,
  ttlSeconds: number = 7200
): Promise<boolean> {
  const key = `courier:shift:${shiftId}:state`;
  const serialized = JSON.stringify(state);

  // 1. Update in-memory fallback
  inMemoryStore.set(key, {
    value: state,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  // 2. Persist to Upstash Redis
  const res = await executeCommand<string>(['SET', key, serialized, 'EX', ttlSeconds]);
  return res === 'OK';
}

/**
 * Retrieve active shift state from Upstash Redis, falling back to in-memory store.
 */
export async function getShiftState(shiftId: string): Promise<ShiftState | null> {
  const key = `courier:shift:${shiftId}:state`;

  // 1. Try Upstash Redis
  const raw = await executeCommand<string>(['GET', key]);
  if (raw) {
    try {
      return JSON.parse(raw) as ShiftState;
    } catch (_err) {}
  }

  // 2. Fallback to in-memory store
  const mem = inMemoryStore.get(key);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.value as ShiftState;
  }

  return null;
}

/**
 * Queue a manual disruption event to be consumed by the simulation engine on its next tick.
 */
export async function queueDisasterEvent(
  shiftId: string,
  event: DisruptionEvent
): Promise<boolean> {
  const key = `courier:shift:${shiftId}:events`;
  const serialized = JSON.stringify(event);

  // In-memory fallback
  const queue = inMemoryQueues.get(key) || [];
  queue.push(event);
  inMemoryQueues.set(key, queue);

  // Upstash Redis RPUSH + EXPIRE 2 hours
  if (url && token) {
    try {
      await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['RPUSH', key, serialized],
          ['EXPIRE', key, 7200],
        ]),
        signal: AbortSignal.timeout(1500),
      });
      return true;
    } catch (_err) {}
  }

  return true;
}

/**
 * Pop and clear all pending disruption events for this shift.
 */
export async function popPendingEvents(shiftId: string): Promise<DisruptionEvent[]> {
  const key = `courier:shift:${shiftId}:events`;
  const events: DisruptionEvent[] = [];

  // 1. Try Upstash Redis
  if (url && token) {
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['LRANGE', key, 0, -1],
          ['DEL', key],
        ]),
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data = await res.json();
        const rawList = data[0]?.result;
        if (Array.isArray(rawList)) {
          for (const item of rawList) {
            try {
              events.push(typeof item === 'string' ? JSON.parse(item) : item);
            } catch (_err) {}
          }
        }
      }
    } catch (_err) {}
  }

  // 2. Include any in-memory fallback events
  const memQueue = inMemoryQueues.get(key);
  if (memQueue && memQueue.length > 0) {
    events.push(...memQueue);
    inMemoryQueues.delete(key);
  }

  return events;
}

/**
 * Set shift status ('running' | 'stopped' | 'completed').
 */
export async function setShiftStatus(
  shiftId: string,
  status: 'running' | 'stopped' | 'completed'
): Promise<boolean> {
  const key = `courier:shift:${shiftId}:status`;
  inMemoryStore.set(key, { value: status, expiresAt: Date.now() + 86400 * 1000 });
  const res = await executeCommand<string>(['SET', key, status, 'EX', 86400]);
  return res === 'OK';
}

/**
 * Get shift status.
 */
export async function getShiftStatus(shiftId: string): Promise<string | null> {
  const key = `courier:shift:${shiftId}:status`;
  const raw = await executeCommand<string>(['GET', key]);
  if (raw) return raw;

  const mem = inMemoryStore.get(key);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.value as string;
  }
  return null;
}
