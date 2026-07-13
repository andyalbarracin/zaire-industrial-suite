// layout.tsx — src/app/(dashboard)/layout.tsx — 2026-05-19
// Layout principal del dashboard: sidebar + header + contenido

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DOC_TYPE_LABELS } from "@/lib/field/constants";
import type { DocType } from "@/lib/field/types";

// Notificación normalizada: sirve tanto para órdenes (Zaire Tracking) como para
// documentos por vencer (Zaire Field). El header las renderiza de forma genérica.
export type Notification = {
  id: string;
  kind: "order" | "field_doc";
  title: string;
  subtitle: string;
  date_due: string;
  href: string;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

  const [{ data: profile }, { data: ordersRaw }, { data: docsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, created_at, updated_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("work_orders")
      .select("id, order_number, date_due, status, clients(business_name)")
      .is("deleted_at", null)
      .not("date_due", "is", null)
      .not("status", "in", '("facturada","cancelada","remitido")')
      .lte("date_due", sevenDaysStr)
      .order("date_due", { ascending: true })
      .limit(15),
    // Zaire Field: documentos por vencer (≤7 días, incluye vencidos)
    sb
      .from("field_documents")
      .select("id, doc_type, expires_at, technician:field_technicians(full_name), vehicle:field_vehicles(plate, brand)")
      .is("deleted_at", null)
      .not("expires_at", "is", null)
      .lte("expires_at", sevenDaysStr)
      .order("expires_at", { ascending: true })
      .limit(15),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderNotifs: Notification[] = ((ordersRaw ?? []) as any[]).map((o) => ({
    id: o.id,
    kind: "order",
    title: o.order_number,
    subtitle: o.clients?.business_name ?? "—",
    date_due: o.date_due,
    href: `/ordenes/${o.id}`,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docNotifs: Notification[] = ((docsRaw ?? []) as any[]).map((d) => ({
    id: `doc-${d.id}`,
    kind: "field_doc",
    title: d.doc_type ? DOC_TYPE_LABELS[d.doc_type as DocType] : "Documento",
    subtitle: d.technician?.full_name ?? d.vehicle?.plate ?? "Zaire Field",
    date_due: d.expires_at,
    href: "/field/documentos",
  }));

  const notifications = [...orderNotifs, ...docNotifs].sort(
    (a, b) => new Date(a.date_due).getTime() - new Date(b.date_due).getTime()
  );

  return (
    <div className="flex h-screen overflow-hidden bg-sas-bg">
      <Sidebar profile={profile} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header notifications={notifications} />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-6 flex flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
