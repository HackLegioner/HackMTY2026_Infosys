import { NextResponse } from 'next/server';
import { getActiveShift } from '@/lib/simulator/shift';
import { connectDB } from '@/lib/db/mongoose';
import { Shift } from '@/lib/db/ShiftModel';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const engine = getActiveShift(id);

  if (engine) {
    return NextResponse.json({
      ok: true,
      source: 'memory',
      state: engine.state,
    });
  }

  // Fallback to database lookup
  try {
    await connectDB();
    const doc = await Shift.findOne({ shiftId: id });
    if (!doc) {
      return NextResponse.json({ error: `Shift ${id} not found` }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      source: 'database',
      shift: doc,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
