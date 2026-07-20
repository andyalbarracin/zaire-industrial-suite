"use client";
// consume-from-order.tsx — src/components/stock/consume-from-order.tsx — 2026-07-18
// Cross-módulo Stock↔Trace (gateado): despachar/consumir de stock los ítems de una OT.
// Autocontenido: fetchea depósitos/niveles al abrir; NO cambia las props del detalle de OT.

import { useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isModuleEnabled } from "@/lib/modules";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logStockAudit } from "@/lib/stock/audit";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_id: string | null;
  quantity: number;
  products: { id: string; name: string } | null;
}
interface Wh { id: string; name: string }
interface Lvl { product_id: string; warehouse_id: string; available: number }
interface Row { include: boolean; qty: string; warehouseId: string }

export function ConsumeFromOrder({ orderId, items }: { orderId: string; items: OrderItem[] }) {
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [levels, setLevels] = useState<Lvl[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dispatchable = items.filter((i) => i.product_id);
  if (!isModuleEnabled("stock") || dispatchable.length === 0) return null;

  async function onOpen() {
    setOpen(true);
    setLoading(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [{ data: whs }, { data: lvls }] = await Promise.all([
      sb.from("stock_warehouses").select("id, name").is("deleted_at", null).eq("is_active", true).order("name"),
      sb.from("stock_levels").select("product_id, warehouse_id, available"),
    ]);
    const wh = (whs ?? []) as Wh[];
    setWarehouses(wh);
    setLevels((lvls ?? []) as Lvl[]);
    const init: Record<string, Row> = {};
    dispatchable.forEach((i) => { init[i.id] = { include: true, qty: String(i.quantity), warehouseId: wh[0]?.id ?? "" }; });
    setRows(init);
    setLoading(false);
  }

  const availOf = (productId: string | null, warehouseId: string) =>
    levels.find((l) => l.product_id === productId && l.warehouse_id === warehouseId)?.available ?? 0;

  async function dispatch() {
    setSubmitting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    let ok = 0, fail = 0;
    for (const it of dispatchable) {
      const r = rows[it.id];
      if (!r?.include) continue;
      const qty = Number(r.qty) || 0;
      if (qty <= 0 || !r.warehouseId) { fail++; continue; }
      const { error } = await sb.rpc("consume_stock", {
        p_product_id: it.product_id, p_warehouse_id: r.warehouseId, p_qty: qty,
        p_ref_type: "ot", p_ref_id: orderId, p_notes: "Despacho desde OT", p_created_by: user?.id ?? null,
      });
      if (error) fail++; else { ok++; logStockAudit("stock_movement", it.product_id!, "consume", `Consumo desde OT ${orderId.slice(0, 8)} · ${qty}`); }
    }
    setSubmitting(false);
    if (ok) toast.success(`${ok} ítem(s) despachado(s) de stock`);
    if (fail) toast.error(`${fail} ítem(s) no se pudieron despachar (stock insuficiente?)`);
    if (ok) setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onOpen}><Boxes className="w-3.5 h-3.5 mr-1.5" /> Consumir de stock</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Despachar ítems de la OT desde stock</DialogTitle></DialogHeader>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-(--zaire-text-muted)" /></div>
          ) : warehouses.length === 0 ? (
            <p className="text-sm text-(--zaire-text-muted) py-6 text-center">No hay depósitos. Creá uno en Zaire Stock → Depósitos.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-(--zaire-text-muted)">Descuenta stock (movimiento de consumo, auditado e irreversible). Elegí depósito y cantidad por ítem.</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dispatchable.map((it) => {
                  const r = rows[it.id] ?? { include: true, qty: String(it.quantity), warehouseId: warehouses[0]?.id ?? "" };
                  const avail = availOf(it.product_id, r.warehouseId);
                  const short = (Number(r.qty) || 0) > avail;
                  return (
                    <div key={it.id} className={cn("rounded-lg border p-3 flex items-center gap-3", r.include ? "border-(--zaire-border)" : "border-(--zaire-border) opacity-50")}>
                      <input type="checkbox" checked={r.include} onChange={(e) => setRows((p) => ({ ...p, [it.id]: { ...r, include: e.target.checked } }))} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-(--zaire-text) truncate">{it.products?.name ?? "Producto"}</p>
                        <p className="text-xs text-(--zaire-text-muted)">Disponible en depósito: <b className={cn("tabular-nums", short && "text-red-600 dark:text-red-300")}>{avail}</b></p>
                      </div>
                      <Input type="number" min="0" step="any" value={r.qty} onChange={(e) => setRows((p) => ({ ...p, [it.id]: { ...r, qty: e.target.value } }))} className="w-20 h-9" />
                      <Select value={r.warehouseId} onValueChange={(v) => setRows((p) => ({ ...p, [it.id]: { ...r, warehouseId: v ?? "" } }))}>
                        <SelectTrigger className="h-9 w-40"><SelectValue>{warehouses.find((w) => w.id === r.warehouseId)?.name}</SelectValue></SelectTrigger>
                        <SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={dispatch} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Despachar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
