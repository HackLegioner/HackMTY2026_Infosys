export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { getActiveShift, getOrCreateShift, getOrHydrateShift } from '@/lib/simulator/shift';
import { getShiftStatus } from '@/lib/security/redisClient';

// WebSocket / SSE handler for real-time simulation tick streaming
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get('shiftId') || `shift_${Date.now()}`;

  // Resilient lookup with Upstash Redis hydration
  const engine = getActiveShift(shiftId) || (await getOrHydrateShift(shiftId));

  // Check if manually stopped
  const status = await getShiftStatus(shiftId);

  // Auto-start engine if not running and not stopped
  if (!engine.timer && status !== 'stopped') {
    engine.start();
  }

  // SSE stream implementation
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial state immediately
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'init', state: engine.state })}\n\n`)
      );

      const unsubscribe = engine.subscribe((state) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'tick', state })}\n\n`)
          );
        } catch (err) {
          console.error('[WS Stream] Client stream write error:', err);
        }
      });

      request.signal.addEventListener('abort', () => {
        unsubscribe();
        try {
          controller.close();
        } catch (_err) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
