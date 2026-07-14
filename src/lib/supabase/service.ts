// service.ts — src/lib/supabase/service.ts — 2026-07-14
// Cliente Supabase con clave de servicio (bypassa RLS). Solo usar en Server Components y API routes.
// Si no está SUPABASE_SERVICE_KEY, cae al anon key (degradación elegante).

import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false } }
  );
}
