// types.ts — src/lib/integration/types.ts — 2026-08-27
// Contrato de adaptador y modelo canónico de Zaire Connect. Independiente de plataforma:
// ni Odoo ni Tango ni Supabase aparecen acá. Cada adaptador traduce SU formato a estos tipos,
// y el servicio de importación traduce estos tipos a las tablas reales de Zaire.

import type { IntegrationProvider } from "./config";

/** Entidades que Connect sabe sincronizar. Fase 1: clientes y productos. */
export type SyncEntity = "customer" | "product";

// ---------- Modelo canónico ----------
// Deliberadamente mínimo: solo lo que Zaire puede guardar hoy. Sumar campos acá
// obliga a mapearlos en `mapping.ts`, así que no se agrega nada "por las dudas".

export interface CanonicalCustomer {
  /** Id en el sistema externo. Es la clave del mapeo en zc_external_ids. */
  external_id: string;
  /** Fecha de última modificación en el sistema externo (ISO). Permite saltear lo que no cambió. */
  external_write_date: string | null;
  nombre: string;
  cuit?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
}

export interface CanonicalProduct {
  external_id: string;
  external_write_date: string | null;
  codigo?: string | null;
  nombre: string;
  precio?: number | null;
  moneda?: string | null;
  unidad?: string | null;
}

// ---------- Contrato de adaptador ----------

export interface TestConnectionResult {
  ok: boolean;
  /** Versión / estado del sistema externo cuando la conexión funciona. */
  info?: string;
  error?: string;
}

/**
 * Todo adaptador de plataforma implementa esto. Para sumar Tango: escribir un
 * módulo nuevo en `adapters/tango/` que cumpla la interfaz y registrarlo en
 * `registry.ts`. El núcleo no se toca.
 */
export interface ConnectorAdapter {
  readonly provider: IntegrationProvider;
  testConnection(): Promise<TestConnectionResult>;
  fetchCustomers(since?: Date): Promise<FetchResult<CanonicalCustomer>>;
  fetchProducts(since?: Date): Promise<FetchResult<CanonicalProduct>>;

  // Previsto para fases futuras — NO implementar todavía:
  // fetchStock?(since?: Date): Promise<FetchResult<CanonicalStock>>;
  // pushBillable?(order: CanonicalOrder): Promise<PushResult>;
}

/**
 * Resultado de una lectura paginada. `truncated` indica que quedó gente afuera
 * porque se agotó el presupuesto de tiempo: la corrida se marca 'partial' y el
 * admin vuelve a ejecutar (lo ya importado se saltea, así que avanza).
 */
export interface FetchResult<T> {
  records: T[];
  truncated: boolean;
  /** Avisos no fatales (ej. moneda de Odoo que Zaire no soporta). */
  warnings: string[];
}

// ---------- Bitácora de corridas (espejo de zc_sync_runs) ----------

export type SyncRunStatus = "running" | "ok" | "partial" | "error";

export interface SyncRunError {
  external_id: string;
  message: string;
}

export interface SyncRun {
  id: string;
  provider: string;
  entity: SyncEntity;
  mode: string;
  status: SyncRunStatus;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  fetched: number;
  error_detail: SyncRunError[] | null;
  message: string | null;
  started_at: string;
  finished_at: string | null;
  triggered_by: string | null;
}

/** Lo que devuelve una importación al terminar (lo que muestra el panel). */
export type SyncRunResult = Pick<
  SyncRun,
  "id" | "entity" | "status" | "created" | "updated" | "skipped" | "errors" | "fetched" | "message"
> & { error_detail: SyncRunError[] };
