'use client';

import { useState, useEffect } from 'react';
import { ShiftState } from '@/lib/types';

export function useShiftStream(shiftId: string | null) {
  const [state, setState] = useState<ShiftState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shiftId) return;

    const eventSource = new EventSource(`/api/ws?shiftId=${shiftId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.state) {
          setState(payload.state);
        }
      } catch (err) {
        console.error('[useShiftStream] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connection interrupted. Reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, [shiftId]);

  return { state, isConnected, error };
}
