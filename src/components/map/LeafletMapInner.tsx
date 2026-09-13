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

  const iconPickupHub = useMemo(
    () =>
      L.divIcon({
        className: 'zone-hub-pickup',
        html: `<div class="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.7)] cursor-pointer" title="Punto de Recolección"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    []
  );

  const iconDropoffHub = useMemo(
    () =>
      L.divIcon({
        className: 'zone-hub-dropoff',
        html: `<div class="w-2.5 h-2.5 rounded-full bg-sky-400 border-2 border-slate-900 shadow-[0_0_6px_rgba(56,189,248,0.7)] cursor-pointer" title="Zona de Entrega"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    []
  );

  const iconBothHub = useMemo(
    () =>
      L.divIcon({
        className: 'zone-hub-both',
        html: `<div class="w-3 h-3 rounded-full bg-indigo-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(129,140,248,0.7)] cursor-pointer" title="Hub Mixto"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    []
  );

  const iconPickup = useMemo(
    () =>
      L.divIcon({
        className: 'pickup-pin',
        html: `<div class="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md border border-amber-300 flex items-center">🍴</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    []
  );

  const iconDropoff = useMemo(
    () =>
      L.divIcon({
        className: 'dropoff-pin',
        html: `<div class="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-md border border-rose-300 flex items-center">🏠</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    []
  );

  const courierA = shiftState?.agents.agent_a;
  const courierB = shiftState?.agents.agent_b;
  const courierBase = shiftState?.agents.baseline;

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={true}
      className="w-full h-full rounded-xl"
      style={{ background: '#0A0E1A' }}
    >
      {/* 100% Free OpenStreetMap tile server with dark mode CSS filter - No API key required */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-tiles"
      />

      {/* Static Monterrey Hotspot Hubs (Recolección y Entrega) */}
      {MONTERREY_ZONES.map((z) => {
        const icon =
          z.type === 'pickup'
            ? iconPickupHub
            : z.type === 'dropoff'
            ? iconDropoffHub
            : iconBothHub;
        const typeBadge =
          z.type === 'pickup'
            ? '🍴 Hub Recolección (Restaurantes)'
            : z.type === 'dropoff'
            ? '🏠 Destino Entrega (Residencial)'
            : '⚡ Hub Mixto (Comercial / Residencial)';

        return (
          <Marker key={z.name} position={[z.lat, z.lon]} icon={icon}>
            <Popup className="text-slate-900 text-xs">
              <div className="font-bold text-slate-900 text-xs">{z.name}</div>
              <div className="text-[10px] text-slate-500 font-semibold">{z.municipality}</div>
              <div className="text-[11px] mt-1 text-indigo-700 font-medium">{typeBadge}</div>
              {z.description && (
                <div className="text-[10px] text-slate-600 mt-0.5">{z.description}</div>
              )}
              <div className="text-[10px] text-slate-500 mt-1">
                Demanda estimada: <strong className="text-amber-600">{z.weight}x</strong>
              </div>
            </Popup>
          </Marker>
        );
      })}

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
                fillOpacity: 0.25,
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
                fillOpacity: 0.35,
                weight: 2,
                dashArray: '5, 5',
              }}
            >
              <Popup className="text-slate-900 text-xs">
                <strong className="text-red-600">🚧 Cierre Vial Total</strong>
                <br />
                {evt.description}
                <br />
                <span className="text-rose-700 font-bold">Tráfico bloqueado: Velocidad cae a 4 km/h</span>
              </Popup>
            </Circle>
          );
        }

        if (evt.event_type === 'unsafe_zone') {
          return (
            <Circle
              key={evt.event_id || evt.id}
              center={[evt.lat, evt.lon]}
              radius={radiusMeters}
              pathOptions={{
                color: '#A855F7',
                fillColor: '#9333EA',
                fillOpacity: 0.25,
                weight: 2,
                dashArray: '6, 6',
              }}
            >
              <Popup className="text-slate-900 text-xs">
                <strong className="text-purple-700">⚠️ Zona de Riesgo Crítico</strong>
                <br />
                {evt.description}
                <br />
                <span className="text-rose-600 font-bold">Penalización: -$45 MXN por incidente</span>
              </Popup>
            </Circle>
          );
        }

        if (evt.event_type === 'rain') {
          return (
            <Circle
              key={evt.event_id || evt.id}
              center={[evt.lat, evt.lon]}
              radius={radiusMeters}
              pathOptions={{
                color: '#38BDF8',
                fillColor: '#0284C7',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 8',
              }}
            >
              <Popup className="text-slate-900 text-xs">
                <strong className="text-sky-600">⛈️ Tormenta Activa</strong>
                <br />
                {evt.description}
                <br />
                <span className="text-amber-700 font-semibold">Velocidad -40% | Demora en trayecto</span>
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
          pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.85 }}
        />
      )}

      {/* Courier B Route Polyline */}
      {courierB && courierB.activeRoute.length > 1 && (
        <Polyline
          positions={courierB.activeRoute.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#10B981', weight: 4, opacity: 0.85 }}
        />
      )}

      {/* Baseline Route Polyline */}
      {courierBase && courierBase.activeRoute.length > 1 && (
        <Polyline
          positions={courierBase.activeRoute.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#94A3B8', weight: 3, opacity: 0.65, dashArray: '4, 4' }}
        />
      )}

      {/* Target Destination Markers (Pickup / Dropoff) */}
      {[courierA, courierB, courierBase].map((c) => {
        if (!c?.currentTask?.target) return null;
        const isPickup = c.currentTask.phase === 'to_pickup';
        return (
          <Marker
            key={`target-${c.agentId}-${c.currentTask.orderId}`}
            position={[c.currentTask.target.lat, c.currentTask.target.lng]}
            icon={isPickup ? iconPickup : iconDropoff}
          >
            <Popup className="text-slate-900 text-xs">
              <strong>{isPickup ? '🍴 Pickup Point' : '🏠 Dropoff Point'}</strong>
              <br />
              Zone: {c.currentTask.targetName}
              <br />
              Agent: {c.agentId}
            </Popup>
          </Marker>
        );
      })}

      {/* Agent A Marker */}
      {courierA && (
        <Marker position={[courierA.lat, courierA.lng]} icon={iconAgentA}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-blue-600">Agent A — The Economist 🧊</strong>
            <br />
            Status: <span className="font-semibold">{courierA.status === 'trapped_in_closure' ? '🚧 Atrapado en Cierre' : courierA.status}</span>
            <br />
            Ganancia Bruta: ${courierA.currentEarnings} MXN
            <br />
            Ganancia Neta: <strong className="text-emerald-700">${courierA.netEarnings ?? courierA.currentEarnings} MXN</strong>
            <br />
            Distancia: {courierA.totalKm.toFixed(1)} km
          </Popup>
        </Marker>
      )}

      {/* Agent B Marker */}
      {courierB && (
        <Marker position={[courierB.lat, courierB.lng]} icon={iconAgentB}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-emerald-600">Agent B — The Hustler ⚡</strong>
            <br />
            Status: <span className="font-semibold">{courierB.status === 'trapped_in_closure' ? '🚧 Atrapado en Cierre' : courierB.status}</span>
            <br />
            Ganancia Bruta: ${courierB.currentEarnings} MXN
            <br />
            Ganancia Neta: <strong className="text-emerald-700">${courierB.netEarnings ?? courierB.currentEarnings} MXN</strong>
            <br />
            Distancia: {courierB.totalKm.toFixed(1)} km
          </Popup>
        </Marker>
      )}

      {/* Baseline Marker */}
      {courierBase && (
        <Marker position={[courierBase.lat, courierBase.lng]} icon={iconBaseline}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-slate-700">Traditional App Baseline 📱</strong>
            <br />
            Status: <span className={`font-semibold ${courierBase.status === 'trapped_in_closure' ? 'text-rose-600 font-bold' : ''}`}>{courierBase.status === 'trapped_in_closure' ? '🚧 Atrapado en Cierre Vial (4 km/h)' : courierBase.status}</span>
            <br />
            Ganancia Bruta: ${courierBase.currentEarnings} MXN
            {courierBase.penaltiesMXN ? (
              <>
                <br />
                <span className="text-rose-600 font-semibold">Penalizaciones: -${courierBase.penaltiesMXN} MXN</span>
              </>
            ) : null}
            <br />
            Ganancia Neta: <strong className="text-slate-900">${courierBase.netEarnings ?? courierBase.currentEarnings} MXN</strong>
            <br />
            Distancia: {courierBase.totalKm.toFixed(1)} km
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default LeafletMapInner;
