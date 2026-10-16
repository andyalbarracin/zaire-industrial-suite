// page.tsx — src/app/(dashboard)/assets/equipos/[id]/editar/page.tsx — 2026-10-15
// Edición de un equipo en página completa. Mismo formulario que el alta.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import { AssetFormPage } from "@/components/assets/asset-form-page";
import type { Asset, Client } from "@/lib/assets/types";

export const dynamic = "force-dynamic";

export default async function EditarEquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // El equipo crudo, no `getAssetFull`: el formulario edita columnas, no necesita el índice de
  // salud ni la hoja de vida, y calcularlos acá sería traer la flota entera para nada.
  const [{ data: asset }, { data: clients }, sites] = await Promise.all([
    sb.from("assets").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("clients").select("id, business_name, tax_id, contact_name, email, phone, city").order("business_name"),
    isModuleEnabled("field")
      ? sb.from("field_sites").select("id, name").is("deleted_at", null).eq("is_active", true).order("name")
          .then((r: { data: { id: string; name: string }[] | null }) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  if (!asset) notFound();

  return <AssetFormPage asset={asset as Asset} clients={(clients ?? []) as Client[]} sites={sites} />;
}
