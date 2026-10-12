// types.ts — src/lib/assets/types.ts — 2026-07-20
// Tipos de las tablas asset_ (Zaire Activos). Espejo del SQL en
// .docs/zaire-assets/sql/zaire_assets_schema.sql. Reusa tipos compartidos.

import type { Client, Profile, Currency } from "@/lib/types/database";
import type { TrafficLight } from "@/lib/utils";

export type { Client, Profile, Currency };

// ---------- Uniones (espejo de los CHECK del SQL) ----------
export type AssetType = "bomba" | "sello" | "compresor" | "motor" | "valvula" | "otro";
export type AssetStatus = "operativo" | "en_reparacion" | "standby" | "baja";
export type EventType = "servicio" | "inspeccion" | "falla" | "traslado" | "lectura" | "alta" | "baja" | "garantia" | "nota";
export type EventRefType = "ot" | "visita" | "manual";

// ---------- Entidades ----------
export interface Asset {
  id: string;
  tag: string | null;
  name: string;
  type: AssetType | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  client_id: string | null;
  site_id: string | null;              // ref suave a field_sites
  parent_asset_id: string | null;
  status: AssetStatus;
  criticidad: number;                  // 1..5
  installed_at: string | null;
  warranty_until: string | null;
  expected_life_years: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  specs: Record<string, unknown> | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // ---- Parámetros de confiabilidad (F1a). OPCIONALES a propósito: una base sin migrar
  // no devuelve estas columnas, y el motor lo tolera (cae a su fuente por defecto).
  regimen_horas_dia?: number | null;   // horas/día que opera → convierte calendario en tiempo operativo
  valor_reposicion?: number | null;    // ¿sigue conviniendo repararlo?
  mtbf_referencia?: number | null;     // cada cuánto DEBERÍA fallar (arranque en frío)
  mtbr_referencia?: number | null;     // cada cuánto DEBERÍA intervenirse
  // Joins / calculados
  client?: Client | null;
  health?: number;                     // 0-100, calculado on-read
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  type: EventType;
  event_date: string;
  description: string | null;
  ref_type: EventRefType | null;
  ref_id: string | null;
  cost: number | null;
  currency: Currency;
  downtime_hours: number | null;
  created_by: string | null;
  created_at: string;
  // ---- Taxonomía de confiabilidad (F1a). OPCIONALES: `null` significa "sin clasificar"
  // (distinto de `false`, que es "verificado que no"). El motor las deriva de `type`
  // cuando vienen null, así que funciona igual antes y después de la migración.
  es_falla?: boolean | null;
  es_intervencion_fisica?: boolean | null;
  modo_de_falla?: string | null;         // sello, rodamiento, acople… (texto libre, sin CHECK)
  out_of_service_start?: string | null;  // ventana de fuera de servicio: el motor la prefiere
  out_of_service_end?: string | null;    //   sobre downtime_hours cuando las dos están cargadas
  source?: string | null;                // manual | ot | visita | inferido (sin CHECK)
  ref_item_id?: string | null;           // ref SUAVE al ítem de la OT (sin FK a Trace)
}

export interface AssetDocument {
  id: string;
  asset_id: string;
  doc_type: string | null;
  name: string | null;
  file_path: string;
  expires_at: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Join
  asset?: Pick<Asset, "id" | "tag" | "name"> | null;
  // Calculados en la capa de lectura (NO en el render: Date.now() durante el render rompe la
  // hidratación). Molde de getFieldDocuments en lib/field/queries.ts.
  days_until_expiry?: number | null;
  expiry_light?: TrafficLight | null;
}

export interface AssetComponent {
  id: string;
  asset_id: string;
  product_id: string | null;
  name: string | null;
  serial: string | null;
  qty: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Join (producto del catálogo, ref suave)
  product?: { id: string; code: string | null; name: string; unit: string } | null;
}
