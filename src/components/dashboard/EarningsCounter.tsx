'use client';

import React from 'react';

interface EarningsCounterProps {
  amount: number;
}

export const EarningsCounter: React.FC<EarningsCounterProps> = ({ amount }) => {
  return (
    <div className="flex items-baseline gap-1 font-mono">
      <span className="text-xs text-[#71717a]">MXN</span>
      <span className="text-xl text-[#71717a] font-medium">$</span>
      <span className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight">
        {amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
};

export default EarningsCounter;
