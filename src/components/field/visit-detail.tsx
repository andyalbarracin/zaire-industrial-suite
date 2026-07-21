"use client";
// visit-detail.tsx — src/components/field/visit-detail.tsx — 2026-07-13
// Detalle de visita: datos, mapa (sitio + geocerca + traza), timeline y cambio de estado.
// El reporte, fotos y gastos se agregan en el bloque siguiente.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  ChevronLeft,
  Pencil,
  MapPin,
  Truck,
  User,
  Building2,
  Calendar,
  LogOut,
  LogIn,
  StickyNote,
  Camera,
  RefreshCw,
  Loader2,
  DollarSign,
  PlayCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldMap, type MapMarker } from "@/components/field/field-map";
import { VisitCreateLead } from "@/components/field/visit-create-lead";
import { ConsumeInVisit } from "@/components/stock/consume-in-visit";
import { RegisterAssetService } from "@/components/assets/register-asset-service";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { VisitReportSection } from "@/components/field/visit-report-section";
import { VisitExpensesSection } from "@/components/field/visit-expenses-section";
import { VisitPhotosSection } from "@/components/field/visit-photos-section";
import { cn, formatDateTime } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
  VISIT_STATUS_NEXT,
  VISIT_PURPOSE_LABELS,
  BILLING_STATUSES,
  BILLING_STATUS_LABELS,
  BILLING_STATUS_COLORS,
} from "@/lib/field/constants";
import type {
  FieldVisit,
  FieldVisitEvent,
  FieldVisitReport,
  FieldExpense,
  FieldVisitPhoto,
  VisitStatus,
  BillingStatus,
} from "@/lib/field/types";

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  salida: LogOut,
  geocerca_entrada: LogIn,
  geocerca_salida: LogOut,
  checkin: LogIn,
  checkout: LogOut,
  nota: StickyNote,
  foto: Camera,
  cambio_estado: RefreshCw,
  gasto: DollarSign,
};

interface VisitDetailProps {
  visit: FieldVisit;
  events: FieldVisitEvent[];
  pings: { id: number; latitude: number; longitude: number; recorded_at: string }[];
  report: FieldVisitReport | null;
  expenses: FieldExpense[];
  photos: FieldVisitPhoto[];
  clientWorkOrders: { id: string; order_number: string }[];
  currentUser: { id: string; full_name: string; role?: string | null } | null;
}

