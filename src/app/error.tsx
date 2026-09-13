'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-12 h-12 rounded-md bg-[#18181b] border border-rose-900/50 text-rose-400 flex items-center justify-center font-mono font-bold text-sm mb-4">
        !
      </div>
      <h2 className="text-xl font-bold mb-2">Ha ocurrido un error</h2>
      <p className="text-xs text-[#71717a] max-w-sm mb-6">
        {error.message || 'Error inesperado durante la ejecución.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[#ffffff] text-[#09090b] rounded-md text-xs font-semibold hover:bg-[#e4e4e7] transition cursor-pointer"
      >
        Reintentar
      </button>
    </div>
  );
}
