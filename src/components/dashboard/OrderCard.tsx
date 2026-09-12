'use client';

import React from 'react';
import { Order } from '@/lib/types';

interface OrderCardProps {
  order: Order;
  decision?: 'accept' | 'skip' | 'pending';
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, decision = 'pending' }) => {
  const orderId = order.id || order.order_id || 'order';
  const pay = order.total_pay || order.payout || 0;
  const dist = order.estimated_distance_km || order.distanceKm || 0;
  const zone = order.pickup?.zone || 'MTY';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs">
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-slate-300 font-semibold">{orderId}</span>
          <span className="text-emerald-400 font-bold">${pay} MXN</span>
          <span className="text-slate-400 text-[10px] font-mono">({zone})</span>
        </div>
        <p className="text-slate-400 mt-0.5">
          {dist.toFixed(1)} km · Expiry {order.expires_in_seconds || 120}s
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
