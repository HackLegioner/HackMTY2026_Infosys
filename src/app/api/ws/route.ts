import { getActiveShift, getOrCreateShift } from '@/lib/simulator/shift';

export const dynamic = 'force-dynamic';

// WebSocket / SSE handler for real-time simulation tick streaming
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get('shiftId') || `shift_${Date.now()}`;

  // Resilient lookup: active or create
  const engine = getActiveShift(shiftId) || getOrCreateShift(shiftId);

  // Auto-start engine if not currently running and shift has ticks remaining
  if (!engine.isRunning && engine.state.elapsedMinutes < engine.state.totalMinutes) {
    engine.start().catch((err) => console.error('[WS Route] Auto-start error:', err));
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
