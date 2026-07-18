"use client";
// visit-report-section.tsx — src/components/field/visit-report-section.tsx — 2026-07-13
// Reporte técnico de la visita (field_visit_reports). Crea o actualiza (upsert por visita).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UNIDADES_MEDIDA } from "@/lib/constants";
import { GitBranchPlus, Link2, Loader2 as Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldVisitReport } from "@/lib/field/types";

interface VisitContext {
  id: string;
  client_id: string | null;
  branch_id: string;
  work_order_id: string | null;
  work_order_number: string | null;
}

const schema = z.object({
  equipment_tag: z.string().optional(),
  serial_number: z.string().optional(),
  medida: z.string().optional(),
  unidad_medida: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  materiales_caras: z.string().optional(),
  materiales_orings: z.string().optional(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  requires_repair: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface VisitReportSectionProps {
  visitId: string;
  report: FieldVisitReport | null;
  visit: VisitContext;
  clientWorkOrders: { id: string; order_number: string }[];
  currentUser: { id: string; full_name: string; role?: string | null } | null;
}

export function VisitReportSection({ visitId, report, visit, clientWorkOrders, currentUser }: VisitReportSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNotes, setRequestNotes] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedOt, setSelectedOt] = useState<string>("");
  const [otBusy, setOtBusy] = useState(false);

  const reqStatus = report?.ot_request_status ?? "no_solicitada";
  const isAdmin = currentUser?.role === "admin";

  async function submitOtRequest() {
    if (!report) return;
    setOtBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("field_visit_reports").update({
      ot_requested: true,
      ot_request_status: "solicitada",
      ot_request_notes: requestNotes || null,
      ot_requested_at: new Date().toISOString(),
    }).eq("id", report.id);
    if (error) { toast.error("Error al enviar la solicitud"); setOtBusy(false); return; }
    await sb.from("audit_logs").insert({
      entity_type: "field_visit_report", entity_id: report.id, action: "update",
      description: "Solicitud de OT/OTS desde Zaire Field",
      user_id: currentUser?.id ?? null, user_name: currentUser?.full_name ?? null,
    });
    // Notificación por email (scaffold — todavía no envía; ver /api/notifications/ot-request)
    fetch("/api/notifications/ot-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, notes: requestNotes || null }),
    }).catch(() => {});
    toast.success("OT/OTS solicitada al administrador");
    setOtBusy(false); setRequestOpen(false); setRequestNotes("");
    router.refresh();
  }

  async function linkOt() {
    if (!report || !selectedOt) return;
    setOtBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 1) Vincular la OT a la visita
    await sb.from("field_visits").update({ work_order_id: selectedOt }).eq("id", visit.id);

    // 2) Círculo Visita→OT: si el reporte todavía no generó un ítem, crearlo en la OT con los
    //    datos técnicos del reporte (el admin luego cotiza/precia). Guarda anti-duplicado.
    const alreadyHadItem = !!report.created_work_order_item_id;
    let itemId: string | null = report.created_work_order_item_id ?? null;
    if (!itemId) {
      const { data: lastItem } = await sb
        .from("work_order_items")
        .select("item_number")
        .eq("work_order_id", selectedOt)
        .order("item_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = ((lastItem?.item_number as number) ?? 0) + 1;
      const { data: newItem } = await sb
        .from("work_order_items")
        .insert({
          work_order_id: selectedOt, item_number: nextNumber, product_id: null,
          custom_description: report.equipment_tag || "Equipo relevado en visita de campo",
          quantity: 1,
          serial_number: report.serial_number || null,
          equipment_number: report.equipment_tag || null,
          additional_observation: report.findings || null,
          unit_price: 0, total_price: 0, unit_price_ars: 0, total_price_ars: 0,
          repair_required: report.requires_repair,
          notes: report.recommendations || null,
          status: "pendiente",
          modelo: report.modelo || null, medida: report.medida || null, unidad_medida: report.unidad_medida || null,
          marca: report.marca || null, materiales_caras: report.materiales_caras || null,
          materiales_orings: report.materiales_orings || null, origen_abastecimiento: null, orden_compra_item: null,
          is_quoted: false, is_remitted: false, qty_remitted: 0,
          is_delivered: false, qty_delivered: 0, is_invoiced: false, qty_invoiced: 0,
        })
        .select("id")
        .single();
      itemId = (newItem?.id as string) ?? null;
    }

    // 3) Marcar el reporte como vinculado + guardar el ítem generado
    const { error } = await sb
      .from("field_visit_reports")
      .update({ ot_request_status: "vinculada", created_work_order_item_id: itemId })
      .eq("id", report.id);
    if (error) { toast.error("Error al vincular la OT"); setOtBusy(false); return; }

    await sb.from("audit_logs").insert({
      entity_type: "field_visit_report", entity_id: report.id, action: "update",
      description: alreadyHadItem ? "OT vinculada a la visita" : "OT vinculada + ítem generado desde el reporte",
      user_id: currentUser?.id ?? null, user_name: currentUser?.full_name ?? null,
    });
    toast.success(alreadyHadItem ? "OT vinculada a la visita" : "OT vinculada · ítem generado desde el reporte");
    setOtBusy(false); setLinkOpen(false);
    router.refresh();
  }

  async function setReqStatus(status: string) {
    if (!report) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from("field_visit_reports").update({ ot_request_status: status }).eq("id", report.id);
    toast.success("Solicitud actualizada");
    router.refresh();
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      equipment_tag: report?.equipment_tag ?? "",
      serial_number: report?.serial_number ?? "",
      medida: report?.medida ?? "",
      unidad_medida: report?.unidad_medida ?? "",
      marca: report?.marca ?? "",
      modelo: report?.modelo ?? "",
      materiales_caras: report?.materiales_caras ?? "",
      materiales_orings: report?.materiales_orings ?? "",
      findings: report?.findings ?? "",
      recommendations: report?.recommendations ?? "",
      requires_repair: report?.requires_repair ?? false,
    },
  });

  const unidad = watch("unidad_medida") ?? "";
  const requiresRepair = watch("requires_repair");

  async function onSubmit(data: FormData) {
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const payload = {
      equipment_tag: data.equipment_tag || null,
      serial_number: data.serial_number || null,
      medida: data.medida || null,
      unidad_medida: data.unidad_medida || null,
      marca: data.marca || null,
      modelo: data.modelo || null,
      materiales_caras: data.materiales_caras || null,
      materiales_orings: data.materiales_orings || null,
      findings: data.findings || null,
      recommendations: data.recommendations || null,
      requires_repair: data.requires_repair,
    };

    if (report) {
      const { error } = await sb.from("field_visit_reports").update(payload).eq("id", report.id);
      if (error) { toast.error("Error al guardar el reporte"); setSaving(false); return; }
    } else {
      const { error } = await sb.from("field_visit_reports").insert({ visit_id: visitId, ...payload });
      if (error) { toast.error("Error al crear el reporte"); setSaving(false); return; }
    }
    toast.success("Reporte guardado");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="zaire-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-zaire-blue" /> Reporte de visita
        </h2>
        {report && (
          <div className="flex items-center gap-2">
            {reqStatus === "no_solicitada" && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setRequestOpen(true)}>
                <GitBranchPlus className="w-4 h-4 mr-1" /> Solicitar OT/OTS
              </Button>
            )}
            {reqStatus === "solicitada" && (
              <>
                <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-full px-2 py-0.5">OT/OTS solicitada</span>
                {isAdmin && (
                  <>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setLinkOpen(true)} title="Vincular una OT existente (admin)">
                      <Link2 className="w-4 h-4 mr-1" /> Vincular OT
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-red-600 dark:text-red-300" onClick={() => setReqStatus("rechazada")} title="Rechazar solicitud (admin)">Rechazar</Button>
                  </>
                )}
              </>
            )}
            {reqStatus === "vinculada" && (
              <span className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/15 border border-green-200 dark:border-green-500/30 rounded-full px-2 py-0.5">
                OT vinculada{visit.work_order_number ? `: ${visit.work_order_number}` : ""}
              </span>
            )}
            {reqStatus === "rechazada" && (
              <>
                <span className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 rounded-full px-2 py-0.5">Solicitud rechazada</span>
                {isAdmin && <Button size="sm" variant="ghost" className="h-8" onClick={() => setReqStatus("solicitada")}>Reabrir</Button>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Diálogo: solicitar OT/OTS */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Solicitar OT/OTS</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-(--zaire-text-muted)">
              Esto <strong>no crea</strong> la orden. Deja una solicitud con los datos del reporte para que un
              administrador cree la OT/OTS en Zaire Trace (con su número correlativo) y la vincule a esta visita.
            </p>
            <div className="space-y-1.5">
              <Label>Notas para el administrador</Label>
              <Textarea value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} rows={3} placeholder="Contexto, urgencia, tipo de trabajo requerido..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancelar</Button>
              <Button onClick={submitOtRequest} disabled={otBusy} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
                {otBusy && <Loader className="w-4 h-4 mr-2 animate-spin" />} Enviar solicitud
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: vincular OT existente (admin) */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Vincular OT existente</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-(--zaire-text-muted)">
              Elegí una OT ya creada en Zaire Trace para vincularla a esta visita. Si todavía no existe,
              creala primero en Zaire Trace y volvé acá. Al vincular se <strong>genera un ítem</strong> en la OT
              con los datos técnicos del reporte (medida, marca, materiales…) para no recargarlos.
            </p>
            {clientWorkOrders.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-300">El cliente de la visita no tiene OTs. Creá una en Zaire Trace primero.</p>
            ) : (
              <div className="space-y-1.5">
                <Label>OT destino</Label>
                <Select value={selectedOt} onValueChange={(v) => setSelectedOt(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar OT...">{selectedOt ? clientWorkOrders.find((w) => w.id === selectedOt)?.order_number : null}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {clientWorkOrders.map((w) => (<SelectItem key={w.id} value={w.id}>{w.order_number}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>Cancelar</Button>
              <Button onClick={linkOt} disabled={otBusy || !selectedOt} className={cn("bg-zaire-navy-mid hover:bg-zaire-navy text-white")}>
                {otBusy && <Loader className="w-4 h-4 mr-2 animate-spin" />} Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="equipment_tag">Equipo / TAG</Label>
            <Input id="equipment_tag" {...register("equipment_tag")} placeholder="P-101A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serial_number">N° de serie</Label>
            <Input id="serial_number" {...register("serial_number")} placeholder="SN-..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medida">Medida</Label>
            <Input id="medida" {...register("medida")} placeholder="2.500" />
          </div>
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <Select value={unidad} onValueChange={(v) => setValue("unidad_medida", v ?? "", { shouldDirty: true })}>
              <SelectTrigger><SelectValue placeholder="—">{unidad || null}</SelectValue></SelectTrigger>
              <SelectContent>
                {UNIDADES_MEDIDA.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="marca">Marca</Label>
            <Input id="marca" {...register("marca")} placeholder="JOHN CRANE" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="modelo">Modelo</Label>
            <Input id="modelo" {...register("modelo")} placeholder="Type 1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="materiales_caras">Materiales caras</Label>
            <Input id="materiales_caras" {...register("materiales_caras")} placeholder="SiC / Carbón" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="materiales_orings">Materiales O-rings</Label>
            <Input id="materiales_orings" {...register("materiales_orings")} placeholder="Viton" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="findings">Hallazgos / diagnóstico</Label>
          <Textarea id="findings" {...register("findings")} rows={3} placeholder="Relevamiento técnico, estado del equipo..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recommendations">Recomendaciones</Label>
          <Textarea id="recommendations" {...register("recommendations")} rows={2} placeholder="Acciones sugeridas..." />
        </div>

        <div className="flex items-center gap-3">
          <Switch id="requires_repair" checked={requiresRepair} onCheckedChange={(v) => setValue("requires_repair", v, { shouldDirty: true })} />
          <Label htmlFor="requires_repair">Requiere reparación</Label>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !isDirty} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {report ? "Guardar reporte" : "Crear reporte"}
          </Button>
        </div>
      </form>
    </div>
  );
}
