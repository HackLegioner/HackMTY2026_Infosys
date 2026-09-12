'use client';

import React from 'react';
import { Coordinates } from '@/lib/types';

interface RoutePolylineProps {
  coordinates: Coordinates[];
  color?: string;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  coordinates,
  color = '#3B82F6',
}) => {
  return (
    <div className="hidden" data-polyline-count={coordinates.length} data-color={color} />
  );
};

export default RoutePolyline;
