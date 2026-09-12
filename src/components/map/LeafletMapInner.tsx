'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ShiftState } from '@/lib/types';
import { MONTERREY_ZONES } from '@/lib/simulator/orderStream';

interface LeafletMapInnerProps {
  shiftState: ShiftState | null;
}

export const LeafletMapInner: React.FC<LeafletMapInnerProps> = ({ shiftState }) => {
  const center: [number, number] = [25.6692, -100.3099]; // Monterrey Centro

  const iconAgentA = useMemo(
    () =>
      L.divIcon({
        className: 'agent-a-pin',
        html: `
          <div style="transform: translate(-50%, -50%);" class="flex flex-col items-center">
            <div class="px-2 py-0.5 rounded-full bg-blue-600 border border-blue-400 text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
              <span>🧊</span> A
            </div>
            <div class="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_12px_#3B82F6] animate-ping mt-0.5"></div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    []
  );

  const iconAgentB = useMemo(
    () =>
      L.divIcon({
        className: 'agent-b-pin',
        html: `
          <div style="transform: translate(-50%, -50%);" class="flex flex-col items-center">
            <div class="px-2 py-0.5 rounded-full bg-emerald-600 border border-emerald-400 text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
              <span>⚡</span> B
            </div>
            <div class="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_#10B981] animate-ping mt-0.5"></div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    []
  );

  const iconBaseline = useMemo(
    () =>
      L.divIcon({
        className: 'baseline-pin',
        html: `
          <div style="transform: translate(-50%, -50%);" class="flex flex-col items-center">
            <div class="px-2 py-0.5 rounded-full bg-slate-600 border border-slate-400 text-slate-200 text-[10px] font-bold shadow-lg flex items-center gap-1">
              <span>📱</span> Base
            </div>
            <div class="w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-[0_0_8px_#6B7280] mt-0.5"></div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    []
  );

  const iconZone = useMemo(
    () =>
      L.divIcon({
        className: 'zone-dot',
        html: `<div class="w-2 h-2 rounded-full bg-slate-500/60 border border-slate-400/40"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      }),
    []
  );

  const courierA = shiftState?.agents.agent_a;
  const courierB = shiftState?.agents.agent_b;
  const courierBase = shiftState?.agents.baseline;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-full rounded-xl"
      style={{ background: '#0A0E1A' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Static Monterrey Hotspot Hubs */}
      {MONTERREY_ZONES.map((z) => (
        <Marker key={z.name} position={[z.lat, z.lon]} icon={iconZone}>
          <Popup className="text-slate-900 text-xs">
            <strong>{z.name}</strong>
            <br />
            Demand factor: {z.weight}x
          </Popup>
        </Marker>
      ))}

      {/* Dynamic Crisis & Surge Events */}
      {shiftState?.activeEvents.map((evt) => {
        if (!evt.lat || !evt.lon) return null;
        const radiusMeters = (evt.radius_km || 1.5) * 1000;

        if (evt.event_type === 'surge') {
          return (
            <Circle
              key={evt.event_id || evt.id}
              center={[evt.lat, evt.lon]}
              radius={radiusMeters}
              pathOptions={{
                color: '#F59E0B',
                fillColor: '#F59E0B',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '5, 8',
              }}
            >
              <Popup className="text-slate-900 text-xs">
                <strong className="text-amber-600">⚡ Surge Zone Active!</strong>
                <br />
                {evt.description}
                <br />
                Multiplier: {evt.metadata?.multiplier || 2.0}x
              </Popup>
            </Circle>
          );
        }

        if (evt.event_type === 'road_closure') {
          return (
            <Circle
              key={evt.event_id || evt.id}
              center={[evt.lat, evt.lon]}
              radius={radiusMeters}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.25,
                weight: 2,
              }}
            >
              <Popup className="text-slate-900 text-xs">
                <strong className="text-red-600">🚧 Road Closure</strong>
                <br />
                {evt.description}
              </Popup>
            </Circle>
          );
        }

        return null;
      })}

      {/* Courier A Route Polyline */}
      {courierA && courierA.activeRoute.length > 1 && (
        <Polyline
          positions={courierA.activeRoute.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#3B82F6', weight: 3, opacity: 0.8, dashArray: '4, 4' }}
        />
      )}

      {/* Courier B Route Polyline */}
      {courierB && courierB.activeRoute.length > 1 && (
        <Polyline
          positions={courierB.activeRoute.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#10B981', weight: 3, opacity: 0.8 }}
        />
      )}

      {/* Agent A Marker */}
      {courierA && (
        <Marker position={[courierA.lat, courierA.lng]} icon={iconAgentA}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-blue-600">Agent A — The Economist 🧊</strong>
            <br />
            Status: {courierA.status}
            <br />
            Earnings: ${courierA.currentEarnings} MXN
            <br />
            Total Dist: {courierA.totalKm.toFixed(1)} km
          </Popup>
        </Marker>
      )}

      {/* Agent B Marker */}
      {courierB && (
        <Marker position={[courierB.lat, courierB.lng]} icon={iconAgentB}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-emerald-600">Agent B — The Hustler ⚡</strong>
            <br />
            Status: {courierB.status}
            <br />
            Earnings: ${courierB.currentEarnings} MXN
            <br />
            Total Dist: {courierB.totalKm.toFixed(1)} km
          </Popup>
        </Marker>
      )}

      {/* Baseline Marker */}
      {courierBase && (
        <Marker position={[courierBase.lat, courierBase.lng]} icon={iconBaseline}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-slate-600">Traditional App Baseline 📱</strong>
            <br />
            Status: {courierBase.status}
            <br />
            Earnings: ${courierBase.currentEarnings} MXN
            <br />
            Total Dist: {courierBase.totalKm.toFixed(1)} km
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default LeafletMapInner;
