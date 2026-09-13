'use client';

import { useState, useEffect } from 'react';
import { ShiftState } from '@/lib/types';

export function useShiftStream(shiftId: string | null) {
  const [state, setState] = useState<ShiftState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shiftId) {
      setState(null);
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    // Quick initial status fetch
    fetch(`/api/sim/status/${shiftId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.state) {
          setState(data.state);
        }
      })
      .catch(() => {});

    // SSE Stream
    const eventSource = new EventSource(`/api/ws?shiftId=${shiftId}`);

    eventSource.onopen = () => {
      if (isMounted) {
        setIsConnected(true);
        setError(null);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (isMounted && payload.state) {
          setState(payload.state);
        }
      } catch (err) {
        console.error('[useShiftStream] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      if (isMounted) {
        setIsConnected(false);
      }
    };

    // Polling backup interval (only fires if SSE stream is disconnected or reconnecting)
    const backupInterval = setInterval(async () => {
      if (!isMounted) return;
      // If SSE is open and streaming, skip polling to avoid overloading Render free tier
      if (eventSource.readyState === EventSource.OPEN) return;

      try {
        const res = await fetch(`/api/sim/status/${shiftId}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.state && isMounted) {
            setState(data.state);
            setIsConnected(true);
          }
        }
      } catch (_err) {}
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(backupInterval);
      eventSource.close();
    };
  }, [shiftId]);

  return { state, isConnected, error };
}
