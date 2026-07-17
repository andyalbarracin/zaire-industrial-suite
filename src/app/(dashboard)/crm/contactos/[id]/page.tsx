// page.tsx — src/app/(dashboard)/crm/contactos/[id]/page.tsx — 2026-07-17
// Zaire CRM — Ficha de detalle de un contacto.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContact, getActivitiesForContact, getAttachments, getCrmClients } from "@/lib/crm/queries";
import { ContactDetail } from "@/components/crm/contact-detail";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [contact, activities, attachments, clients, { data: { user } }] = await Promise.all([
    getContact(id),
    getActivitiesForContact(id),
    getAttachments("contact", id),
    getCrmClients(),
    supabase.auth.getUser(),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetail
      contact={contact}
      activities={activities}
      attachments={attachments}
      clients={clients}
      currentProfile={user ? { id: user.id } : null}
    />
  );
}
