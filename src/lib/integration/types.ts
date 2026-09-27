// types.ts — src/lib/integration/types.ts — 2026-08-27
// Contrato de adaptador y modelo canónico de Zaire Connect. Independiente de plataforma:
// ni Odoo ni Tango ni Supabase aparecen acá. Cada adaptador traduce SU formato a estos tipos,
// y el servicio de importación traduce estos tipos a las tablas reales de Zaire.

import type { IntegrationProvider } from "./config";

/** Entidades que Connect sabe sincronizar, en cualquier dirección. */
export type SyncEntity = "customer" | "product" | "work_order";

/**
 * Subconjunto que se IMPORTA (sistema externo → Zaire).
 * `work_order` queda afuera a propósito: las OT solo viajan de Zaire hacia afuera.
 * Tenerlo como tipo aparte hace que el compilador rechace pedir "importar OTs".
 */
export type ImportEntity = "customer" | "product";

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

/**
 * Una OT/OTS lista para enviar al sistema externo. Es el único tipo de la capa que
 * viaja de Zaire hacia afuera.
 *
 * `referencia` es la clave de la búsqueda defensiva: antes de crear nada, el adaptador
 * busca en el sistema externo si ya existe algo con esta referencia. Es la segunda
 * línea contra duplicar (la primera es el índice único de zc_external_ids).
 */
export interface CanonicalWorkOrder {
  /** Id de la OT en Zaire. */
  id_zaire: string;
  /** Marca inequívoca y estable, ej. "Zaire Trace OT-2026-00123". */
  referencia: string;
  titulo: string;
  /** Id del cliente EN EL SISTEMA EXTERNO. Null si ese cliente no vino de una importación. */
  cliente_external_id: string | null;
  cliente_nombre: string | null;
  importe: number;
  moneda: string;
  fecha_estimada: string | null;
  /** Detalle en HTML con las líneas de la OT. */
  detalle: string;
}

export interface PushResult {
  /** Id del registro en el sistema externo. */
  external_id: string;
  /** true = se creó uno nuevo · false = se actualizó uno que ya existía. */
  created: boolean;
  /** true si se encontró por `referencia` en vez de por el mapeo local. */
  adopted?: boolean;
  /** Aviso no fatal: se envió, pero con alguna salvedad (ej. el cliente ya no existe). */
  warning?: string | null;
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

  /**
   * Envía una OT/OTS al sistema externo. Opcional: un adaptador puede ser solo lectura.
   *
   * CONTRATO OBLIGATORIO para quien lo implemente:
   *   · Si viene `existingExternalId`, ACTUALIZAR ese registro. Nunca crear otro.
   *   · Si no viene, BUSCAR PRIMERO por `wo.referencia`. Si aparece, actualizar ese y
   *     devolver `adopted: true`. Crear solo si la búsqueda no encontró nada.
   * Duplicar una OT en el ERP del cliente es un error con consecuencias económicas.
   */
  pushWorkOrder?(wo: CanonicalWorkOrder, existingExternalId?: string): Promise<PushResult>;

  // Previsto para fases futuras — NO implementar todavía:
  // fetchStock?(since?: Date): Promise<FetchResult<CanonicalStock>>;
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
