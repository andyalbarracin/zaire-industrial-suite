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
import { UNIDADES_MEDIDA } from "@/lib/constants";
import { GitBranchPlus } from "lucide-react";
import { GenerateOtItemDialog } from "@/components/field/generate-ot-item-dialog";
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
  currentUser: { id: string; full_name: string } | null;
}

export function VisitReportSection({ visitId, report, visit, clientWorkOrders, currentUser }: VisitReportSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [otDialogOpen, setOtDialogOpen] = useState(false);

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
    <div className="sas-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-(--sas-text) uppercase tracking-wide flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sas-blue" /> Reporte de visita
        </h2>
        <div className="flex items-center gap-2">
          {report?.created_work_order_item_id ? (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              Ítem de OT generado
            </span>
          ) : report ? (
            <Button size="sm" variant="outline" className="h-8" onClick={() => setOtDialogOpen(true)}>
              <GitBranchPlus className="w-4 h-4 mr-1" /> Generar ítem de OT
            </Button>
          ) : null}
        </div>
      </div>

      {report && (
        <GenerateOtItemDialog
          open={otDialogOpen}
          onOpenChange={setOtDialogOpen}
          report={report}
          visit={visit}
          clientWorkOrders={clientWorkOrders}
          currentUser={currentUser}
        />
      )}

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
          <Button type="submit" disabled={saving || !isDirty} className="bg-sas-navy-mid hover:bg-sas-navy text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {report ? "Guardar reporte" : "Crear reporte"}
          </Button>
        </div>
      </form>
    </div>
  );
}
