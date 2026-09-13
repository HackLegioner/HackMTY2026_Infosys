import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateShift } from '@/lib/simulator/shift';

const StartShiftSchema = z.object({
  shiftId: z.string().optional(),
  durationMin: z.number().int().min(5).max(1440).default(480),
  seed: z.number().int().default(42),
  tickSpeedMs: z.number().int().min(0).max(10000).default(1000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = StartShiftSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const shiftId = parsed.data.shiftId || `shift_${Date.now()}`;
    const engine = getOrCreateShift(
      shiftId,
      parsed.data.durationMin,
      parsed.data.seed,
      parsed.data.tickSpeedMs
    );

    await engine.start();

    return NextResponse.json({
      ok: true,
      shiftId,
      state: engine.state,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
