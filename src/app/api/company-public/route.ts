// route.ts — src/app/api/company-public/route.ts — 2026-07-14
// Endpoint público que devuelve datos básicos de la empresa (sin autenticación).
// Usa el service client para leer company_settings; con fallback genérico neutro.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const FALLBACK = { nombre: "Empresa", cuit: null, direccion: null, ciudad: null, email: null };

export async function GET() {
  try {
    const sb = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any)
      .from("company_settings")
      .select("nombre, cuit, direccion, ciudad, email")
      .eq("id", 1)
      .single();

    return NextResponse.json(data ?? FALLBACK);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
