// page.tsx — src/app/(dashboard)/crm/leads/page.tsx — 2026-07-16
// Zaire CRM — ABM de leads (prospectos) con conversión a cliente.

import { createClient } from "@/lib/supabase/server";
import { getLeads } from "@/lib/crm/queries";
import { LeadsTable } from "@/components/crm/leads-table";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();
  const [leads, { data: profiles }] = await Promise.all([
    getLeads(),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Leads</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {leads.length} prospectos en seguimiento comercial
        </p>
      </div>
      <LeadsTable initialLeads={leads} profiles={(profiles ?? []) as Pick<Profile, "id" | "full_name">[]} />
    </div>
  );
}
