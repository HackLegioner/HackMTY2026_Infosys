'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuditSidebar from '@/components/audit/AuditSidebar';
import TopNavbar from '@/components/TopNavbar';
import Link from 'next/link';

function AuditContent() {
  const searchParams = useSearchParams();
  const queryShiftId = searchParams.get('shiftId');
  const [shiftIdInput, setShiftIdInput] = useState('');
  const [targetShiftId, setTargetShiftId] = useState('shift_demo');
  const [activeSavedShift, setActiveSavedShift] = useState<string | null>(null);

  // Auto-detect active shift from query params or localStorage
  useEffect(() => {
    if (queryShiftId) {
      setShiftIdInput(queryShiftId);
      setTargetShiftId(queryShiftId);
      return;
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('courier_active_shift_id') : null;
    if (saved) {
      setActiveSavedShift(saved);
      setShiftIdInput(saved);
      setTargetShiftId(saved);
    }
  }, [queryShiftId]);

  const handleLoadShift = (idToLoad: string) => {
    if (idToLoad.trim()) {
      setTargetShiftId(idToLoad.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans">
      {/* Top Navbar */}
      <TopNavbar showBrand={true} brandTitle="The Courier" activeTab="audit" />

      {/* Main Container */}
      <main className="max-w-[1500px] mx-auto px-6 sm:px-10 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight flex items-center gap-2.5">
              <span>Auditor & Compliance Panel</span>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">
                Zero-LLM
              </span>
            </h1>
            <p className="text-xs text-[#71717a] mt-1 font-normal">
              Verificación de procedencia de decisiones algorítmicas, lógica explicable en tiempo real y certificación de gobernanza.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/driver"
              className="px-3.5 py-1.5 text-xs bg-[#121215] hover:bg-[#18181b] border border-[#27272a] text-[#fafafa] rounded-md font-medium transition flex items-center gap-1.5"
            >
              Panel Flota
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1.5 text-xs bg-[#ffffff] hover:bg-[#e4e4e7] text-[#09090b] rounded-md font-semibold transition flex items-center gap-1.5"
            >
              Simulación en Vivo
            </Link>
          </div>
        </div>

        {/* 4 KPI Summary Cards (Matching Driver and Home layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5">
            <p className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-medium">
              Shift en Inspección
            </p>
            <p className="text-xl font-bold text-[#fafafa] font-mono mt-1.5 truncate">
              {targetShiftId}
            </p>
            <p className="text-[11px] text-[#a1a1aa] mt-1 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sincronización activa
            </p>
          </div>

          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5">
            <p className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-medium">
              Certificación Regulatoria
            </p>
            <p className="text-xl font-bold text-[#fafafa] mt-1.5 font-mono">
              Zero-LLM Runtime
            </p>
            <p className="text-[11px] text-[#a1a1aa] mt-1 font-mono">
              100% Determinista & Auditable
            </p>
          </div>

          <div className="bg-[#121215] border border-[#27272a] rounded-md p-5">
            <p className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-medium">
              Inferencia Algorítmica
            </p>
            <p className="text-xl font-bold text-[#fafafa] mt-1.5 font-mono">
              DQN + OR-Tools
            </p>
            <p className="text-[11px] text-[#a1a1aa] mt-1 font-mono">
              Calibrado con datos Kaggle
            </p>
          </div>

          <div className="bg-[#121215] border border-[#3f3f46] rounded-md p-5">
            <p className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-medium">
              Integridad de Registros
            </p>
            <p className="text-xl font-bold text-[#fafafa] mt-1.5 font-mono">
              Inmutable Log
            </p>
            <p className="text-[11px] text-[#a1a1aa] mt-1 font-mono">
              Persistencia MongoDB + Memoria
            </p>
          </div>
        </div>

        {/* Shift Inspector Input & Active Shift Quick Loader */}
        <div className="bg-[#121215] border border-[#27272a] rounded-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Shift ID a inspeccionar (e.g. shift_1789235279020)"
              value={shiftIdInput}
              onChange={(e) => setShiftIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadShift(shiftIdInput)}
              className="flex-1 bg-[#18181b] border border-[#27272a] rounded-md px-3.5 py-2 text-xs text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#3f3f46] font-mono transition"
            />
            <button
              onClick={() => handleLoadShift(shiftIdInput)}
              className="px-4 py-2 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#09090b] rounded-md text-xs font-semibold cursor-pointer transition whitespace-nowrap"
            >
              Cargar Shift
            </button>
          </div>

          {activeSavedShift && (
            <button
              type="button"
              onClick={() => {
                setShiftIdInput(activeSavedShift);
                setTargetShiftId(activeSavedShift);
              }}
              className="text-xs px-3 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-[#fafafa] font-mono flex items-center gap-2 hover:border-[#3f3f46] transition cursor-pointer self-start md:self-auto font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Shift Activo: {activeSavedShift}</span>
            </button>
          )}
        </div>

        {/* Audit Sidebar Component */}
        <AuditSidebar shiftId={targetShiftId} />
      </main>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-[#71717a] font-mono p-6 text-xs">Cargando Panel de Auditoría...</div>}>
      <AuditContent />
    </Suspense>
  );
}
