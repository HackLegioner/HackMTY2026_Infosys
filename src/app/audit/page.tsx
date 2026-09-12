'use client';

import React, { useState } from 'react';
import AuditSidebar from '@/components/audit/AuditSidebar';
import Link from 'next/link';

export default function AuditPage() {
  const [shiftIdInput, setShiftIdInput] = useState('');
  const [targetShiftId, setTargetShiftId] = useState('shift_demo');

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🏛️ Auditor & Compliance Panel
          </h1>
          <p className="text-xs text-slate-400">
            Verify AI agent decision provenance, reasoning logic, and zero-LLM compliance.
          </p>
        </div>

        <Link
          href="/"
          className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition border border-slate-700"
        >
          ← Back to Live Demo
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Shift ID to inspect (e.g. shift_12345)"
          value={shiftIdInput}
          onChange={(e) => setShiftIdInput(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 flex-1 max-w-sm"
        />
        <button
          onClick={() => shiftIdInput && setTargetShiftId(shiftIdInput)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded text-xs font-semibold"
        >
          Load Shift
        </button>
      </div>

      <AuditSidebar shiftId={targetShiftId} />
    </main>
  );
}
