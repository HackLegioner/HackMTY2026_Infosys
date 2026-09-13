'use client';

import React from 'react';

interface ReasoningCardProps {
  record: {
    tick: number;
    agentId: string;
    accepted?: number;
    skipped?: number;
    acceptedCount?: number;
    skippedCount?: number;
    reasoning?: string;
    payload?: Record<string, unknown>;
  };
  tier: 'public' | 'business' | 'gov';
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({ record, tier }) => {
  const accepted = record.accepted ?? record.acceptedCount ?? 0;
  const skipped = record.skipped ?? record.skippedCount ?? 0;

  const getAgentBadge = (agentId: string) => {
    switch (agentId.toLowerCase()) {
      case 'agent_a':
        return {
          label: 'Agent A — The Economist',
          color: 'text-[#fafafa] border-[#27272a] bg-[#121215]',
        };
      case 'agent_b':
        return {
          label: 'Agent B — The Hustler',
          color: 'text-[#fafafa] border-[#27272a] bg-[#121215]',
        };
      default:
        return {
          label: 'Traditional App Baseline',
          color: 'text-[#a1a1aa] border-[#27272a] bg-[#121215]',
        };
    }
  };

  const badge = getAgentBadge(record.agentId);

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-md p-4 text-xs hover:border-[#3f3f46] transition space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[#fafafa] text-xs bg-[#121215] px-2.5 py-1 rounded-md border border-[#27272a]">
            Tick #{record.tick}
          </span>
          <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md border ${badge.color}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[11px]">
          <span className="text-[#fafafa] bg-[#121215] border border-[#27272a] px-2 py-0.5 rounded-md font-medium">
            Accepted: {accepted}
          </span>
          <span className="text-[#a1a1aa] bg-[#121215] border border-[#27272a] px-2 py-0.5 rounded-md font-medium">
            Skipped: {skipped}
          </span>
        </div>
      </div>

      {record.reasoning && (
        <div className="pt-2 border-t border-[#27272a]">
          <span className="text-[10px] text-[#71717a] font-mono block uppercase tracking-wider font-semibold">
            Decision Reasoning:
          </span>
          <p className="text-[#fafafa] italic text-[11px] mt-1 bg-[#121215] p-2.5 rounded-md border border-[#27272a] leading-relaxed">
            &quot;{record.reasoning}&quot;
          </p>
        </div>
      )}

      {tier === 'gov' && record.payload && (
        <div className="mt-2.5 bg-[#121215] p-3 rounded-md border border-[#3f3f46]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#fafafa] font-mono font-semibold uppercase tracking-wider">
              Gov Provenance &amp; Algorithmic Payload (Zero-LLM Runtime)
            </span>
            <span className="text-[9px] font-mono text-[#fafafa] bg-[#18181b] px-2 py-0.5 rounded-md border border-[#27272a] font-semibold tracking-wider">
              AUDIT VERIFIED
            </span>
          </div>
          <pre className="text-[10px] text-[#a1a1aa] font-mono overflow-x-auto max-h-48 bg-[#09090b] p-2 rounded-md border border-[#27272a]">
            {JSON.stringify(record.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ReasoningCard;
