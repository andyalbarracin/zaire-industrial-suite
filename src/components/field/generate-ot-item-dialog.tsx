"use client";
// generate-ot-item-dialog.tsx — src/components/field/generate-ot-item-dialog.tsx — 2026-07-13
// Círculo virtuoso: genera un work_order_item de Zaire Tracking desde el reporte de la visita.
// Único punto donde Field escribe en tablas de Zaire Tracking (work_orders / work_order_items).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitBranchPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldVisitReport } from "@/lib/field/types";

interface VisitContext {
  id: string;
  client_id: string | null;
  branch_id: string;
  work_order_id: string | null;
  work_order_number: string | null;
}

interface GenerateOtItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: FieldVisitReport;
  visit: VisitContext;
  clientWorkOrders: { id: string; order_number: string }[];
  currentUser: { id: string; full_name: string } | null;
}

const NEW = "__new__";

export function GenerateOtItemDialog({ open, onOpenChange, report, visit, clientWorkOrders, currentUser }: GenerateOtItemDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Destino: si la visita ya tiene OT, se usa esa; si no, elegir existente o crear nueva.
  const [target, setTarget] = useState<string>(visit.work_order_id ?? (clientWorkOrders[0]?.id ?? NEW));

  const lockedToVisitOt = !!visit.work_order_id;

  async function handleGenerate() {
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    let workOrderId = visit.work_order_id ?? null;
    let createdNewOt = false;

    if (!workOrderId) {
      if (target === NEW) {
        // Crear OT mínima (OTS, ingresada) para el cliente/sucursal de la visita
        const { data: orderNumber, error: rpcErr } = await sb.rpc("generate_order_number", {
          p_order_type: "OTS",
          p_branch_id: visit.branch_id,
        });
        if (rpcErr) { toast.error("Error al generar el número de OT"); setSaving(false); return; }
        const { data: newOt, error: otErr } = await sb
          .from("work_orders")
          .insert({
            order_number: orderNumber,
            order_type: "OTS",
            client_id: visit.client_id,
            branch_id: visit.branch_id,
            status: "ingresada",
            currency: "USD",
            general_notes: `Generada desde visita de Zaire Field.`,
          })
          .select("id")
          .single();
        if (otErr || !newOt) { toast.error("Error al crear la OT"); setSaving(false); return; }
        workOrderId = newOt.id;
        createdNewOt = true;
      } else {
        workOrderId = target;
      }
    }

    // item_number = MAX(item_number)+1 de la OT destino
    const { data: maxRows } = await sb
      .from("work_order_items")
      .select("item_number")
      .eq("work_order_id", workOrderId)
      .order("item_number", { ascending: false })
      .limit(1);
    const nextItemNumber = ((maxRows?.[0]?.item_number as number) ?? 0) + 1;

    // Mapeo del reporte a las columnas reales de work_order_items
    const { data: item, error: itemErr } = await sb
      .from("work_order_items")
      .insert({
        work_order_id: workOrderId,
        item_number: nextItemNumber,
        quantity: 1,
        serial_number: report.serial_number,
        equipment_number: report.equipment_tag,
        custom_description: report.findings,
        diagnosis: report.findings,
        repair_required: report.requires_repair,
        medida: report.medida,
        unidad_medida: report.unidad_medida,
        marca: report.marca,
        modelo: report.modelo,
        materiales_caras: report.materiales_caras,
        materiales_orings: report.materiales_orings,
        status: "pendiente",
      })
      .select("id")
      .single();
    if (itemErr || !item) { toast.error("Error al crear el ítem de OT"); setSaving(false); return; }

    // Guardar el vínculo en el reporte + linkear la OT a la visita si se creó nueva
    await sb.from("field_visit_reports").update({ created_work_order_item_id: item.id }).eq("id", report.id);
    if (createdNewOt) {
      await sb.from("field_visits").update({ work_order_id: workOrderId }).eq("id", visit.id);
    }
    await sb.from("audit_logs").insert({
      entity_type: "work_order_item",
      entity_id: item.id,
      action: "create",
      description: `Ítem generado desde visita de Zaire Field`,
      user_id: currentUser?.id ?? null,
      user_name: currentUser?.full_name ?? null,
    });

    toast.success("Ítem de OT generado");
    setSaving(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GitBranchPlus className="w-5 h-5 text-sas-blue" /> Generar ítem de OT</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-(--sas-text-muted)">
            Se creará un ítem de orden de trabajo en Zaire Tracking con los datos técnicos de este reporte.
          </p>

          {lockedToVisitOt ? (
            <div className="rounded-lg border border-(--sas-border) bg-slate-50 p-3 text-sm">
              Se agregará a la OT vinculada a la visita: <strong className="font-mono">{visit.work_order_number}</strong>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>OT destino</Label>
              <Select value={target} onValueChange={(v) => setTarget(v ?? NEW)}>
                <SelectTrigger>
                  <SelectValue>
                    {target === NEW ? "➕ Crear OT nueva (OTS)" : clientWorkOrders.find((w) => w.id === target)?.order_number}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clientWorkOrders.map((w) => (<SelectItem key={w.id} value={w.id}>{w.order_number}</SelectItem>))}
                  <SelectItem value={NEW}>➕ Crear OT nueva (OTS)</SelectItem>
                </SelectContent>
              </Select>
              {!visit.client_id && <p className="text-xs text-amber-600">La visita no tiene cliente; si creás una OT nueva quedará sin cliente.</p>}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-(--sas-border) p-3 text-xs text-(--sas-text-muted) space-y-1">
            <p><strong className="text-(--sas-text)">Equipo:</strong> {report.equipment_tag ?? "—"} · <strong className="text-(--sas-text)">Serie:</strong> {report.serial_number ?? "—"}</p>
            <p><strong className="text-(--sas-text)">Medida:</strong> {report.medida ?? "—"} {report.unidad_medida ?? ""} · <strong className="text-(--sas-text)">Marca:</strong> {report.marca ?? "—"}</p>
            <p><strong className="text-(--sas-text)">Requiere reparación:</strong> {report.requires_repair ? "Sí" : "No"}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={saving} className="bg-sas-navy-mid hover:bg-sas-navy text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Generar ítem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
