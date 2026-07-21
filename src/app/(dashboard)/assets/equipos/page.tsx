// page.tsx — src/app/(dashboard)/assets/equipos/page.tsx — 2026-07-20
// Equipos: listado con salud/criticidad/estado + ABM. Los sitios (Field) solo si el módulo está.

import { createClient } from "@/lib/supabase/server";
import { getAssets } from "@/lib/assets/queries";
import { isModuleEnabled } from "@/lib/modules";
import { AssetsTable } from "@/components/assets/assets-table";
import type { Client } from "@/lib/assets/types";

export const dynamic = "force-dynamic";

export default async function EquiposPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [assets, { data: clients }] = await Promise.all([
    getAssets(),
    supabase.from("clients").select("id, business_name, tax_id, contact_name, email, phone, city").order("business_name"),
  ]);

  let sites: { id: string; name: string }[] = [];
  if (isModuleEnabled("field")) {
    const { data } = await sb.from("field_sites").select("id, name").is("deleted_at", null).eq("is_active", true).order("name");
    sites = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Equipos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{assets.length} equipo(s) · salud, criticidad y estado</p>
      </div>
      <AssetsTable initialAssets={assets} clients={(clients ?? []) as Client[]} sites={sites} />
    </div>
  );
}
