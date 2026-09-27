// import-service.ts — src/lib/integration/import-service.ts — 2026-08-27
// Servicio de importación: adaptador → modelo canónico → tablas reales de Zaire.
// Es el único lugar donde Connect escribe en `clients` / `products`.
//
// IDEMPOTENCIA: la correspondencia entre el registro externo y el de Zaire vive en
// zc_external_ids. Un external_id ya mapeado se actualiza (o se saltea si no cambió);
// uno nuevo se crea y se guarda el mapeo. Correr dos veces seguidas no duplica nada.
//
// NO ADOPTA registros preexistentes: si en Zaire ya hay un producto con el mismo `code`
// cargado a mano, la importación NO se apropia de él. El insert choca contra
// products_code_unique, ese registro se cuenta como error y el resto sigue entrando.
//
// AISLAMIENTO DE ERRORES: un registro que falla nunca aborta la corrida. Se escribe en
// lotes por velocidad y, si un lote falla, se reintenta registro por registro para
// atribuir el error exacto.

import { createClient } from "@/lib/supabase/server";
import { getIntegrationConfig } from "./config";
import { huboCambio, toClientRow, toProductRow, type ClientImportRow, type ProductImportRow } from "./mapping";
import { getAdapter } from "./registry";
import type { ImportEntity, SyncRunError, SyncRunResult, SyncRunStatus } from "./types";

/** Presupuesto total de escritura. La lectura tiene el suyo dentro del adaptador. */
const PRESUPUESTO_ESCRITURA_MS = 20_000;
/** Filas por lote en los inserts masivos. */
const TAMANO_LOTE = 100;
/** Tope de ids por consulta a zc_external_ids (evita URLs gigantes en PostgREST). */
const TAMANO_LOTE_LECTURA = 500;
/** Cuántos errores se guardan con detalle en la bitácora. */
const MAX_ERRORES_DETALLADOS = 20;

const TABLA: Record<ImportEntity, "clients" | "products"> = {
  customer: "clients",
  product: "products",
};

interface Preparado {
  external_id: string;
  external_write_date: string | null;
  row: ClientImportRow | ProductImportRow;
}

/**
 * Importa una entidad desde el sistema externo configurado.
 * Siempre deja una fila en zc_sync_runs, incluso si todo falla: sin fallos silenciosos.
 */
