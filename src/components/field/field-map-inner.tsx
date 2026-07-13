"use client";
// field-map-inner.tsx — src/components/field/field-map-inner.tsx — 2026-07-13
// Mapa Leaflet real (react-leaflet v5). Montaje SOLO client-side.
// No importar directo desde Server Components: usar field-map.tsx (dynamic ssr:false).

import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  kind?: "site" | "technician" | "default";
}

export interface MapGeofence {
  lat: number;
  lng: number;
  radius: number;
  label?: string;
}

export interface FieldMapProps {
  markers?: MapMarker[];
  geofences?: MapGeofence[];
  trace?: [number, number][];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
  picker?: boolean;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

// Centro por defecto: Argentina (Neuquén / Patagonia norte)
const DEFAULT_CENTER: [number, number] = [-38.5, -66.0];
const DEFAULT_ZOOM = 5;

// Iconos con divIcon (evita el bug de paths rotos de L.Icon.Default en bundlers)
function pinIcon(kind: MapMarker["kind"]): L.DivIcon {
  const color =
    kind === "technician" ? "#576CBC" : kind === "site" ? "#0B2447" : "#64748B";
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%)">
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.25 13 21 13 21s13-11.75 13-21C26 5.82 20.18 0 13 0z" fill="${color}"/>
        <circle cx="13" cy="13" r="5" fill="#fff"/>
      </svg></div>`,
    iconSize: [26, 34],
    iconAnchor: [0, 0],
  });
}

// Recentra el mapa cuando cambian center/zoom sin remontar el contenedor
function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

// Captura clicks para el modo "picker" (ABM de sitios)
function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function FieldMapInner({
  markers = [],
  geofences = [],
  trace = [],
  center,
  zoom = 12,
  height = 360,
  picker = false,
  onPick,
  className,
}: FieldMapProps) {
  const resolvedCenter: [number, number] =
    center ??
    (markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : geofences.length > 0
      ? [geofences[0].lat, geofences[0].lng]
      : DEFAULT_CENTER);
  const resolvedZoom = center || markers.length > 0 || geofences.length > 0 ? zoom : DEFAULT_ZOOM;

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer
        center={resolvedCenter}
        zoom={resolvedZoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={resolvedCenter} zoom={resolvedZoom} />
        {picker && onPick && <ClickPicker onPick={onPick} />}

        {geofences.map((g, i) => (
          <Circle
            key={`geo-${i}`}
            center={[g.lat, g.lng]}
            radius={g.radius}
            pathOptions={{ color: "#576CBC", fillColor: "#576CBC", fillOpacity: 0.12, weight: 1.5 }}
          />
        ))}

        {trace.length > 1 && (
          <Polyline positions={trace} pathOptions={{ color: "#19376D", weight: 3, opacity: 0.8 }} />
        )}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.kind)}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
