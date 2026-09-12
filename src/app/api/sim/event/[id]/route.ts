import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveShift } from '@/lib/simulator/shift';

const EventTriggerSchema = z.object({
  presetIndex: z.number().int().min(0).max(10).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const engine = getActiveShift(id);

  if (!engine) {
    return NextResponse.json({ error: `Shift ${id} not found or not active` }, { status: 404 });
  }

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = EventTriggerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const event = engine.triggerEvent(parsed.data.presetIndex);

    return NextResponse.json({
      ok: true,
      event,
      activeEventsCount: engine.state.activeEvents.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Event trigger error' },
      { status: 500 }
    );
  }
}
