'use client';

import { useState } from 'react';
import { ShiftState } from '@/lib/types';

async function safeJsonFetch<T = any>(
  url: string,
  options?: RequestInit,
  defaultErrorMsg: string = 'Error de comunicación'
): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('El servidor se está reconectando en Render. Por favor reintenta en un momento.');
    }
    throw new Error(`${defaultErrorMsg} (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || defaultErrorMsg);
  }
  return data;
}

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
      const data = await safeJsonFetch<{ shiftId: string; state: ShiftState }>(
        '/api/sim/start',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationMin, seed, tickSpeedMs }),
        },
        'No se pudo iniciar el turno'
      );
      return { shiftId: data.shiftId, state: data.state };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error iniciando turno');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const stopShift = async (shiftId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await safeJsonFetch(
        `/api/sim/stop/${shiftId}`,
        { method: 'DELETE' },
        'No se pudo detener el turno'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deteniendo turno');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const triggerDisaster = async (shiftId: string, presetIndex?: number) => {
    try {
      return await safeJsonFetch(
        `/api/sim/event/${shiftId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presetIndex }),
        },
        'No se pudo inyectar el evento'
      );
    } catch (err) {
      console.error('Trigger event error:', err);
      return null;
    }
  };

  const changeSpeed = async (shiftId: string, tickSpeedMs: number) => {
    try {
      return await safeJsonFetch(
        `/api/sim/speed/${shiftId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickSpeedMs }),
        },
        'No se pudo ajustar la velocidad'
      );
    } catch (err) {
      console.error('Change speed error:', err);
      return null;
    }
  };

  const fastForward = async (shiftId: string) => {
    setLoading(true);
    try {
      return await safeJsonFetch(
        `/api/sim/speed/${shiftId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fastForward: true }),
        },
        'No se pudo acelerar el turno'
      );
    } catch (err) {
      console.error('Fast forward error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { startShift, stopShift, triggerDisaster, changeSpeed, fastForward, loading, error };
}
