// types.ts — src/lib/stock/types.ts — 2026-07-18
// Tipos de las tablas stock_ (Zaire Stock). Espejo del SQL en
// .docs/zaire-stock/sql/zaire_stock_schema.sql. Reutiliza tipos compartidos.

import type { Product, Profile, Currency } from "@/lib/types/database";

export type { Product, Profile, Currency };

// ---------- Uniones (espejo de los CHECK del SQL) ----------
export type WarehouseType = "deposito" | "vehiculo";
export type MovementType = "entrada" | "salida" | "ajuste" | "transferencia" | "consumo";
export type MovementRefType = "compra" | "ot" | "visita" | "ajuste" | "conteo" | "transferencia" | "otro";
export type SerialStatus = "disponible" | "reservado" | "despachado" | "consumido";
export type ReservationStatus = "activa" | "consumida" | "liberada";
export type ReservationRefType = "ot" | "quote" | "visita" | "manual";

// ---------- Entidades ----------
export interface Warehouse {
  id: string;
  code: string | null;
  name: string;
  type: WarehouseType;
  field_vehicle_id: string | null;   // ref. suave a field_vehicles (depósito móvil)
  address: string | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockLevel {
  id: string;
  product_id: string;
  warehouse_id: string;
  on_hand: number;
  reserved: number;
  available: number;      // columna generada (on_hand - reserved)
  avg_cost: number;       // WAC
  min_qty: number;        // punto de reorden
  created_at: string;
  updated_at: string;
  // Joins
  product?: Product;
  warehouse?: Warehouse;
}

export interface StockMovement {
  id: string;
  doc_number: string | null;
  product_id: string;
  warehouse_id: string;
  type: MovementType;
  qty: number;            // + entrada / - salida|consumo
  unit_cost: number | null;
  ref_type: MovementRefType | null;
  ref_id: string | null;
  counterparty_warehouse_id: string | null;
  serial: string | null;
  lot: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joins
  product?: Product;
  warehouse?: Warehouse;
}

export interface StockSerial {
  id: string;
  product_id: string;
  serial: string;
  lot: string | null;
  warehouse_id: string | null;
  status: SerialStatus;
  unit_cost: number | null;
  ref_type: string | null;
  ref_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  product?: Product;
  warehouse?: Warehouse;
}

export interface StockReservation {
  id: string;
  product_id: string;
  warehouse_id: string;
  qty: number;
  ref_type: ReservationRefType;
  ref_id: string | null;
  status: ReservationStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  product?: Product;
  warehouse?: Warehouse;
}
