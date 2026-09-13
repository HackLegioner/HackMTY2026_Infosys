import { NextResponse } from 'next/server';
import { getActiveShift } from '@/lib/simulator/shift';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const engine = getActiveShift(id);

  if (!engine) {
    return NextResponse.json({ error: `Shift with id ${id} not found` }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { tickSpeedMs, fastForward } = body;

    if (fastForward) {
      const finalState = await engine.fastForwardToEnd();
      return NextResponse.json({
        ok: true,
        message: 'Shift fast-forwarded to end',
        state: finalState,
      });
    }

    if (typeof tickSpeedMs === 'number') {
      engine.setTickSpeed(tickSpeedMs);
      return NextResponse.json({
        ok: true,
        message: `Tick speed updated to ${tickSpeedMs}ms`,
        tickSpeedMs: engine.tickSpeedMs,
        state: engine.state,
      });
    }

    return NextResponse.json({ error: 'Missing tickSpeedMs or fastForward flag' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
