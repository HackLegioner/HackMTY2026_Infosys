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

  const restName = order.restaurant_name || order.pickup?.name || order.pickup?.zone || 'Restaurante MTY';
  const dropName = order.dropoff?.name || order.dropoff?.zone || 'Monterrey';
  const foodIcon = order.food_icon || '🍔';

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-md p-3.5 flex justify-between items-center text-xs hover:border-[#3f3f46] transition">
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">{foodIcon}</span>
          <span className="font-mono text-[#fafafa] font-semibold">{restName}</span>
          <span className="font-mono">
            <span className="text-[#71717a]">$</span>
            <span className="text-[#fafafa] font-semibold">{pay}</span>
            <span className="text-[#71717a] text-[10px] ml-0.5">MXN</span>
          </span>
        </div>
        <p className="text-[#71717a] mt-0.5 text-[11px] font-mono">
          Entrega en: <strong className="text-[#a1a1aa] font-medium">{dropName}</strong> · {dist.toFixed(1)} km
        </p>
      </div>

      <div>
        {decision === 'accept' && (
          <span className="px-2 py-0.5 rounded-[4px] bg-[#18181b] text-[#a1a1aa] border border-[#27272a] font-mono text-[10px] uppercase">
            Aceptado
          </span>
        )}
        {decision === 'skip' && (
          <span className="px-2 py-0.5 rounded-[4px] bg-[#18181b] text-[#71717a] border border-[#27272a] font-mono text-[10px] uppercase">
            Omitido
          </span>
        )}
        {decision === 'pending' && (
          <span className="px-2 py-0.5 rounded-[4px] bg-[#18181b] text-[#71717a] border border-[#27272a] font-mono text-[10px] uppercase">
            Pendiente
          </span>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
