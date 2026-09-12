'use client';

import React from 'react';

interface ReasoningCardProps {
  record: {
    tick: number;
    agentId: string;
    accepted: number;
    skipped: number;
    reasoning?: string;
    payload?: Record<string, unknown>;
  };
  tier: 'public' | 'business' | 'gov';
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({ record, tier }) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded p-3 text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono font-bold text-slate-300">
          Tick #{record.tick} · {record.agentId.toUpperCase()}
        </span>
        <div className="space-x-1.5 font-mono text-[10px]">
          <span className="text-emerald-400">Accepted: {record.accepted}</span>
          <span className="text-rose-400">Skipped: {record.skipped}</span>
        </div>
      </div>

      {record.reasoning && (
        <p className="text-slate-400 italic text-[11px] mt-1 border-t border-slate-800/80 pt-1">
          &quot;{record.reasoning}&quot;
        </p>
      )}

      {tier === 'gov' && record.payload && (
        <div className="mt-2 bg-black/50 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-amber-400 font-mono block mb-1">
            Gov Provenance Payload (Zero LLM Budget Verified):
          </span>
          <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto">
            {JSON.stringify(record.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ReasoningCard;
