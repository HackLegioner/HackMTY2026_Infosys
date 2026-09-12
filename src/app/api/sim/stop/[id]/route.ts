export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getActiveShift, removeShift } from '@/lib/simulator/shift';
import { setShiftStatus, getShiftState, saveShiftState } from '@/lib/security/redisClient';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await setShiftStatus(id, 'stopped').catch(() => {});

  const engine = getActiveShift(id);
  if (engine) {
    const finalState = { ...engine.state };
    removeShift(id);
    await saveShiftState(id, finalState).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `Shift ${id} stopped`,
      finalState,
    });
  }

  // Cross-Lambda fallback: mark stopped in Redis and Mongo
  try {
    const state = await getShiftState(id);
    if (state) {
      state.agents.agent_a.status = 'idle';
      state.agents.agent_b.status = 'idle';
      state.agents.baseline.status = 'idle';
      await saveShiftState(id, state).catch(() => {});
    }

    const conn = await connectDB();
    if (conn) {
      await Shift.updateOne({ shiftId: id }, { $set: { status: 'stopped' } });
    }

    return NextResponse.json({
      ok: true,
      message: `Shift ${id} stopped in cloud state`,
      finalState: state,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to stop shift' }, { status: 500 });
  }
}
