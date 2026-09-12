export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveShift } from '@/lib/simulator/shift';
import { DEMO_PRESET_EVENTS } from '@/lib/simulator/events';
import {
  queueDisasterEvent,
  getShiftState,
  saveShiftState,
} from '@/lib/security/redisClient';

const EventTriggerSchema = z.object({
  presetIndex: z.number().int().min(0).max(10).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const json = await request.json().catch(() => ({}));
    const parsed = EventTriggerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const presetIdx = parsed.data.presetIndex ?? 0;
    const preset = DEMO_PRESET_EVENTS[presetIdx % DEMO_PRESET_EVENTS.length];
    const event = { ...preset, event_id: `${preset.event_id}_${Date.now()}` };

    const engine = getActiveShift(id);

    if (engine) {
      const triggered = engine.triggerEvent(presetIdx);
      await queueDisasterEvent(id, triggered || event);
      await saveShiftState(id, engine.state);
      return NextResponse.json({
        ok: true,
        source: 'active-memory-and-redis',
        event: triggered || event,
        activeEventsCount: engine.state.activeEvents.length,
      });
    }

    // Cross-Lambda fallback: update state in Upstash Redis
    const state = await getShiftState(id);
    if (state) {
      if (!state.activeEvents.some((e) => e.event_id === event.event_id)) {
        state.activeEvents.push(event);
      }
      await Promise.all([
        queueDisasterEvent(id, event),
        saveShiftState(id, state),
      ]);

      return NextResponse.json({
        ok: true,
        source: 'upstash-redis-queue',
        event,
        activeEventsCount: state.activeEvents.length,
      });
    }

    // Queue event for when shift starts/hydrates
    await queueDisasterEvent(id, event);
    return NextResponse.json({
      ok: true,
      source: 'queued-pending',
      event,
      activeEventsCount: 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Event trigger error' },
      { status: 500 }
    );
  }
}
