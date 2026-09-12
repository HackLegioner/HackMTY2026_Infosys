'use client';

import React from 'react';

interface EarningsCounterProps {
  amount: number;
}

export const EarningsCounter: React.FC<EarningsCounterProps> = ({ amount }) => {
  return (
    <div className="flex items-baseline space-x-1">
      <span className="text-sm font-semibold text-slate-400">MXN</span>
      <span className="text-3xl font-black font-mono tracking-tight text-white">
        ${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export default EarningsCounter;
