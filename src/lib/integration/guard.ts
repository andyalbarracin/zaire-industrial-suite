// guard.ts — src/lib/integration/guard.ts — 2026-08-27
// Control de acceso compartido por las rutas /api/integration/*.
// Está factorizado a propósito (y no copiado en cada route) porque es la barrera de
// seguridad de la capa: una divergencia entre las dos rutas sería un agujero.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isIntegrationEnabled } from "./config";
import type { Profile } from "@/lib/types/database";

/**
 * Devuelve una respuesta para cortar la request, o null si puede seguir.
 *
 * El orden importa: con el flag apagado responde 404 SIN mirar la sesión ni tocar
 * nada de integración, así un deploy sin la variable se comporta como si estas rutas
 * no existieran.
 */
export async function bloquearSiNoAutorizado(): Promise<NextResponse | null> {
  if (!isIntegrationEnabled()) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileRaw } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as Pick<Profile, "role"> | null;
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  return null;
}

/** Rate limit en memoria por IP, mismo patrón que el resto de las rutas de la app. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
