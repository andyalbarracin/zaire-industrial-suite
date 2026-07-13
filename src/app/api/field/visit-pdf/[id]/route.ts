// route.ts — src/app/api/field/visit-pdf/[id]/route.ts — 2026-07-13
// Genera el PDF de la ficha de una visita de Zaire Field.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { VisitPdfDocument, type VisitPdfData } from "@/lib/pdf/visit-pdf-template";
import { BRANCHES } from "@/lib/constants";
import { VISIT_STATUS_LABELS, VISIT_PURPOSE_LABELS } from "@/lib/field/constants";
import React from "react";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) return new NextResponse("Demasiadas solicitudes", { status: 429 });

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: visit } = await sb
    .from("field_visits")
    .select("id, visit_number, status, purpose, branch_id, scheduled_at, started_at, arrived_at, departed_at, ended_at, planned_notes, technician:field_technicians(full_name), vehicle:field_vehicles(plate, brand, model), client:clients(business_name), site:field_sites(name)")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: report }, { data: events }] = await Promise.all([
    sb.from("field_visit_reports").select("equipment_tag, serial_number, medida, unidad_medida, marca, modelo, materiales_caras, materiales_orings, findings, recommendations, requires_repair").eq("visit_id", id).maybeSingle(),
    sb.from("field_visit_events").select("event_type, occurred_at, description").eq("visit_id", id).order("occurred_at", { ascending: true }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = visit as any;
  const data: VisitPdfData = {
    visit_number: v.visit_number,
    status: VISIT_STATUS_LABELS[v.status as keyof typeof VISIT_STATUS_LABELS] ?? v.status,
    purpose: v.purpose ? (VISIT_PURPOSE_LABELS[v.purpose as keyof typeof VISIT_PURPOSE_LABELS] ?? v.purpose) : null,
    branch: BRANCHES.find((b) => b.id === v.branch_id)?.name ?? v.branch_id ?? "—",
    technician: v.technician?.full_name ?? "—",
    vehicle: v.vehicle ? [v.vehicle.plate, v.vehicle.brand, v.vehicle.model].filter(Boolean).join(" ") : "—",
    client: v.client?.business_name ?? "—",
    site: v.site?.name ?? "—",
    scheduled_at: v.scheduled_at, started_at: v.started_at, arrived_at: v.arrived_at, departed_at: v.departed_at, ended_at: v.ended_at,
    planned_notes: v.planned_notes,
    report: report ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: ((events ?? []) as any[]).map((e) => ({ event_type: e.event_type, occurred_at: e.occurred_at, description: e.description })),
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(VisitPdfDocument, { data }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${v.visit_number ?? "visita"}.pdf"`,
    },
  });
}
