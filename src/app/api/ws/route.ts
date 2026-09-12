import { getActiveShift } from '@/lib/simulator/shift';

// WebSocket / SSE handler for real-time simulation tick streaming
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get('shiftId');

  if (!shiftId) {
    return new Response(JSON.stringify({ error: 'Missing shiftId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const engine = getActiveShift(shiftId);
  if (!engine) {
    return new Response(JSON.stringify({ error: `Shift ${shiftId} not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SSE stream implementation
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial state
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
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
