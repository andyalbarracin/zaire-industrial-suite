// page.tsx — src/app/(dashboard)/crm/cuentas/[id]/page.tsx — 2026-07-17
// Zaire CRM — Ficha de detalle de una cuenta B2B (cliente + datos comerciales).

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClient, getContactsForClient, getOpportunitiesForClient,
  getActivitiesForClient, getClientSites, getAttachments, getPipelineStages,
} from "@/lib/crm/queries";
import { isModuleEnabled } from "@/lib/modules";
import { AccountDetail } from "@/components/crm/account-detail";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [client, contacts, opportunities, activities, sites, attachments, stages, { data: { user } }] = await Promise.all([
    getClient(id),
    getContactsForClient(id),
    getOpportunitiesForClient(id),
    getActivitiesForClient(id),
    getClientSites(id),
    getAttachments("client", id),
    getPipelineStages(),
    supabase.auth.getUser(),
  ]);

  if (!client) notFound();

  return (
    <AccountDetail
      client={client}
      contacts={contacts}
      opportunities={opportunities}
      activities={activities}
      sites={sites}
      attachments={attachments}
      stages={stages}
      fieldEnabled={isModuleEnabled("field")}
      currentProfile={user ? { id: user.id } : null}
    />
  );
}
