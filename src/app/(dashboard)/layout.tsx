// layout.tsx — src/app/(dashboard)/layout.tsx — 2026-05-19
// Layout principal del dashboard: sidebar + header + contenido

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ROUTES } from "@/lib/routes";
import { isModuleEnabled } from "@/lib/modules";
import { getLowStockLevels } from "@/lib/stock/queries";
import { getAssetBellAlerts } from "@/lib/assets/queries";
import { DOC_TYPE_LABELS } from "@/lib/field/constants";
import type { DocType } from "@/lib/field/types";

// Notificación normalizada: sirve tanto para órdenes (Zaire Trace) como para
// documentos por vencer (Zaire Field). El header las renderiza de forma genérica.
export type Notification = {
  id: string;
  kind: "order" | "field_doc" | "field_ot_request" | "crm_task" | "crm_close" | "stock_low" | "asset_alert";
  title: string;
  subtitle: string;
  date_due: string;
  href: string;
};

// Tipo MIME del favicon según la extensión del archivo (svg/png/webp/jpg/ico).
function faviconType(url: string): string | undefined {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".svg")) return "image/svg+xml";
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

// Identidad de la tab DENTRO de la app (título + favicon), leída con el cliente AUTENTICADO
// (el mismo que usa el sidebar y sí pasa el RLS de company_settings). Título: "Título" de
// Identidad de la app (fallback al nombre de empresa) + " — Zaire Industrial". Favicon: el
// app_logo_url del cliente; si no hay, hereda el de Zaire por defecto del layout raíz.
export async function generateMetadata(): Promise<Metadata> {
  const meta: Metadata = { title: "Zaire Industrial Suite" };
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("company_settings")
      .select("app_logo_url, app_title, nombre")
      .eq("id", 1)
      .single();
    const clientName = (data?.app_title?.trim() || data?.nombre?.trim()) || null;
    if (clientName) meta.title = `${clientName} — Zaire Industrial`;
    const logo: string | null = data?.app_logo_url ?? null;
    if (logo) {
      const type = faviconType(logo);
      meta.icons = { icon: type ? [{ url: logo, type }] : [{ url: logo }] };
    }
  } catch {
    // Sin sesión/acceso → título y favicon por defecto (heredados del layout raíz).
  }
  return meta;
}

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

  if (!user) redirect(ROUTES.login);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];
  const sevenDaysIso = sevenDaysFromNow.toISOString();
  const crmOn = isModuleEnabled("crm");

  const [{ data: profile }, { data: ordersRaw }, { data: docsRaw }, { data: requestsRaw }, { data: crmTasksRaw }, { data: crmClosesRaw }, { data: settingsRaw }] = await Promise.all([
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
    // Solicitudes de OT/OTS pendientes que llegan desde Field
    sb
      .from("field_visit_reports")
      .select("id, ot_requested_at, visit:field_visits(visit_number, technician:field_technicians(full_name))")
      .eq("ot_request_status", "solicitada")
      .order("ot_requested_at", { ascending: false })
      .limit(15),
    // Zaire CRM: tareas vencidas/próximas (≤7 días)
    crmOn
      ? sb.from("crm_activities")
          .select("id, subject, due_at, client:clients(business_name), opportunity:crm_opportunities(title)")
          .eq("activity_type", "tarea").eq("done", false).is("deleted_at", null)
          .not("due_at", "is", null).lte("due_at", sevenDaysIso)
          .order("due_at", { ascending: true }).limit(15)
      : Promise.resolve({ data: [] }),
    // Zaire CRM: oportunidades abiertas con cierre próximo (≤7 días)
    crmOn
      ? sb.from("crm_opportunities")
          .select("id, title, expected_close_date, client:clients(business_name)")
          .is("deleted_at", null).is("closed_at", null)
          .not("expected_close_date", "is", null).lte("expected_close_date", sevenDaysStr)
          .order("expected_close_date", { ascending: true }).limit(15)
      : Promise.resolve({ data: [] }),
    // Identidad de la app (logo/título/subtítulo configurables por cliente)
    sb.from("company_settings").select("app_logo_url, app_title, app_subtitle, nombre").eq("id", 1).single(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cs = settingsRaw as any;
  const identity = {
    logoUrl: (cs?.app_logo_url as string | null) ?? null,
    title: (cs?.app_title as string | null)?.trim() || "Zaire",
    subtitle: (cs?.app_subtitle as string | null)?.trim() || (cs?.nombre as string | null)?.trim() || "Suite Industrial",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderNotifs: Notification[] = ((ordersRaw ?? []) as any[]).map((o) => ({
    id: o.id,
    kind: "order",
    title: o.order_number,
    subtitle: o.clients?.business_name ?? "—",
    date_due: o.date_due,
    href: ROUTES.trace.orden(o.id),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docNotifs: Notification[] = ((docsRaw ?? []) as any[]).map((d) => ({
    id: `doc-${d.id}`,
    kind: "field_doc",
    title: d.doc_type ? DOC_TYPE_LABELS[d.doc_type as DocType] : "Documento",
    subtitle: d.technician?.full_name ?? d.vehicle?.plate ?? "Zaire Field",
    date_due: d.expires_at,
    href: ROUTES.field.documentos,
  }));

  // Solicitudes de OT/OTS desde Field — solo si Trace y Field están habilitados
  const showRequests = isModuleEnabled("trace") && isModuleEnabled("field");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqRows: any[] = showRequests ? (requestsRaw ?? []) : [];
  const requestNotifs: Notification[] = reqRows.map((r) => ({
    id: `req-${r.id}`,
    kind: "field_ot_request" as const,
    title: "Solicitud de OT/OTS",
    subtitle: [r.visit?.technician?.full_name, r.visit?.visit_number].filter(Boolean).join(" · ") || "Zaire Field",
    date_due: r.ot_requested_at ?? new Date().toISOString(),
    href: ROUTES.trace.solicitud(r.id),
  }));

  // Zaire CRM: tareas y cierres (gateado por crm)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crmTaskNotifs: Notification[] = ((crmTasksRaw ?? []) as any[]).map((t) => ({
    id: `crmtask-${t.id}`,
    kind: "crm_task" as const,
    title: t.subject ?? "Tarea",
    subtitle: t.client?.business_name ?? t.opportunity?.title ?? "Zaire CRM",
    date_due: t.due_at,
    href: ROUTES.crm.actividades,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crmCloseNotifs: Notification[] = ((crmClosesRaw ?? []) as any[]).map((o) => ({
    id: `crmclose-${o.id}`,
    kind: "crm_close" as const,
    title: o.title,
    subtitle: `Cierre estimado · ${o.client?.business_name ?? "Zaire CRM"}`,
    date_due: o.expected_close_date,
    href: ROUTES.crm.pipeline,
  }));

  // Zaire Stock: alertas de bajo mínimo (sin fecha; se muestran como alerta). Gateado por stock.
  const stockNotifs: Notification[] = isModuleEnabled("stock")
    ? (await getLowStockLevels()).slice(0, 15).map((l) => ({
        id: `stocklow-${l.id}`,
        kind: "stock_low" as const,
        title: `Bajo stock · ${l.product?.name ?? "Producto"}`,
        subtitle: `${l.warehouse?.name ?? ""} · ${l.on_hand}/${l.min_qty} ${l.product?.unit ?? ""}`.trim(),
        date_due: new Date().toISOString(),
        href: ROUTES.stock.existencias,
      }))
    : [];

  // Zaire Assets: garantías/documentos por vencer (con fecha, como Field). Gateado por assets.
  const assetNotifs: Notification[] = isModuleEnabled("assets")
    ? (await getAssetBellAlerts()).map((a) => ({
        id: a.id,
        kind: "asset_alert" as const,
        title: a.title,
        subtitle: a.subtitle,
        date_due: a.date_due,
        href: a.href,
      }))
    : [];

  const notifications = [...requestNotifs, ...stockNotifs, ...assetNotifs, ...orderNotifs, ...docNotifs, ...crmTaskNotifs, ...crmCloseNotifs].sort(
    (a, b) => new Date(a.date_due).getTime() - new Date(b.date_due).getTime()
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zaire-bg">
      <Sidebar profile={profile} identity={identity} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header notifications={notifications} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full p-6 flex flex-col min-w-0">
            <div className="flex-1 min-w-0">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
