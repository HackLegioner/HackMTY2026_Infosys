'use client';

import { useState } from 'react';
import { ShiftState } from '@/lib/types';

export function useShiftControl() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startShift = async (
    durationMin: number = 480,
    seed: number = 42,
    tickSpeedMs: number = 1000
  ): Promise<{ shiftId: string; state: ShiftState } | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMin, seed, tickSpeedMs }),
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

  const changeSpeed = async (shiftId: string, tickSpeedMs: number) => {
    try {
      const res = await fetch(`/api/sim/speed/${shiftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickSpeedMs }),
      });
      return await res.json();
    } catch (err) {
      console.error('Change speed error:', err);
      return null;
    }
  };

  const fastForward = async (shiftId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sim/speed/${shiftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fastForward: true }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Fast forward error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { startShift, stopShift, triggerDisaster, changeSpeed, fastForward, loading, error };
}
