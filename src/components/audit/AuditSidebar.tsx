'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReasoningCard from './ReasoningCard';

interface AuditSidebarProps {
  shiftId: string;
}

export const AuditSidebar: React.FC<AuditSidebarProps> = ({ shiftId }) => {
  const [tier, setTier] = useState<'public' | 'business' | 'gov'>('public');
  const [apiKey, setApiKey] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>('');

  const fetchAuditData = useCallback(
    async (keyOverride?: string) => {
      setLoading(true);
      const keyToUse = keyOverride !== undefined ? keyOverride : apiKey;
      try {
        const res = await fetch(`/api/audit/${shiftId}`, {
          headers: keyToUse ? { 'x-api-key': keyToUse } : {},
        });
        const data = await res.json();
        if (data.decisions) {
          setLogs(data.decisions);
          setTier(data.tier);
          setSource(data.source || 'db');
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error('Failed to fetch audit data:', err);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, shiftId]
  );

  // Auto-fetch whenever shiftId changes
  useEffect(() => {
    if (shiftId) {
      fetchAuditData();
    }
  }, [shiftId]);

  const handleSelectTier = (selectedTier: 'public' | 'business' | 'gov') => {
    let key = '';
    if (selectedTier === 'business') key = 'courier_biz_2026';
    if (selectedTier === 'gov') key = 'courier_gov_2026';
    setApiKey(key);
    fetchAuditData(key);
  };

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-md p-6 space-y-5 transition-colors">
      {/* Header with Tier Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
        <div>
          <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2.5">
            <span>Auditor Panel &amp; Provenance</span>
            {source === 'mongodb-atlas' && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#18181b] text-[#fafafa] border border-[#27272a]">
                Atlas Cloud Verified
              </span>
            )}
            {source === 'in-memory' && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#18181b] text-[#fafafa] border border-[#27272a]">
                Live Memory Sync
              </span>
            )}
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-1 font-normal">
            Current Clearance: <span className="font-mono font-semibold uppercase text-[#fafafa]">{tier}</span>
            {tier === 'public' && ' — High-level counts & transparency'}
            {tier === 'business' && ' — Natural language decision rationale unlocked'}
            {tier === 'gov' && ' — Full algorithmic payloads & Zero-LLM certification'}
          </p>
        </div>

        {/* 1-Click Demo Tier Selectors */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => handleSelectTier('public')}
            className={`px-3 py-1.5 rounded-md transition border cursor-pointer uppercase tracking-wider ${
              tier === 'public'
                ? 'bg-[#ffffff] text-[#09090b] font-semibold border-[#ffffff]'
                : 'bg-[#18181b] text-[#71717a] border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]'
            }`}
          >
            Public
          </button>
          <button
            type="button"
            onClick={() => handleSelectTier('business')}
            className={`px-3 py-1.5 rounded-md transition border cursor-pointer uppercase tracking-wider ${
              tier === 'business'
                ? 'bg-[#ffffff] text-[#09090b] font-semibold border-[#ffffff]'
                : 'bg-[#18181b] text-[#71717a] border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]'
            }`}
          >
            Business
          </button>
          <button
            type="button"
            onClick={() => handleSelectTier('gov')}
            className={`px-3 py-1.5 rounded-md transition border cursor-pointer uppercase tracking-wider ${
              tier === 'gov'
                ? 'bg-[#ffffff] text-[#09090b] font-semibold border-[#ffffff]'
                : 'bg-[#18181b] text-[#71717a] border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]'
            }`}
          >
            Gov Auditor
          </button>
        </div>
      </div>

      {/* Manual Key Input Row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="API Key (e.g. courier_biz_2026 or courier_gov_2026)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchAuditData()}
          className="flex-1 bg-[#18181b] border border-[#27272a] rounded-md px-3.5 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#3f3f46] font-mono transition"
        />
        <button
          onClick={() => fetchAuditData()}
          disabled={loading}
          className="px-4 py-2 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#09090b] disabled:opacity-40 rounded-md text-xs font-semibold transition cursor-pointer font-mono"
        >
          {loading ? 'Querying...' : 'Fetch Audit'}
        </button>
      </div>

      {/* Decision Records Scroll List */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {loading && logs.length === 0 ? (
          <div className="py-12 text-center text-[#71717a] text-xs flex items-center justify-center gap-2.5 font-mono">
            <span className="w-3.5 h-3.5 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin"></span>
            Loading audit records for {shiftId}...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center bg-[#18181b] rounded-md border border-[#27272a] p-6 space-y-1.5">
            <p className="text-xs text-[#a1a1aa]">
              No audit records found for shift <code className="text-[#fafafa] font-mono font-bold bg-[#121215] px-2 py-0.5 rounded border border-[#27272a]">{shiftId}</code>.
            </p>
            <p className="text-[11px] text-[#71717a]">
              Start a shift on the live demo to generate real-time provenance entries.
            </p>
          </div>
        ) : (
          logs.map((log, i) => <ReasoningCard key={i} record={log} tier={tier} />)
        )}
      </div>
    </div>
  );
};

export default AuditSidebar;
