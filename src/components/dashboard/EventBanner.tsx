'use client';

import React from 'react';
import { DisasterEvent } from '@/lib/types';

interface EventBannerProps {
  events: DisasterEvent[];
  onTriggerEvent?: (index: number) => void;
}

export const EventBanner: React.FC<EventBannerProps> = ({ events, onTriggerEvent }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 my-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400">⚡</span>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Disaster & Surge Scenarios
          </h4>
        </div>

        {onTriggerEvent && (
          <div className="flex space-x-2">
            <button
              onClick={() => onTriggerEvent(0)}
              className="px-2.5 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition"
            >
              + Trigger Surge
            </button>
            <button
              onClick={() => onTriggerEvent(1)}
              className="px-2.5 py-1 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded transition"
            >
              + Road Closure
            </button>
            <button
              onClick={() => onTriggerEvent(2)}
              className="px-2.5 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded transition"
            >
              + Rain Storm
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-slate-500">Normal operations in Monterrey. No active crisis events.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {events.map((ev) => (
            <div
              key={ev.id || ev.event_id}
              className="px-3 py-1.5 rounded bg-slate-800 border border-amber-500/30 text-xs text-slate-200 flex items-center space-x-2"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-amber-300">
                {(ev.type || ev.event_type || 'CRISIS').toUpperCase()}:
              </span>
              <span>{ev.description || 'Active scenario'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventBanner;
