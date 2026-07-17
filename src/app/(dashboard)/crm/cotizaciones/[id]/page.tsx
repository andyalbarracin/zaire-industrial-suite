// page.tsx — src/app/(dashboard)/crm/cotizaciones/[id]/page.tsx — 2026-07-17
// Zaire CRM — Ficha de una cotización.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuote, getAttachments } from "@/lib/crm/queries";
import { isModuleEnabled } from "@/lib/modules";
import { QuoteDetail } from "@/components/crm/quote-detail";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [quote, attachments, { data: { user } }] = await Promise.all([
    getQuote(id),
    getAttachments("quote", id),
    supabase.auth.getUser(),
  ]);

  if (!quote) notFound();

  return <QuoteDetail quote={quote} attachments={attachments} currentProfile={user ? { id: user.id } : null} traceEnabled={isModuleEnabled("trace")} />;
}
