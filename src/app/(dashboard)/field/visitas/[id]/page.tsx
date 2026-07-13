// page.tsx — src/app/(dashboard)/field/visitas/[id]/page.tsx — 2026-07-13
// Zaire Field — detalle de visita (datos, mapa, timeline, cambio de estado).

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getVisit,
  getVisitEvents,
  getVisitPings,
  getVisitReport,
  getVisitExpenses,
  getVisitPhotos,
  getCurrentUserProfile,
} from "@/lib/field/queries";
import { VisitDetail } from "@/components/field/visit-detail";

export const dynamic = "force-dynamic";

export default async function VisitaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visit = await getVisit(id);
  if (!visit) notFound();

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [events, pings, report, expenses, photos, currentUser, clientOrdersRes] = await Promise.all([
    getVisitEvents(id),
    getVisitPings(id),
    getVisitReport(id),
    getVisitExpenses(id),
    getVisitPhotos(id),
    getCurrentUserProfile(),
    visit.client_id
      ? sb.from("work_orders").select("id, order_number").eq("client_id", visit.client_id).is("deleted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const clientWorkOrders = (clientOrdersRes.data ?? []) as { id: string; order_number: string }[];

  return (
    <VisitDetail
      visit={visit}
      events={events}
      pings={pings}
      report={report}
      expenses={expenses}
      photos={photos}
      clientWorkOrders={clientWorkOrders}
      currentUser={currentUser}
    />
  );
}