export function VisitDetail({ visit, events, pings, report, expenses, photos, clientWorkOrders, currentUser }: VisitDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<VisitStatus>(visit.status);
  const [billing, setBilling] = useState<BillingStatus>(visit.billing_status);
  const [newStatus, setNewStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [livePings, setLivePings] = useState(pings);

  // Live tracking: suscripción a nuevos pings de esta visita (Supabase Realtime).
  // Requiere que field_location_pings esté en la publicación supabase_realtime.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`visit-${visit.id}-pings`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "field_location_pings", filter: `visit_id=eq.${visit.id}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const p = payload.new;
          setLivePings((prev) =>
            prev.some((x) => x.id === p.id)
              ? prev
              : [...prev, { id: p.id, latitude: Number(p.latitude), longitude: Number(p.longitude), recorded_at: p.recorded_at }]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [visit.id]);

  const nextStates = VISIT_STATUS_NEXT[status] ?? [];
  const branch = BRANCHES.find((b) => b.id === visit.branch_id);

  const site = visit.site;
  const hasSite = site?.latitude != null && site?.longitude != null;
  const lastPing = livePings.length > 0 ? livePings[livePings.length - 1] : null;

  const markers: MapMarker[] = [];
  if (hasSite) markers.push({ id: "site", lat: site!.latitude!, lng: site!.longitude!, kind: "site", label: site!.name });
  if (lastPing) markers.push({ id: "tech", lat: lastPing.latitude, lng: lastPing.longitude, kind: "technician", label: "Última posición" });
  const trace: [number, number][] = livePings.map((p) => [p.latitude, p.longitude]);
  const geofences = hasSite ? [{ lat: site!.latitude!, lng: site!.longitude!, radius: site!.geofence_radius_m }] : [];

  async function handleStatusChange() {
    if (!newStatus) return;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const nowIso = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = { status: newStatus };
    if (newStatus === "en_curso" && !visit.started_at) patch.started_at = nowIso;
    if (newStatus === "en_sitio" && !visit.arrived_at) patch.arrived_at = nowIso;
    if (newStatus === "finalizada") patch.ended_at = nowIso;

    const { error } = await sb.from("field_visits").update(patch).eq("id", visit.id);
    if (error) { toast.error("Error al cambiar el estado"); setSaving(false); return; }

    await sb.from("field_visit_events").insert({
      visit_id: visit.id,
      event_type: "cambio_estado",
      description: `${VISIT_STATUS_LABELS[status]} → ${VISIT_STATUS_LABELS[newStatus as VisitStatus]}${newStatus === "en_sitio" && !visit.arrived_at ? " · arribo manual (sin verificación GPS)" : ""}${notes ? ` · ${notes}` : ""}`,
      created_by: currentUser?.id ?? null,
    });
    await sb.from("audit_logs").insert({
      entity_type: "field_visit",
      entity_id: visit.id,
      action: "status_change",
      description: `Estado ${status} → ${newStatus}`,
      user_id: currentUser?.id ?? null,
      user_name: currentUser?.full_name ?? null,
    });

    toast.success("Estado actualizado");
    setStatus(newStatus as VisitStatus);
    setNewStatus("");
    setNotes("");
    setSaving(false);
    setConfirmOpen(false);
    router.refresh();
  }

  function confirmDescription() {
    if (!newStatus) return "";
    const extras: string[] = [];
    if (newStatus === "en_curso") extras.push("se registrará la salida");
    if (newStatus === "en_sitio" && !visit.arrived_at) extras.push("se registrará el arribo al sitio como manual (sin verificación GPS)");
    if (newStatus === "finalizada") extras.push("se registrará el fin de la visita");
    return `Vas a cambiar el estado de "${VISIT_STATUS_LABELS[status]}" a "${VISIT_STATUS_LABELS[newStatus as VisitStatus]}"${extras.length ? ` y ${extras.join(" y ")}` : ""}. Queda registrado en el timeline y la auditoría.`;
  }

  async function handleSimulate() {
    setSimulating(true);
    try {
      const res = await fetch("/api/field/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id: visit.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al simular el recorrido"); setSimulating(false); return; }
      toast.success("Recorrido simulado: arribo detectado");
      router.refresh();
    } catch {
      toast.error("Error al simular el recorrido");
    }
    setSimulating(false);
  }

  async function handleBillingChange(value: string) {
    setBilling(value as BillingStatus);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("field_visits").update({ billing_status: value }).eq("id", visit.id);
    if (error) { toast.error("Error al actualizar cobranza"); return; }
    toast.success("Estado de cobranza actualizado");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.field.visitas} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a visitas
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--zaire-text)">{visit.visit_number ?? "Visita"}</h1>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", VISIT_STATUS_COLORS[status])}>
              {VISIT_STATUS_LABELS[status]}
            </span>
            {visit.purpose && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-subtle-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {VISIT_PURPOSE_LABELS[visit.purpose]}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasSite && process.env.NEXT_PUBLIC_ENABLE_FIELD_SIMULATE === "true" && (
            <Button variant="outline" onClick={handleSimulate} disabled={simulating} title="Solo demo: simula el recorrido del técnico hasta el sitio">
              {simulating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1.5" />} Simular recorrido
            </Button>
          )}
          <VisitCreateLead visit={visit} />
          <ConsumeInVisit visitId={visit.id} vehicleId={visit.vehicle_id} />
          <RegisterAssetService refType="visita" refId={visit.id} defaultDescription={`Visita ${visit.visit_number ?? ""}`} />
          <Button asChild variant="outline">
            <a href={`/api/field/visit-pdf/${visit.id}`} target="_blank" rel="noopener noreferrer"><FileText className="w-4 h-4 mr-1.5" /> PDF</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.field.visitaEditar(visit.id)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos + cambio de estado */}
        <div className="space-y-6">
          <div className="zaire-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Datos generales</h2>
            <DataRow icon={User} label="Técnico" value={visit.technician?.full_name ?? "—"} />
            <DataRow icon={Truck} label="Unidad" value={visit.vehicle ? [visit.vehicle.plate, visit.vehicle.brand, visit.vehicle.model].filter(Boolean).join(" ") : "—"} />
            <DataRow icon={Building2} label="Cliente" value={visit.client?.business_name ?? "—"} />
            <DataRow icon={MapPin} label="Sitio" value={site?.name ?? "—"} />
            <DataRow icon={Building2} label="Sucursal" value={branch?.name ?? visit.branch_id} />
            {visit.work_order && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-(--zaire-text-muted) w-24 shrink-0">OT vinculada</span>
                <Link href={ROUTES.trace.orden(visit.work_order.id)} className="text-zaire-blue hover:underline font-mono">{visit.work_order.order_number}</Link>
              </div>
            )}
          </div>

          <div className="zaire-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Fechas</h2>
            <DataRow icon={Calendar} label="Agendada" value={formatDateTime(visit.scheduled_at)} />
            <DataRow icon={Calendar} label="Salida" value={formatDateTime(visit.started_at)} />
            <DataRow icon={Calendar} label="Arribo" value={formatDateTime(visit.arrived_at)} />
            <DataRow icon={Calendar} label="Salida sitio" value={formatDateTime(visit.departed_at)} />
            <DataRow icon={Calendar} label="Fin" value={formatDateTime(visit.ended_at)} />
          </div>

          {/* Facturable / cobranza */}
          <div className="zaire-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Facturación</h2>
            <p className="text-sm text-(--zaire-text-muted)">
              {visit.is_billable ? "Visita facturable al cliente." : "Visita no facturable."}
            </p>
            <div className="space-y-1.5">
              <Label>Estado de cobranza</Label>
              <Select value={billing} onValueChange={(v) => { if (v) handleBillingChange(v); }}>
                <SelectTrigger>
                  <SelectValue>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", BILLING_STATUS_COLORS[billing])}>
                      {BILLING_STATUS_LABELS[billing]}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BILLING_STATUSES.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cambiar estado */}
          {nextStates.length > 0 && (
            <div className="zaire-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Cambiar estado</h2>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Nuevo estado...">{newStatus ? VISIT_STATUS_LABELS[newStatus as VisitStatus] : null}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {nextStates.map((s) => (<SelectItem key={s} value={s}>{VISIT_STATUS_LABELS[s]}</SelectItem>))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Notas del cambio (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              <Button onClick={() => setConfirmOpen(true)} disabled={!newStatus || saving} className="w-full bg-zaire-navy-mid hover:bg-zaire-navy text-white">
                Cambiar estado
              </Button>
            </div>
          )}
        </div>

        {/* Columna derecha: mapa + timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="zaire-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Recorrido y geocerca</h2>
            {hasSite || markers.length > 0 ? (
              <FieldMap markers={markers} geofences={geofences} trace={trace} height={340} zoom={12} />
            ) : (
              <p className="text-sm text-(--zaire-text-muted) py-8 text-center">El sitio de esta visita no tiene coordenadas cargadas.</p>
            )}
          </div>

          <div className="zaire-card p-5">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-4">Timeline de eventos</h2>
            {events.length === 0 ? (
              <p className="text-sm text-(--zaire-text-muted) py-4 text-center">Sin eventos registrados.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-(--zaire-border)" />
                <div className="space-y-4">
                  {events.map((ev) => {
                    const Icon = EVENT_ICON[ev.event_type] ?? StickyNote;
                    return (
                      <div key={ev.id} className="relative flex gap-4 pl-10">
                        <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-panel border-(--zaire-border) text-zaire-blue">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 pb-1">
                          <p className="text-sm text-(--zaire-text)">{ev.description ?? ev.event_type}</p>
                          <p className="text-xs text-(--zaire-text-muted)">{formatDateTime(ev.occurred_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reporte de visita */}
          <VisitReportSection
            visitId={visit.id}
            report={report}
            visit={{
              id: visit.id,
              client_id: visit.client_id,
              branch_id: visit.branch_id,
              work_order_id: visit.work_order_id,
              work_order_number: visit.work_order?.order_number ?? null,
            }}
            clientWorkOrders={clientWorkOrders}
            currentUser={currentUser}
          />

          {/* Fotos de la visita */}
          <VisitPhotosSection visitId={visit.id} initialPhotos={photos} />

          {/* Gastos de la visita */}
          <VisitExpensesSection visitId={visit.id} technicianId={visit.technician_id} initialExpenses={expenses} currentUser={currentUser} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => { if (!o) setConfirmOpen(false); }}
        title="Cambiar estado de la visita"
        description={confirmDescription()}
        confirmLabel="Confirmar cambio"
        variant={newStatus === "cancelada" ? "destructive" : "default"}
        loading={saving}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}

function DataRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
      <span className="text-(--zaire-text-muted) w-24 shrink-0">{label}</span>
      <span className="text-(--zaire-text) font-medium truncate">{value}</span>
    </div>
  );
}
