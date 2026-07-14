// route.ts — src/app/api/field/simulate/route.ts — 2026-07-13
// SIMULADOR DEMO (solo para demostración, no producción). Genera una traza de pings
// que se acerca al sitio de la visita y entra a la geocerca, disparando el arribo.
// POST { visit_id }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STEPS = 8;

export async function POST(request: NextRequest) {
  let body: { visit_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { visit_id } = body;
  if (!visit_id) return NextResponse.json({ error: "Falta visit_id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: visit } = await sb
    .from("field_visits")
    .select("id, technician_id, site:field_sites(latitude, longitude, geofence_radius_m)")
    .eq("id", visit_id)
    .maybeSingle();

  const site = visit?.site;
  if (!visit || !site || site.latitude == null || site.longitude == null) {
    return NextResponse.json({ error: "La visita no tiene un sitio con coordenadas" }, { status: 400 });
  }

  // Reiniciar estado para poder re-correr la demo
  await sb.from("field_location_pings").delete().eq("visit_id", visit_id);
  await sb.from("field_visit_events").delete().eq("visit_id", visit_id).in("event_type", ["salida", "geocerca_entrada", "geocerca_salida"]);
  await sb.from("field_visits").update({ status: "en_curso", started_at: new Date().toISOString(), arrived_at: null, departed_at: null }).eq("id", visit_id);

  const destLat = Number(site.latitude);
  const destLng = Number(site.longitude);
  const startLat = destLat + 0.12; // ~13 km al NO del sitio
  const startLng = destLng - 0.12;

  const now = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pings: any[] = [];
  for (let i = 0; i < STEPS; i++) {
    const t = i / (STEPS - 1);
    const lat = Number((startLat + t * (destLat - startLat)).toFixed(7));
    const lng = Number((startLng + t * (destLng - startLng)).toFixed(7));
    const recordedAt = new Date(now - (STEPS - 1 - i) * 2 * 60 * 1000).toISOString();
    pings.push({
      visit_id,
      technician_id: visit.technician_id ?? null,
      latitude: lat,
      longitude: lng,
      accuracy_m: 8,
      speed_kmh: i === STEPS - 1 ? 5 : 70,
      heading: 135,
      recorded_at: recordedAt,
    });
  }

  await sb.from("field_location_pings").insert(pings);

  // Eventos: salida (primer ping) + geocerca_entrada (último, dentro del radio) + arribo
  const startIso = pings[0].recorded_at;
  const arriveIso = pings[pings.length - 1].recorded_at;
  await sb.from("field_visit_events").insert([
    { visit_id, event_type: "salida", latitude: startLat, longitude: startLng, occurred_at: startIso, description: "Salida hacia el sitio (simulado)." },
    { visit_id, event_type: "geocerca_entrada", latitude: destLat, longitude: destLng, occurred_at: arriveIso, description: "Ingreso a geocerca del sitio (arribo confirmado)." },
  ]);
  await sb.from("field_visits").update({ status: "en_sitio", arrived_at: arriveIso }).eq("id", visit_id);

  return NextResponse.json({ ok: true, pings: pings.length, arrived: true });
}
