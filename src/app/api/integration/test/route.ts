// route.ts — src/app/api/integration/test/route.ts — 2026-08-27
// Prueba la conexión con el sistema externo configurado. Solo lectura, no importa nada.
// Con INTEGRATION_ENABLED apagado devuelve 404 sin cargar una sola línea del adaptador.

import { NextRequest, NextResponse } from "next/server";
import { bloquearSiNoAutorizado, checkRateLimit } from "@/lib/integration/guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });

  const bloqueo = await bloquearSiNoAutorizado();
  if (bloqueo) return bloqueo;

  // Recién acá se carga el registry (y con él, el adaptador).
  const { getAdapter } = await import("@/lib/integration/registry");

  try {
    const adapter = await getAdapter();
    return NextResponse.json(await adapter.testConnection());
  } catch (e) {
    // Config incompleta (falta alguna ODOO_*) o proveedor desconocido.
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
