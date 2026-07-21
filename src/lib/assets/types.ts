// types.ts — src/lib/assets/types.ts — 2026-07-20
// Tipos de las tablas asset_ (Zaire Activos). Espejo del SQL en
// .docs/zaire-assets/sql/zaire_assets_schema.sql. Reusa tipos compartidos.

import type { Client, Profile, Currency } from "@/lib/types/database";

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
