// route.ts — src/app/api/field/ping/route.ts — 2026-07-13
// Ingesta de pings GPS + detección de geocerca. Preparado para la app móvil (Expo).
// POST { visit_id, technician_id, latitude, longitude, accuracy_m?, speed_kmh?, heading? }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { haversineMeters } from "@/lib/field/geo";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  let body: {
    visit_id?: string;
    technician_id?: string;
    latitude?: number;
    longitude?: number;
    accuracy_m?: number;
    speed_kmh?: number;
    heading?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { visit_id, technician_id, latitude, longitude, accuracy_m, speed_kmh, heading } = body;
  if (!visit_id || latitude == null || longitude == null) {
    return NextResponse.json({ error: "Faltan campos requeridos (visit_id, latitude, longitude)" }, { status: 400 });
  }

  if (!checkRateLimit(`${ip}:${technician_id ?? visit_id}`)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // 1. Insertar ping (alto volumen — tabla aislada)
  const { error: pingError } = await sb.from("field_location_pings").insert({
    visit_id,
    technician_id: technician_id ?? null,
    latitude,
    longitude,
    accuracy_m: accuracy_m ?? null,
    speed_kmh: speed_kmh ?? null,
    heading: heading ?? null,
  });
  if (pingError) {
    return NextResponse.json({ error: "Error al registrar el ping" }, { status: 500 });
  }

  // 2. Traer visita + sitio para evaluar geocerca
  const { data: visit } = await sb
    .from("field_visits")
    .select("id, status, arrived_at, departed_at, site:field_sites(latitude, longitude, geofence_radius_m)")
    .eq("id", visit_id)
    .maybeSingle();

  const result = { ok: true, inside: false, arrived: false, departed: false };

  const site = visit?.site;
  if (visit && site && site.latitude != null && site.longitude != null) {
    const distance = haversineMeters(latitude, longitude, site.latitude, site.longitude);
    const inside = distance <= (site.geofence_radius_m ?? 150);
    result.inside = inside;

    const nowIso = new Date().toISOString();

    if (inside && !visit.arrived_at) {
      // Entrada a geocerca: setear arribo + estado en_sitio + evento
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any> = { arrived_at: nowIso };
      if (visit.status === "planificada" || visit.status === "en_curso") patch.status = "en_sitio";
      await sb.from("field_visits").update(patch).eq("id", visit_id);
      await sb.from("field_visit_events").insert({
        visit_id,
        event_type: "geocerca_entrada",
        latitude,
        longitude,
        description: "Ingreso a geocerca del sitio (arribo confirmado).",
      });
      result.arrived = true;
    } else if (!inside && visit.arrived_at && !visit.departed_at) {
      // Salida de geocerca
      await sb.from("field_visits").update({ departed_at: nowIso }).eq("id", visit_id);
      await sb.from("field_visit_events").insert({
        visit_id,
        event_type: "geocerca_salida",
        latitude,
        longitude,
        description: "Salida de la geocerca del sitio.",
      });
      result.departed = true;
    }
  }

  return NextResponse.json(result);
}
