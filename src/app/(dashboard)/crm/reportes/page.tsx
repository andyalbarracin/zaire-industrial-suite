// page.tsx — src/app/(dashboard)/crm/reportes/page.tsx — 2026-07-18
// Zaire CRM — Reportes / Analítica de ventas.

import { createClient } from "@/lib/supabase/server";
import { getOpportunities, getLeads, getPipelineStages } from "@/lib/crm/queries";
import { CrmReportsView } from "@/components/crm/crm-reports-view";

export const dynamic = "force-dynamic";

export default async function CrmReportesPage() {
  const supabase = await createClient();
  const [opportunities, leads, stages, { data: profiles }] = await Promise.all([
    getOpportunities(),
    getLeads(),
    getPipelineStages(),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reportes</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Métricas de ventas y rendimiento del equipo</p>
      </div>
      <CrmReportsView opportunities={opportunities} leads={leads} stages={stages} profiles={(profiles ?? []) as { id: string; full_name: string }[]} />
    </div>
  );
}
