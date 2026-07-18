"use client";
// solicitud-actions.tsx — src/components/trace/solicitud-actions.tsx — 2026-07-16
// Acción "Crear OT/OTS" desde una solicitud de Field. Crea la orden (número correlativo),
// genera el ítem con los datos del reporte, la vincula a la visita y marca la solicitud como
// vinculada. Confirmación fuerte (irreversible). Solo la ve un admin (gateado en la página).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, GitBranchPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROUTES } from "@/lib/routes";
import { BRANCHES } from "@/lib/constants";

interface ReportData {
  id: string;
  equipment_tag: string | null;
  serial_number: string | null;
  medida: string | null;
  unidad_medida: string | null;
  marca: string | null;
  modelo: string | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  findings: string | null;
  recommendations: string | null;
  requires_repair: boolean;
  created_work_order_item_id: string | null;
}

interface SolicitudActionsProps {
  report: ReportData;
  visitId: string;
  clientId: string | null;
  defaultBranchId: string | null;
  currentUser: { id: string; name: string } | null;
}

export function SolicitudActions({ report, visitId, clientId, defaultBranchId, currentUser }: SolicitudActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderType, setOrderType] = useState<"OT" | "OTS">("OT");
  const [branchId, setBranchId] = useState<string>(defaultBranchId ?? BRANCHES[0].id);
  const [busy, setBusy] = useState(false);

  async function createOrder() {
    if (!clientId) { toast.error("La visita no tiene cliente; no se puede crear la OT."); return; }
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 1) Número correlativo
    const { data: orderNumber, error: seqError } = await sb.rpc("generate_order_number", {
      p_order_type: orderType, p_branch_id: branchId,
    });
    if (seqError || !orderNumber) { toast.error(`Error al generar el número de orden: ${seqError?.message ?? "sin respuesta"}`); setBusy(false); return; }

    // 2) Crear la OT (el admin luego completa precios en el detalle)
    const today = new Date().toISOString().slice(0, 10);
    const { data: newOrder, error: orderError } = await sb.from("work_orders").insert({
      order_number: orderNumber, order_type: orderType, branch_id: branchId,
      client_id: clientId, date_in: today, status: "ingresada", currency: "USD",
      subtotal: 0, total: 0, general_notes: "Creada desde una solicitud de Zaire Field.",
      created_by: currentUser?.id ?? null,
    }).select("id").single();
    if (orderError || !newOrder) { toast.error("Error al crear la orden"); setBusy(false); return; }

    // 3) Ítem con los datos del reporte
    const { data: newItem } = await sb.from("work_order_items").insert({
      work_order_id: newOrder.id, item_number: 1, product_id: null,
      custom_description: report.equipment_tag || "Equipo relevado en visita de campo",
      quantity: 1, serial_number: report.serial_number || null, equipment_number: report.equipment_tag || null,
      additional_observation: report.findings || null,
      unit_price: 0, total_price: 0, unit_price_ars: 0, total_price_ars: 0,
      repair_required: report.requires_repair, notes: report.recommendations || null, status: "pendiente",
      modelo: report.modelo || null, medida: report.medida || null, unidad_medida: report.unidad_medida || null,
      marca: report.marca || null, materiales_caras: report.materiales_caras || null,
      materiales_orings: report.materiales_orings || null, origen_abastecimiento: null, orden_compra_item: null,
      is_quoted: false, is_remitted: false, qty_remitted: 0, is_delivered: false, qty_delivered: 0,
      is_invoiced: false, qty_invoiced: 0,
    }).select("id").single();

    // 4) Vincular a la visita + marcar la solicitud como vinculada
    await sb.from("field_visits").update({ work_order_id: newOrder.id }).eq("id", visitId);
    await sb.from("field_visit_reports").update({
      ot_request_status: "vinculada", created_work_order_item_id: newItem?.id ?? null,
    }).eq("id", report.id);

    // 5) Historial + auditoría
    await sb.from("work_order_status_history").insert({
      work_order_id: newOrder.id, old_status: null, new_status: "ingresada",
      changed_by: currentUser?.id ?? null, notes: "Orden creada desde solicitud de Field",
    });
    await sb.from("audit_logs").insert({
      entity_type: "work_order", entity_id: newOrder.id, action: "create",
      description: `Orden ${orderNumber} creada desde una solicitud de Zaire Field`,
      user_id: currentUser?.id ?? null, user_name: currentUser?.name ?? null,
    });

    toast.success(`Orden ${orderNumber} creada. Completá los precios en el detalle.`);
    router.push(ROUTES.trace.orden(newOrder.id));
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
        <GitBranchPlus className="w-4 h-4 mr-1.5" /> Crear OT/OTS
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crear orden desde la solicitud</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={orderType} onValueChange={(v) => setOrderType((v ?? "OT") as "OT" | "OTS")}>
                  <SelectTrigger><SelectValue>{orderType}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OT">OT</SelectItem>
                    <SelectItem value="OTS">OTS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sucursal</Label>
                <Select value={branchId} onValueChange={(v) => setBranchId(v ?? BRANCHES[0].id)}>
                  <SelectTrigger><SelectValue>{BRANCHES.find((b) => b.id === branchId)?.name ?? "—"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Se creará una orden con <strong>numeración correlativa e irrepetible</strong> y un ítem con los
                datos del reporte. Esta acción <strong>no se puede deshacer</strong> y queda registrada de forma
                imborrable en el historial y la auditoría. Luego completás los precios en el detalle de la orden.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={createOrder} disabled={busy} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Sí, crear la orden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
