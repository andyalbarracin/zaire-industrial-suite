// page.tsx — src/app/(dashboard)/trace/solicitudes/[id]/page.tsx — 2026-07-16
// Detalle de una solicitud de OT/OTS que llegó desde Field, visto DESDE Trace (no rebota a Field).
// Muestra la visita + reporte read-only y, para admin, la acción "Crear OT/OTS". Gateado a Field habilitado.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ArrowRight, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import { ROUTES } from "@/lib/routes";
import { BRANCHES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import { SolicitudActions } from "@/components/trace/solicitud-actions";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-(--zaire-text-muted) w-32 shrink-0">{label}</span>
      <span className="text-(--zaire-text)">{value || "—"}</span>
    </div>
  );
}

export default async function SolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isModuleEnabled("field")) notFound(); // sin Field no hay solicitudes

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: report }, { data: profile }] = await Promise.all([
    sb.from("field_visit_reports").select(`
      id, visit_id, equipment_tag, serial_number, medida, unidad_medida, marca, modelo,
      materiales_caras, materiales_orings, findings, recommendations, requires_repair,
      ot_request_status, ot_request_notes, ot_requested_at, created_work_order_item_id,
      visit:field_visits(id, visit_number, scheduled_at, branch_id, client_id,
        client:clients(id, business_name), technician:field_technicians(full_name),
        site:field_sites(name, city), work_order:work_orders(id, order_number))
    `).eq("id", id).maybeSingle(),
    sb.from("profiles").select("id, full_name, role").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  if (!report) notFound();

  const visit = report.visit;
  const isAdmin = profile?.role === "admin";
  const status: string = report.ot_request_status ?? "no_solicitada";
  const branchName = BRANCHES.find((b) => b.id === visit?.branch_id)?.name ?? visit?.branch_id ?? "—";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={ROUTES.field.visita(report.visit_id)} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Ver la visita en Field
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-(--zaire-text)">Solicitud de OT/OTS</h1>
          <span className="font-mono text-sm text-zaire-blue">{visit?.visit_number ?? "—"}</span>
          {status === "vinculada" && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Vinculada</span>}
          {status === "solicitada" && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Solicitada</span>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="zaire-card p-5 space-y-2.5">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-1">Visita</h2>
          <Row label="Cliente" value={visit?.client?.business_name ?? "—"} />
          <Row label="Técnico" value={visit?.technician?.full_name ?? "—"} />
          <Row label="Sitio" value={visit?.site?.name ?? "—"} />
          <Row label="Sucursal" value={branchName} />
          <Row label="Agendada" value={visit?.scheduled_at ? formatDateTime(visit.scheduled_at) : "—"} />
          <Row label="Solicitada" value={report.ot_requested_at ? formatDate(report.ot_requested_at) : "—"} />
        </div>

        <div className="zaire-card p-5 space-y-2.5">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-1 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-zaire-blue" /> Reporte técnico
          </h2>
          <Row label="Equipo / TAG" value={report.equipment_tag ?? "—"} />
          <Row label="N° de serie" value={report.serial_number ?? "—"} />
          <Row label="Medida" value={[report.medida, report.unidad_medida].filter(Boolean).join(" ")} />
          <Row label="Marca / Modelo" value={[report.marca, report.modelo].filter(Boolean).join(" · ")} />
          <Row label="Materiales caras" value={report.materiales_caras ?? "—"} />
          <Row label="Materiales O-rings" value={report.materiales_orings ?? "—"} />
          <Row label="Requiere reparación" value={report.requires_repair ? "Sí" : "No"} />
        </div>
      </div>

      {(report.findings || report.recommendations || report.ot_request_notes) && (
        <div className="zaire-card p-5 space-y-3 text-sm">
          {report.findings && <div><p className="text-(--zaire-text-muted) mb-0.5">Hallazgos / diagnóstico</p><p className="text-(--zaire-text) whitespace-pre-wrap">{report.findings}</p></div>}
          {report.recommendations && <div><p className="text-(--zaire-text-muted) mb-0.5">Recomendaciones</p><p className="text-(--zaire-text) whitespace-pre-wrap">{report.recommendations}</p></div>}
          {report.ot_request_notes && <div><p className="text-(--zaire-text-muted) mb-0.5">Notas de la solicitud</p><p className="text-(--zaire-text) whitespace-pre-wrap">{report.ot_request_notes}</p></div>}
        </div>
      )}

      {/* Acciones */}
      <div className="zaire-card p-5">
        {status === "vinculada" ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-(--zaire-text)">Esta solicitud ya tiene una OT vinculada.</p>
            {visit?.work_order && (
              <Link href={ROUTES.trace.orden(visit.work_order.id)} className="inline-flex items-center gap-1 text-sm font-medium text-zaire-blue hover:underline">
                Ver {visit.work_order.order_number} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : isAdmin ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-(--zaire-text-muted)">Crear la orden a partir de esta solicitud (número correlativo, ítem con los datos del reporte).</p>
            <SolicitudActions
              report={{
                id: report.id, equipment_tag: report.equipment_tag, serial_number: report.serial_number,
                medida: report.medida, unidad_medida: report.unidad_medida, marca: report.marca, modelo: report.modelo,
                materiales_caras: report.materiales_caras, materiales_orings: report.materiales_orings,
                findings: report.findings, recommendations: report.recommendations,
                requires_repair: report.requires_repair, created_work_order_item_id: report.created_work_order_item_id,
              }}
              visitId={report.visit_id}
              clientId={visit?.client_id ?? null}
              defaultBranchId={visit?.branch_id ?? null}
              currentUser={profile ? { id: profile.id as string, name: (profile.full_name as string) ?? "" } : null}
            />
          </div>
        ) : (
          <p className="text-sm text-(--zaire-text-muted)">Solo un administrador puede crear la orden a partir de esta solicitud.</p>
        )}
      </div>
    </div>
  );
}
