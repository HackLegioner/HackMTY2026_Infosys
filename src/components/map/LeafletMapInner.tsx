'use client';

import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ShiftState } from '@/lib/types';
import { REAL_MONTERREY_RESTAURANTS } from '@/lib/simulator/orderStream';

function MapController() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function isValidCoord(lat: any, lng: any): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

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
            <div class="px-2 py-0.5 rounded-full bg-blue-600 border border-blue-400 text-white text-[10px] font-bold shadow-lg flex items-center">
              A
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
            <div class="px-2 py-0.5 rounded-full bg-emerald-600 border border-emerald-400 text-white text-[10px] font-bold shadow-lg flex items-center">
              B
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
            <div class="px-2 py-0.5 rounded-full bg-slate-600 border border-slate-400 text-slate-200 text-[10px] font-bold shadow-lg flex items-center">
              Base
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
        html: `<div class="w-2.5 h-2.5 rounded-full bg-slate-400/80 border border-slate-200/50"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    []
  );

  const createRestaurantIcon = (icon: string) =>
    L.divIcon({
      className: 'rest-pin',
      html: `<div class="w-6 h-6 rounded-full bg-[#18181b] border border-[#3f3f46] text-xs flex items-center justify-center shadow-md hover:scale-125 transition-transform">${icon}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  const iconPickup = useMemo(
    () =>
      L.divIcon({
        className: 'pickup-pin',
        html: `<div class="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md border border-amber-300 flex items-center justify-center">P</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    []
  );

  const iconDropoff = useMemo(
    () =>
      L.divIcon({
        className: 'dropoff-pin',
        html: `<div class="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-md border border-rose-300 flex items-center justify-center">D</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
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
      <MapController />
      {/* 100% Free OpenStreetMap tile server with dark mode CSS filter - No API key required */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-tiles"
      />

      {/* Verified Real Monterrey Restaurants */}
      {REAL_MONTERREY_RESTAURANTS.map((rest) => (
        <Marker key={rest.id} position={[rest.lat, rest.lon]} icon={createRestaurantIcon(rest.foodIcon)}>
          <Popup className="text-slate-900 text-xs">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
              <span>{rest.foodIcon}</span> {rest.name}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{rest.corridor} ({rest.municipality})</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              Ticket promedio: ${rest.avgTicketMxn} MXN
            </div>
            <div className="text-[10px] text-slate-600">
              Cocina Kaggle: {rest.prepTimeRange[0]}-{rest.prepTimeRange[1]} min prep
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Dynamic Crisis & Surge Events */}
      {(shiftState?.activeEvents || []).map((evt) => {
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
                <strong className="text-amber-600">Surge Zone Active!</strong>
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
                fillOpacity: 0.3,
                weight: 2,
              }}
            >
              <Popup className="text-slate-900 text-xs">
                <strong className="text-red-600">Road Closure</strong>
                <br />
                {evt.description}
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
                <strong className="text-purple-600">Zona de Riesgo Activa</strong>
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
                <strong className="text-sky-600">Tormenta Activa</strong>
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
      {courierA && courierA.activeRoute && courierA.activeRoute.length > 1 && (
        <Polyline
          positions={courierA.activeRoute
            .filter((p) => isValidCoord(p?.lat, p?.lng))
            .map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.85 }}
        />
      )}

      {/* Courier B Route Polyline */}
      {courierB && courierB.activeRoute && courierB.activeRoute.length > 1 && (
        <Polyline
          positions={courierB.activeRoute
            .filter((p) => isValidCoord(p?.lat, p?.lng))
            .map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#10B981', weight: 4, opacity: 0.85 }}
        />
      )}

      {/* Baseline Route Polyline */}
      {courierBase && courierBase.activeRoute && courierBase.activeRoute.length > 1 && (
        <Polyline
          positions={courierBase.activeRoute
            .filter((p) => isValidCoord(p?.lat, p?.lng))
            .map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#94A3B8', weight: 3, opacity: 0.65, dashArray: '4, 4' }}
        />
      )}

      {/* Target Destination Markers (Pickup / Dropoff) */}
      {[courierA, courierB, courierBase].map((c) => {
        if (!c?.currentTask?.target || !isValidCoord(c.currentTask.target.lat, c.currentTask.target.lng)) return null;
        const isPickup = c.currentTask.phase === 'to_pickup';
        return (
          <Marker
            key={`target-${c.agentId}-${c.currentTask.orderId}`}
            position={[c.currentTask.target.lat, c.currentTask.target.lng]}
            icon={isPickup ? iconPickup : iconDropoff}
          >
            <Popup className="text-slate-900 text-xs">
              <strong>{isPickup ? 'Pickup Point' : 'Dropoff Point'}</strong>
              <br />
              Zone: {c.currentTask.targetName}
              <br />
              Agent: {c.agentId}
            </Popup>
          </Marker>
        );
      })}

      {/* Agent A Marker */}
      {courierA && isValidCoord(courierA.lat, courierA.lng) && (
        <Marker position={[courierA.lat, courierA.lng]} icon={iconAgentA}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-blue-600">Agent A — The Economist</strong>
            <br />
            Status: <span className="font-semibold">{courierA.status === 'trapped_in_closure' ? 'Atrapado en Cierre' : courierA.status}</span>
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
      {courierB && isValidCoord(courierB.lat, courierB.lng) && (
        <Marker position={[courierB.lat, courierB.lng]} icon={iconAgentB}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-emerald-600">Agent B — The Hustler</strong>
            <br />
            Status: <span className="font-semibold">{courierB.status === 'trapped_in_closure' ? 'Atrapado en Cierre' : courierB.status}</span>
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
      {courierBase && isValidCoord(courierBase.lat, courierBase.lng) && (
        <Marker position={[courierBase.lat, courierBase.lng]} icon={iconBaseline}>
          <Popup className="text-slate-900 text-xs">
            <strong className="text-slate-700">Traditional App Baseline</strong>
            <br />
            Status: <span className="font-semibold">{courierBase.status === 'trapped_in_closure' ? 'Atrapado en Cierre (4 km/h)' : courierBase.status}</span>
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
