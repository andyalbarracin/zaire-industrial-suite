"use client";
// field-map.tsx — src/components/field/field-map.tsx — 2026-07-13
// Wrapper client-only del mapa Leaflet. Carga field-map-inner con ssr:false
// (react-leaflet necesita window). Este es el componente que se usa en la app.

import dynamic from "next/dynamic";
import type { FieldMapProps } from "./field-map-inner";

const FieldMapInner = dynamic(() => import("./field-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-sm text-(--sas-text-muted)"
      style={{ height: 360 }}
    >
      Cargando mapa…
    </div>
  ),
});

export type { FieldMapProps, MapMarker, MapGeofence } from "./field-map-inner";

export function FieldMap(props: FieldMapProps) {
  return <FieldMapInner {...props} />;
}
