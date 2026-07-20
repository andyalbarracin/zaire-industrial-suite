"use client";
// consume-in-visit.tsx — src/components/stock/consume-in-visit.tsx — 2026-07-18
// Cross-módulo Stock↔Field (gateado): consumir repuestos de stock en una visita.
// Autocontenido: fetchea productos/depósitos/niveles al abrir; por defecto usa el depósito
// móvil vinculado al vehículo de la visita si existe.

import { useState } from "react";
import { Boxes, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isModuleEnabled } from "@/lib/modules";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSelect } from "@/components/products/product-select";
import { logStockAudit } from "@/lib/stock/audit";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types/database";

interface Wh { id: string; name: string; field_vehicle_id: string | null }
interface Lvl { product_id: string; warehouse_id: string; available: number }
interface Line { productId: string | null; warehouseId: string; qty: string }

export function ConsumeInVisit({ visitId, vehicleId }: { visitId: string; vehicleId: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [levels, setLevels] = useState<Lvl[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  if (!isModuleEnabled("stock")) return null;

  async function onOpen() {
    setOpen(true);
    setLoading(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [{ data: prods }, { data: whs }, { data: lvls }] = await Promise.all([
      sb.from("products").select("id, code, name, description, category, brand, model, unit, default_currency, default_unit_price, is_active, notes, created_at, updated_at").eq("is_active", true).order("name"),
      sb.from("stock_warehouses").select("id, name, field_vehicle_id").is("deleted_at", null).eq("is_active", true).order("name"),
      sb.from("stock_levels").select("product_id, warehouse_id, available"),
    ]);
    const wh = (whs ?? []) as Wh[];
    setProducts((prods ?? []) as Product[]);
    setWarehouses(wh);
    setLevels((lvls ?? []) as Lvl[]);
    const defaultWh = wh.find((w) => w.field_vehicle_id === vehicleId)?.id ?? wh[0]?.id ?? "";
    setLines([{ productId: null, warehouseId: defaultWh, qty: "1" }]);
    setLoading(false);
  }

  const availOf = (productId: string | null, warehouseId: string) =>
    levels.find((l) => l.product_id === productId && l.warehouse_id === warehouseId)?.available ?? 0;

  const setLine = (i: number, patch: Partial<Line>) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((p) => [...p, { productId: null, warehouseId: warehouses[0]?.id ?? "", qty: "1" }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));

  const validLines = lines.filter((l) => l.productId && l.warehouseId && (Number(l.qty) || 0) > 0);

  async function dispatch() {
    if (validLines.length === 0) return;
    setSubmitting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    let ok = 0, fail = 0;
    for (const l of validLines) {
      const { error } = await sb.rpc("consume_stock", {
        p_product_id: l.productId, p_warehouse_id: l.warehouseId, p_qty: Number(l.qty),
        p_ref_type: "visita", p_ref_id: visitId, p_notes: "Consumo en visita", p_created_by: user?.id ?? null,
      });
      if (error) fail++; else { ok++; logStockAudit("stock_movement", l.productId!, "consume", `Consumo en visita ${visitId.slice(0, 8)} · ${l.qty}`); }
    }
    setSubmitting(false);
    if (ok) toast.success(`${ok} repuesto(s) consumido(s) de stock`);
    if (fail) toast.error(`${fail} no se pudieron consumir (stock insuficiente?)`);
    if (ok) setOpen(false);
  }

  return (
    <>
      <Button variant="outline" onClick={onOpen}><Boxes className="w-4 h-4 mr-1.5" /> Consumir de stock</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Consumir repuestos de stock</DialogTitle></DialogHeader>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-(--zaire-text-muted)" /></div>
          ) : warehouses.length === 0 ? (
            <p className="text-sm text-(--zaire-text-muted) py-6 text-center">No hay depósitos. Creá uno en Zaire Stock → Depósitos.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-(--zaire-text-muted)">Descuenta stock (movimiento de consumo, auditado). Por defecto usa el depósito de la unidad de la visita.</p>
              <div className="space-y-2">
                {lines.map((l, i) => {
                  const avail = availOf(l.productId, l.warehouseId);
                  const short = (Number(l.qty) || 0) > avail && !!l.productId;
                  return (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <ProductSelect products={products} value={l.productId} onChange={(v) => setLine(i, { productId: v })} />
                        {l.productId && <p className="text-[11px] text-(--zaire-text-muted) mt-0.5">Disp.: <b className={cn("tabular-nums", short && "text-red-600 dark:text-red-300")}>{avail}</b></p>}
                      </div>
                      <Input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} className="w-20 h-10" />
                      <Select value={l.warehouseId} onValueChange={(v) => setLine(i, { warehouseId: v ?? "" })}>
                        <SelectTrigger className="h-10 w-40"><SelectValue>{warehouses.find((w) => w.id === l.warehouseId)?.name}</SelectValue></SelectTrigger>
                        <SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)} className="h-10"><X className="w-4 h-4" /></Button>
                    </div>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1.5" /> Agregar repuesto</Button>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={dispatch} disabled={submitting || validLines.length === 0}>{submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Consumir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
