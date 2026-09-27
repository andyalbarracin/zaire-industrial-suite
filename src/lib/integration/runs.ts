// runs.ts — src/lib/integration/runs.ts — 2026-08-27
// Lectura de la bitácora de corridas (zc_sync_runs) para el panel de Ajustes.

import { createClient } from "@/lib/supabase/server";
import type { SyncEntity, SyncRun } from "./types";

const ENTIDADES: SyncEntity[] = ["customer", "product"];

/**
 * Última corrida de cada entidad.
 *
 * Devuelve [] ante cualquier error a propósito: las tablas zc_ solo existen en las
 * bases donde se corrió zaire_connect_schema.sql. Si alguien prende el flag antes de
 * correr la SQL, el panel muestra "sin corridas" en vez de romper toda la página de
 * Ajustes. El error real de esa situación se ve al importar, que sí avisa explícitamente.
 */
export async function getLastRuns(): Promise<SyncRun[]> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const resultados = await Promise.all(
      ENTIDADES.map((entity) =>
        sb.from("zc_sync_runs").select("*").eq("entity", entity).order("started_at", { ascending: false }).limit(1)
      )
    );

    return resultados.flatMap((r) => (r.data ?? []) as SyncRun[]);
  } catch {
    return [];
  }
}
