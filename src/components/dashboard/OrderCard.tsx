'use client';

import React from 'react';
import { Order } from '@/lib/types';

interface OrderCardProps {
  order: Order;
  decision?: 'accept' | 'skip' | 'pending';
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, decision = 'pending' }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs">
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-slate-300 font-semibold">{order.id}</span>
          <span className="text-emerald-400 font-bold">${order.payout} MXN</span>
        </div>
        <p className="text-slate-400 mt-0.5">
          {order.distanceKm} km · Expires tick {order.expireAtTick}
        </p>
      </div>

      <div>
        {decision === 'accept' && (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase text-[10px]">
            Accepted
          </span>
        )}
        {decision === 'skip' && (
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold uppercase text-[10px]">
            Skipped
          </span>
        )}
        {decision === 'pending' && (
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase text-[10px]">
            Pending
          </span>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
