// page.tsx — src/app/(dashboard)/crm/leads/[id]/page.tsx — 2026-07-17
// Zaire CRM — Ficha de detalle de un lead.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLead, getActivitiesForLead, getAttachments } from "@/lib/crm/queries";
import { LeadDetail } from "@/components/crm/lead-detail";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [lead, activities, attachments, { data: profiles }, { data: { user } }] = await Promise.all([
    getLead(id),
    getActivitiesForLead(id),
    getAttachments("lead", id),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.auth.getUser(),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetail
      lead={lead}
      activities={activities}
      attachments={attachments}
      profiles={(profiles ?? []) as Pick<Profile, "id" | "full_name">[]}
      currentProfile={user ? { id: user.id } : null}
    />
  );
}
