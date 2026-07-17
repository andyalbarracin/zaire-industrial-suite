// route.ts — /api/notifications/ot-request — 2026-07-16
// SCAFFOLD de notificación por email cuando llega una solicitud de OT/OTS desde Zaire Field.
// Todavía NO envía emails reales: deja listo el punto de integración (ver TODO). Es idempotente
// y fire-and-forget desde el cliente; nunca bloquea el flujo de la solicitud.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { reportId?: string; notes?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  if (!body.reportId) return NextResponse.json({ error: "Falta reportId" }, { status: 400 });

  // TODO(email): integrar proveedor (Resend / SendGrid / SMTP de Supabase) y enviar realmente.
  //   1) Destinatarios: administradores → profiles con role='admin' y email no nulo.
  //   2) Datos del reporte + visita: leer server-side desde field_visit_reports por reportId
  //      (equipo, cliente, técnico, hallazgos, requires_repair) — el cliente solo manda el id.
  //   3) Asunto: "Nueva solicitud de OT/OTS desde Zaire Field".
  //   4) Cuerpo: resumen + link a la visita (/field/visitas/[id]).
  //   5) Registrar el envío (tabla de notificaciones) para no reenviar.
  // Por ahora solo se deja constancia en el log; no se envía nada.
  console.info("[ot-request notification] scaffold disparado", { reportId: body.reportId });

  return NextResponse.json({ ok: true, delivered: false, note: "scaffold — email todavía no implementado" });
}
