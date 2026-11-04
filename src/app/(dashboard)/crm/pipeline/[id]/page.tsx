// page.tsx — src/app/(dashboard)/crm/pipeline/[id]/page.tsx — 2026-11-02
// Zaire CRM — Ficha de detalle de una oportunidad.
//
// La ruta ya estaba declarada en ROUTES.crm.oportunidad desde el armado del módulo; faltaba la
// página. Hasta ahora la oportunidad solo se podía ver en el modal de edición del pipeline.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getOpportunity, getActivitiesForOpportunity, getAttachments,
  getPipelineStages, getCrmClients, getEntityHistory,
} from "@/lib/crm/queries";
import { OpportunityDetail } from "@/components/crm/opportunity-detail";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Todo en una sola tanda: ninguna consulta depende del resultado de otra, y encadenarlas solo
  // sumaría idas y vueltas a la base.
  const [opportunity, activities, attachments, history, stages, clients, { data: profiles }, { data: { user } }] =
    await Promise.all([
      getOpportunity(id),
      getActivitiesForOpportunity(id),
      getAttachments("opportunity", id),
      // El historial sale de `audit_logs`, que ya se escribía en cada cambio.
      getEntityHistory("crm_opportunity", id),
      getPipelineStages(),
      getCrmClients(),
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase.auth.getUser(),
    ]);

  if (!opportunity) notFound();

  return (
    <OpportunityDetail
      opportunity={opportunity}
      activities={activities}
      attachments={attachments}
      history={history}
      stages={stages}
      clients={clients}
      profiles={(profiles ?? []) as Pick<Profile, "id" | "full_name">[]}
      currentProfile={user ? { id: user.id } : null}
    />
  );
}
