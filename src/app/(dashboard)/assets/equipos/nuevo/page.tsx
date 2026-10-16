// page.tsx — src/app/(dashboard)/assets/equipos/nuevo/page.tsx — 2026-10-15
// Alta de un equipo en página completa. Antes era un modal: ver asset-form-page.tsx.

import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import { AssetFormPage } from "@/components/assets/asset-form-page";
import type { Client } from "@/lib/assets/types";

export const dynamic = "force-dynamic";

export default async function NuevoEquipoPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Solo lo que el formulario necesita. NO se llama a getAssets(): dar de alta un equipo no
  // depende de la flota, y traerla entera sería cargar eventos y documentos de todos para nada.
  const [{ data: clients }, sites] = await Promise.all([
    supabase.from("clients").select("id, business_name, tax_id, contact_name, email, phone, city").order("business_name"),
    isModuleEnabled("field")
      ? sb.from("field_sites").select("id, name").is("deleted_at", null).eq("is_active", true).order("name")
          .then((r: { data: { id: string; name: string }[] | null }) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  return <AssetFormPage asset={null} clients={(clients ?? []) as Client[]} sites={sites} />;
}