export async function runImport(entity: ImportEntity, since?: Date): Promise<SyncRunResult> {
  // Cliente con la sesión del admin que disparó la importación: sus escrituras cumplen
  // las policies de clients/products (auth.uid() IS NOT NULL) sin bypassear RLS.
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { provider, syncMode } = getIntegrationConfig();
  const { data: { user } } = await supabase.auth.getUser();

  // ---------- 1. Abrir la corrida ----------
  const { data: runRaw, error: runError } = await sb
    .from("zc_sync_runs")
    .insert({ provider, entity, mode: syncMode, status: "running", triggered_by: user?.id ?? null })
    .select("id")
    .single();

  if (runError || !runRaw) {
    throw new Error(
      `No se pudo abrir la corrida en zc_sync_runs. ¿Corriste zaire_connect_schema.sql en esta base? (${runError?.message ?? "sin detalle"})`
    );
  }
  const runId = runRaw.id as string;

  const errores: SyncRunError[] = [];
  const avisos: string[] = [];
  let creados = 0;
  let actualizados = 0;
  let salteados = 0;
  let traidos = 0;
  let truncado = false;

  try {
    // ---------- 2. Leer del sistema externo ----------
    const adapter = await getAdapter();
    const fetched =
      entity === "customer" ? await adapter.fetchCustomers(since) : await adapter.fetchProducts(since);

    traidos = fetched.records.length;
    truncado = fetched.truncated;
    avisos.push(...fetched.warnings);

    // ---------- 3. Traducir al formato de la tabla real (try/catch por registro) ----------
    const preparados: Preparado[] = [];
    for (const rec of fetched.records) {
      try {
        const { row, warning } =
          entity === "customer"
            ? toClientRow(rec as Parameters<typeof toClientRow>[0])
            : toProductRow(rec as Parameters<typeof toProductRow>[0]);
        if (warning) avisos.push(`[${rec.external_id}] ${warning}`);
        preparados.push({ external_id: rec.external_id, external_write_date: rec.external_write_date, row });
      } catch (e) {
        errores.push({ external_id: rec.external_id, message: (e as Error).message });
      }
    }

    // ---------- 4. Traer los mapeos existentes (en lotes, una consulta por lote) ----------
    const mapeos = await leerMapeos(sb, provider, entity, preparados.map((p) => p.external_id));

    // ---------- 5. Clasificar: crear / actualizar / saltear ----------
    const aCrear: Preparado[] = [];
    const aActualizar: (Preparado & { id_zaire: string })[] = [];

    for (const p of preparados) {
      const mapeo = mapeos.get(p.external_id);
      if (!mapeo) {
        aCrear.push(p);
      } else if (huboCambio(p.external_write_date, mapeo.external_write_date)) {
        aActualizar.push({ ...p, id_zaire: mapeo.id_zaire });
      } else {
        salteados++;
      }
    }

    // ---------- 6. Escribir ----------
    const limite = Date.now() + PRESUPUESTO_ESCRITURA_MS;

    const resCrear = await crear(sb, entity, provider, aCrear, errores, limite);
    creados = resCrear.creados;
    truncado = truncado || resCrear.truncado;

    const resActualizar = await actualizar(sb, entity, provider, aActualizar, errores, limite);
    actualizados = resActualizar.actualizados;
    truncado = truncado || resActualizar.truncado;
  } catch (e) {
    // Falla global (credenciales, red, flag apagado): se cierra la corrida como 'error'.
    const message = (e as Error).message;
    await cerrarCorrida(sb, runId, "error", { creados, actualizados, salteados, traidos, errores, message });
    return {
      id: runId, entity, status: "error",
      created: creados, updated: actualizados, skipped: salteados, errors: errores.length,
      fetched: traidos, message, error_detail: errores.slice(0, MAX_ERRORES_DETALLADOS),
    };
  }

  // ---------- 7. Cerrar la corrida ----------
  const status: SyncRunStatus = truncado || errores.length > 0 ? "partial" : "ok";
  const message = armarMensaje(truncado, errores.length, avisos);

  await cerrarCorrida(sb, runId, status, { creados, actualizados, salteados, traidos, errores, message });

  return {
    id: runId, entity, status,
    created: creados, updated: actualizados, skipped: salteados, errors: errores.length,
    fetched: traidos, message, error_detail: errores.slice(0, MAX_ERRORES_DETALLADOS),
  };
}

// ---------------------------------------------------------------------------

interface Mapeo { id_zaire: string; external_write_date: string | null }

/* eslint-disable @typescript-eslint/no-explicit-any */

async function leerMapeos(sb: any, provider: string, entity: ImportEntity, ids: string[]): Promise<Map<string, Mapeo>> {
  const mapa = new Map<string, Mapeo>();

  for (let i = 0; i < ids.length; i += TAMANO_LOTE_LECTURA) {
    const lote = ids.slice(i, i + TAMANO_LOTE_LECTURA);
    const { data, error } = await sb
      .from("zc_external_ids")
      .select("external_id, id_zaire, external_write_date")
      .eq("provider", provider)
      .eq("entity", entity)
      .in("external_id", lote);

    if (error) throw new Error(`No se pudieron leer los mapeos de zc_external_ids: ${error.message}`);

    for (const m of data ?? []) {
      mapa.set(m.external_id as string, {
        id_zaire: m.id_zaire as string,
        external_write_date: (m.external_write_date as string | null) ?? null,
      });
    }
  }

  return mapa;
}

/**
 * Crea en lotes. El id se genera acá (en vez de dejar el default de la tabla) para saber
 * sin ambigüedad qué uuid le corresponde a cada external_id y poder insertar los mapeos
 * también en lote. Si un lote falla, se reintenta fila por fila para aislar al culpable
 * (típicamente un choque contra products_code_unique).
 */
