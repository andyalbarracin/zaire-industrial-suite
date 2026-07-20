"use client";
// reservations-view.tsx — src/components/stock/reservations-view.tsx — 2026-07-18
// Reservas de stock: lista + crear (reserve_stock) + liberar/consumir (release/consume_stock, RPC atómicos).

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSelect } from "@/components/products/product-select";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_BADGE } from "@/lib/stock/constants";
import { logStockAudit } from "@/lib/stock/audit";
import { availableQty } from "@/lib/stock/movements";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types/database";
import type { StockReservation, Warehouse, StockLevel } from "@/lib/stock/types";

const REF_LABELS: Record<string, string> = { ot: "OT", quote: "Cotización", visita: "Visita", manual: "Manual" };

interface Props {
  reservations: StockReservation[];
  products: Product[];
  warehouses: Warehouse[];
  levels: StockLevel[];
}

export function ReservationsView({ reservations, products, warehouses, levels }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [qty, setQty] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const qtyNum = Number(qty) || 0;
  const level = useMemo(() => levels.find((l) => l.product_id === productId && l.warehouse_id === warehouseId), [levels, productId, warehouseId]);
  const available = level ? availableQty(level.on_hand, level.reserved) : 0;
  const insufficient = qtyNum > 0 && !!level && qtyNum > available;
  const canCreate = !!productId && !!warehouseId && qtyNum > 0 && !insufficient;

  async function createReservation() {
    if (!canCreate || !productId) return;
    setSubmitting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await sb.rpc("reserve_stock", {
      p_product_id: productId, p_warehouse_id: warehouseId, p_qty: qtyNum,
      p_ref_type: "manual", p_created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message?.includes("insuficiente") ? "Disponible insuficiente" : "No se pudo reservar"); return; }
    logStockAudit("stock_reservation", data ?? productId, "reservation", "Reserva creada");
    toast.success("Reserva creada");
    setProductId(null); setWarehouseId(""); setQty(""); setOpen(false);
    router.refresh();
  }

  async function release(r: StockReservation) {
    setBusyId(r.id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.rpc("release_reservation", { p_reservation_id: r.id });
    setBusyId(null);
    if (error) { toast.error("No se pudo liberar"); return; }
    logStockAudit("stock_reservation", r.id, "reservation", "Reserva liberada");
    toast.success("Reserva liberada");
    router.refresh();
  }

  async function consume(r: StockReservation) {
    setBusyId(r.id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await sb.rpc("consume_stock", {
      p_product_id: r.product_id, p_warehouse_id: r.warehouse_id, p_qty: r.qty,
      p_ref_type: r.ref_type, p_ref_id: r.ref_id, p_created_by: user?.id ?? null, p_reservation_id: r.id,
    });
    setBusyId(null);
    if (error) { toast.error("No se pudo consumir"); return; }
    logStockAudit("stock_reservation", r.id, "consume", "Reserva consumida (baja de stock)");
    toast.success("Consumido de stock");
    router.refresh();
  }

  return (
    <div className="zaire-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--zaire-border)">
        <span className="text-sm text-(--zaire-text-muted)">{reservations.length} reserva(s)</span>
        <Button onClick={() => setOpen(true)} className="h-9"><Plus className="w-4 h-4 mr-1.5" /> Nueva reserva</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-left px-4 py-3">Depósito</th>
              <th className="text-right px-4 py-3">Cant.</th>
              <th className="text-left px-4 py-3">Origen</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {reservations.map((r) => (
              <tr key={r.id} className="hover:bg-subtle/80 transition-colors">
                <td className="px-4 py-3 text-(--zaire-text) truncate max-w-48">{r.product?.name ?? "—"}</td>
                <td className="px-4 py-3 text-(--zaire-text-muted)">{r.warehouse?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{r.qty}</td>
                <td className="px-4 py-3 text-(--zaire-text-muted)">{REF_LABELS[r.ref_type] ?? r.ref_type}</td>
                <td className="px-4 py-3"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", RESERVATION_STATUS_BADGE[r.status])}>{RESERVATION_STATUS_LABELS[r.status]}</span></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.status === "activa" ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => release(r)}>Liberar</Button>
                      <Button size="sm" disabled={busyId === r.id} onClick={() => consume(r)}>{busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Consumir"}</Button>
                    </div>
                  ) : <span className="text-xs text-(--zaire-text-muted)">—</span>}
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (<tr><td colSpan={6} className="px-4 py-12 text-center text-(--zaire-text-muted)">Sin reservas</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* Modal crear reserva */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva reserva</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Producto *</Label>
              <div className="mt-1"><ProductSelect products={products} value={productId} onChange={setProductId} /></div>
            </div>
            <div>
              <Label>Depósito *</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v ?? "")}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Elegir depósito">{warehouses.find((w) => w.id === warehouseId)?.name}</SelectValue></SelectTrigger>
                <SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {productId && warehouseId && (
              <p className="text-xs text-(--zaire-text-muted)">Disponible: <b className="text-(--zaire-text) tabular-nums">{available}</b></p>
            )}
            <div>
              <Label>Cantidad *</Label>
              <Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" placeholder="0" />
              {insufficient && <p className="text-xs text-red-600 dark:text-red-300 mt-1">Supera el disponible ({available}).</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={createReservation} disabled={!canCreate || submitting}>{submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Reservar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
