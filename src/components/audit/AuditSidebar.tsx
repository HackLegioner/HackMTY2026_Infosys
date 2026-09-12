'use client';

import React, { useState, useEffect } from 'react';
import ReasoningCard from './ReasoningCard';

interface AuditSidebarProps {
  shiftId: string;
}

export const AuditSidebar: React.FC<AuditSidebarProps> = ({ shiftId }) => {
  const [tier, setTier] = useState<'public' | 'business' | 'gov'>('public');
  const [apiKey, setApiKey] = useState('');
  const [source, setSource] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAuditData = async (keyOverride?: string) => {
    if (!shiftId) return;
    const keyToUse = keyOverride !== undefined ? keyOverride : apiKey;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/audit/${shiftId}`, {
        headers: keyToUse ? { 'x-api-key': keyToUse } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to query audit data');
      }
      if (data.decisions) {
        setLogs(data.decisions);
        setTier(data.tier);
        setSource(data.source || 'mongodb-atlas');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error querying audit data');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [shiftId]);

  const selectTierPreset = (newKey: string) => {
    setApiKey(newKey);
    fetchAuditData(newKey);
  };

  return (
    <div className="bg-[#111827]/90 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Auditor Panel & Provenance
            {source === 'mongodb-atlas' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                ☁️ MongoDB Atlas Cloud Verified
              </span>
            )}
            {source && source !== 'mongodb-atlas' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                ⚡ Local Simulator Memory
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">Inspecting:</span>
            <span className="text-xs font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">{shiftId}</span>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-400">Current Tier:</span>
            <span className="text-xs font-mono font-bold uppercase text-blue-400">{tier}</span>
          </div>
        </div>

        {/* Quick Tier Preset Buttons */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => selectTierPreset('')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              !apiKey
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Public Tier
          </button>
          <button
            type="button"
            onClick={() => selectTierPreset('courier_biz_2026')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              apiKey === 'courier_biz_2026'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Business Tier
          </button>
          <button
            type="button"
            onClick={() => selectTierPreset('courier_gov_2026')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              apiKey === 'courier_gov_2026'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Gov Tier (Zero-LLM)
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="password"
          placeholder="X-API-Key (e.g. courier_gov_2026 or custom)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
        />
        <button
          onClick={() => fetchAuditData()}
          disabled={loading}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition cursor-pointer"
        >
          {loading ? 'Querying Atlas...' : 'Fetch Audit'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded text-rose-300 text-xs font-mono">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {logs.length === 0 && !loading && !errorMsg && (
          <p className="text-xs text-slate-500 text-center py-6">
            No audit records found for shift <span className="font-mono text-slate-400">{shiftId}</span>. Start a simulation run on the main dashboard to generate live decision telemetry.
          </p>
        )}
        {logs.map((log, i) => (
          <ReasoningCard key={i} record={log} tier={tier} />
        ))}
      </div>
    </div>
  );
};

export default AuditSidebar;
