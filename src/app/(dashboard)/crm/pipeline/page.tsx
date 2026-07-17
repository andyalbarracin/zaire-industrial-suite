// page.tsx — src/app/(dashboard)/crm/pipeline/page.tsx — 2026-07-16
// Zaire CRM — Pipeline de oportunidades (Kanban por etapa + lista).

import { createClient } from "@/lib/supabase/server";
import { getOpportunities, getCrmClients, getPipelineStages } from "@/lib/crm/queries";
import { PipelineView } from "@/components/crm/pipeline-view";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await createClient();
  const [opportunities, stages, clients, { data: profiles }] = await Promise.all([
    getOpportunities(),
    getPipelineStages(),
    getCrmClients(),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Pipeline</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {opportunities.length} oportunidades en el embudo comercial
        </p>
      </div>
      <PipelineView
        initialOpportunities={opportunities}
        initialStages={stages}
        clients={clients}
        profiles={(profiles ?? []) as Pick<Profile, "id" | "full_name">[]}
      />
    </div>
  );
}
