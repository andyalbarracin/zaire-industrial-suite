// route.ts — src/app/api/integration/import/route.ts — 2026-08-27
// Dispara la importación de una entidad desde el sistema externo. Solo admin.
// Con INTEGRATION_ENABLED apagado devuelve 404 sin cargar el servicio de importación.

import { NextRequest, NextResponse } from "next/server";
import { bloquearSiNoAutorizado, checkRateLimit } from "@/lib/integration/guard";
import type { ImportEntity } from "@/lib/integration/types";

export const dynamic = "force-dynamic";
// Una importación grande necesita más que el default: lectura paginada de Odoo
// (throttleada a ~60 req/min) más las escrituras en Supabase.
export const maxDuration = 60;

const ENTIDADES: ImportEntity[] = ["customer", "product"];

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  // Más restrictivo que el resto: una importación es cara.
  if (!checkRateLimit(ip, 10, 60000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const bloqueo = await bloquearSiNoAutorizado();
  if (bloqueo) return bloqueo;

  const body = await request.json().catch(() => null);
  const entity = body?.entity as ImportEntity | undefined;
  if (!entity || !ENTIDADES.includes(entity)) {
    return NextResponse.json({ error: `Entidad inválida. Esperaba una de: ${ENTIDADES.join(", ")}` }, { status: 400 });
  }

  const { runImport } = await import("@/lib/integration/import-service");

  try {
    return NextResponse.json(await runImport(entity));
  } catch (e) {
    // Solo llega acá si ni siquiera se pudo abrir la corrida (típicamente, falta
    // correr zaire_connect_schema.sql en esta base). Los errores de la importación
    // en sí quedan registrados en zc_sync_runs y vuelven con status 'error'.
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
