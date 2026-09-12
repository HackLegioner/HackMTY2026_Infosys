export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getActiveShift } from '@/lib/simulator/shift';
import { getShiftState } from '@/lib/security/redisClient';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 1. In-memory check (fastest, active runner)
  const engine = getActiveShift(id);
  if (engine) {
    return NextResponse.json({
      ok: true,
      source: 'memory',
      state: engine.state,
    });
  }

  // 2. Upstash Redis check (cross-lambda distributed state)
  try {
    const redisState = await getShiftState(id);
    if (redisState) {
      return NextResponse.json({
        ok: true,
        source: 'upstash-redis',
        state: redisState,
      });
    }
  } catch (_err) {}

  // 3. Fallback to MongoDB database lookup
  try {
    const conn = await connectDB();
    if (conn) {
      const doc = await Shift.findOne({ shiftId: id });
      if (doc) {
        return NextResponse.json({
          ok: true,
          source: 'database',
          shift: doc,
          state: {
            shiftId: doc.shiftId,
            tick: doc.durationMin || 480,
            elapsedMinutes: doc.durationMin || 480,
            totalMinutes: doc.durationMin || 480,
            agents: {
              agent_a: {
                agentId: 'agent_a',
                lat: 25.6692,
                lng: -100.3099,
                currentEarnings: doc.agentAEarnings || 0,
                totalKm: doc.agentAKm || 0,
                completedOrders: 0,
                skippedOrders: 0,
                activeRoute: [],
                carryingOrders: [],
                status: 'idle',
              },
              agent_b: {
                agentId: 'agent_b',
                lat: 25.6574,
                lng: -100.3684,
                currentEarnings: doc.agentBEarnings || 0,
                totalKm: doc.agentBKm || 0,
                completedOrders: 0,
                skippedOrders: 0,
                activeRoute: [],
                carryingOrders: [],
                status: 'idle',
              },
              baseline: {
                agentId: 'baseline',
                lat: 25.6866,
                lng: -100.3161,
                currentEarnings: doc.baselineEarnings || 0,
                totalKm: doc.baselineKm || 0,
                completedOrders: 0,
                skippedOrders: 0,
                activeRoute: [],
                carryingOrders: [],
                status: 'idle',
              },
            },
            activeEvents: [],
            newOrders: [],
          },
        });
      }
    }

    return NextResponse.json({ error: `Shift ${id} not found` }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
