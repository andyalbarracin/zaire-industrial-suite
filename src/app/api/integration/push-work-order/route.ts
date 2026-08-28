// route.ts — src/app/api/integration/push-work-order/route.ts — 2026-08-28
// Envía una OT/OTS al sistema externo. Solo admin, solo con la integración habilitada.
// Con INTEGRATION_ENABLED apagado devuelve 404 sin cargar el servicio de envío.

import { NextRequest, NextResponse } from "next/server";
import { bloquearSiNoAutorizado, checkRateLimit } from "@/lib/integration/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  // Bajo a propósito: cada envío escribe en el ERP del cliente.
  if (!checkRateLimit(ip, 10, 60000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const bloqueo = await bloquearSiNoAutorizado();
  if (bloqueo) return bloqueo;

  const body = await request.json().catch(() => null);
  const orderId = body?.orderId as string | undefined;
  if (!orderId) return NextResponse.json({ error: "Falta orderId" }, { status: 400 });

  const { pushWorkOrder } = await import("@/lib/integration/push-service");

  try {
    const r = await pushWorkOrder(orderId);
    // 409 cuando quedó trabado por un envío anterior a medias: no es un error del
    // servidor, es el sistema negándose a arriesgar un duplicado.
    return NextResponse.json(r, { status: r.ok ? 200 : r.needsReview ? 409 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
