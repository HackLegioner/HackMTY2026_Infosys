'use client';

import React, { useState } from 'react';
import ReasoningCard from './ReasoningCard';

interface AuditSidebarProps {
  shiftId: string;
}

export const AuditSidebar: React.FC<AuditSidebarProps> = ({ shiftId }) => {
  const [tier, setTier] = useState<'public' | 'business' | 'gov'>('public');
  const [apiKey, setApiKey] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/${shiftId}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      });
      const data = await res.json();
      if (data.decisions) {
        setLogs(data.decisions);
        setTier(data.tier);
      }
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111827]/90 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-bold text-white">Auditor Panel & Provenance</h3>
          <span className="text-xs text-slate-400">Current Tier: </span>
          <span className="text-xs font-mono font-bold uppercase text-blue-400">{tier}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="password"
          placeholder="Enter API Key (Optional for Gov/Biz)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={fetchAuditData}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
        >
          {loading ? 'Querying...' : 'Fetch Audit'}
        </button>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500">No audit records fetched yet. Enter key or query public tier.</p>
        ) : (
          logs.map((log, i) => <ReasoningCard key={i} record={log} tier={tier} />)
        )}
      </div>
    </div>
  );
};

export default AuditSidebar;