async function crear(
  sb: any, entity: ImportEntity, provider: string,
  items: Preparado[], errores: SyncRunError[], limite: number
): Promise<{ creados: number; truncado: boolean }> {
  const tabla = TABLA[entity];
  let creados = 0;

  for (let i = 0; i < items.length; i += TAMANO_LOTE) {
    if (Date.now() >= limite) return { creados, truncado: true };

    const lote = items.slice(i, i + TAMANO_LOTE).map((p) => ({ ...p, id: crypto.randomUUID() }));

    const { error } = await sb.from(tabla).insert(lote.map((p) => ({ id: p.id, ...p.row })));

    const insertados = error
      ? await crearUnoAUno(sb, tabla, lote, errores)
      : lote;

    creados += insertados.length;
    if (insertados.length > 0) await guardarMapeos(sb, provider, entity, insertados, errores);
  }

  return { creados, truncado: false };
}

async function crearUnoAUno(
  sb: any, tabla: string,
  lote: (Preparado & { id: string })[], errores: SyncRunError[]
): Promise<(Preparado & { id: string })[]> {
  const ok: (Preparado & { id: string })[] = [];

  for (const p of lote) {
    const { error } = await sb.from(tabla).insert({ id: p.id, ...p.row });
    if (error) errores.push({ external_id: p.external_id, message: error.message });
    else ok.push(p);
  }

  return ok;
}

/** Guarda la correspondencia externo ↔ Zaire. Sin esto la próxima corrida duplicaría. */
async function guardarMapeos(
  sb: any, provider: string, entity: ImportEntity,
  items: (Preparado & { id: string })[], errores: SyncRunError[]
): Promise<void> {
  const filas = items.map((p) => ({
    provider, entity,
    external_id: p.external_id,
    id_zaire: p.id,
    external_write_date: p.external_write_date,
  }));

  const { error } = await sb.from("zc_external_ids").insert(filas);
  if (!error) return;

  for (const fila of filas) {
    const { error: e } = await sb.from("zc_external_ids").insert(fila);
    if (e) errores.push({ external_id: fila.external_id, message: `Registro creado pero sin mapear: ${e.message}` });
  }
}

/** Actualiza uno por uno: después de la primera corrida son pocos (el resto se saltea). */
async function actualizar(
  sb: any, entity: ImportEntity, provider: string,
  items: (Preparado & { id_zaire: string })[], errores: SyncRunError[], limite: number
): Promise<{ actualizados: number; truncado: boolean }> {
  const tabla = TABLA[entity];
  let actualizados = 0;

  for (const p of items) {
    if (Date.now() >= limite) return { actualizados, truncado: true };

    const { error } = await sb.from(tabla).update(p.row).eq("id", p.id_zaire);
    if (error) {
      errores.push({ external_id: p.external_id, message: error.message });
      continue;
    }

    // Recién acá se avanza el write_date: si la actualización falló, la próxima
    // corrida tiene que volver a intentarlo en vez de saltearlo.
    const { error: e } = await sb
      .from("zc_external_ids")
      .update({ external_write_date: p.external_write_date })
      .eq("provider", provider)
      .eq("entity", entity)
      .eq("id_zaire", p.id_zaire);

    if (e) errores.push({ external_id: p.external_id, message: `Actualizado pero sin refrescar el mapeo: ${e.message}` });
    actualizados++;
  }

  return { actualizados, truncado: false };
}

async function cerrarCorrida(
  sb: any, runId: string, status: SyncRunStatus,
  d: { creados: number; actualizados: number; salteados: number; traidos: number; errores: SyncRunError[]; message: string | null }
): Promise<void> {
  await sb
    .from("zc_sync_runs")
    .update({
      status,
      created: d.creados,
      updated: d.actualizados,
      skipped: d.salteados,
      errors: d.errores.length,
      fetched: d.traidos,
      error_detail: d.errores.length > 0 ? d.errores.slice(0, MAX_ERRORES_DETALLADOS) : null,
      message: d.message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

function armarMensaje(truncado: boolean, cantErrores: number, avisos: string[]): string | null {
  const partes: string[] = [];
  if (truncado) partes.push("Se agotó el tiempo de la corrida: volvé a ejecutar para continuar (lo ya importado se saltea).");
  if (cantErrores > 0) partes.push(`${cantErrores} registro(s) con error.`);
  if (avisos.length > 0) partes.push(`${avisos.length} aviso(s). Ej.: ${avisos[0]}`);
  return partes.length > 0 ? partes.join(" ") : null;
}
