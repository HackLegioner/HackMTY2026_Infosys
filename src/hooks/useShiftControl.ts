'use client';

import { useState } from 'react';
import { ShiftState } from '@/lib/types';

export function useShiftControl() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startShift = async (durationMin: number = 60, seed: number = 42): Promise<{ shiftId: string; state: ShiftState } | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMin, seed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start shift');
      return { shiftId: data.shiftId, state: data.state };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error starting shift');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const stopShift = async (shiftId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sim/stop/${shiftId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stop shift');
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error stopping shift');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const triggerDisaster = async (shiftId: string, presetIndex?: number) => {
    try {
      const res = await fetch(`/api/sim/event/${shiftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetIndex }),
      });
      return await res.json();
    } catch (err) {
      console.error('Trigger event error:', err);
      return null;
    }
  };

  return { startShift, stopShift, triggerDisaster, loading, error };
}
