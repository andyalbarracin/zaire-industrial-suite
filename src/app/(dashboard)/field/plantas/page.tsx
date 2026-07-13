// page.tsx — src/app/(dashboard)/field/plantas/page.tsx — 2026-07-13
// Zaire Field — ABM de plantas/sitios con geocerca.

import { createClient } from "@/lib/supabase/server";
import { getSites } from "@/lib/field/queries";
import { SitesTable } from "@/components/field/sites-table";
import type { Client } from "@/lib/field/types";

export const dynamic = "force-dynamic";

export default async function PlantasPage() {
  const supabase = await createClient();
  const [sites, { data: clients }] = await Promise.all([
    getSites(true),
    supabase
      .from("clients")
      .select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at")
      .eq("is_active", true)
      .order("business_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--sas-text)">Plantas</h1>
        <p className="text-sm text-(--sas-text-muted) mt-0.5">
          {sites.length} plantas / sitios registrados
        </p>
      </div>
      <SitesTable initialSites={sites} clients={(clients ?? []) as Client[]} />
    </div>
  );
}
