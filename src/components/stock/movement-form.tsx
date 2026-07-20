"use client";
// movement-form.tsx — src/components/stock/movement-form.tsx — 2026-07-18
// Registrar movimiento (entrada/salida/ajuste/transferencia) vía RPC atómico apply_stock_movement /
// apply_stock_transfer. Muestra WAC en vivo (entradas) y valida disponible (salidas/transferencias).

import { useState, useMemo } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSelect } from "@/components/products/product-select";
import { MOVEMENT_TYPE_LABELS } from "@/lib/stock/constants";
import { logStockAudit } from "@/lib/stock/audit";
import { computeWac, availableQty } from "@/lib/stock/movements";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/types/database";
import type { Warehouse, StockLevel, MovementType, Currency } from "@/lib/stock/types";

type FormType = "entrada" | "salida" | "ajuste" | "transferencia";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  warehouses: Warehouse[];
  levels: StockLevel[];
  onDone: () => void;
}

export function MovementForm({ open, onOpenChange, products, warehouses, levels, onDone }: Props) {
  const [type, setType] = useState<FormType>("entrada");
  const [productId, setProductId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [destId, setDestId] = useState("");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [ajusteSign, setAjusteSign] = useState<"sumar" | "restar">("restar");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const qtyNum = Number(qty) || 0;
  const costNum = Number(unitCost) || 0;
  const product = products.find((p) => p.id === productId);
  const currency = (product?.default_currency ?? "ARS") as Currency;
  const level = useMemo(() => levels.find((l) => l.product_id === productId && l.warehouse_id === warehouseId), [levels, productId, warehouseId]);
  const onHand = level?.on_hand ?? 0;
  const reserved = level?.reserved ?? 0;
  const avgCost = level?.avg_cost ?? 0;
  const available = availableQty(onHand, reserved);

  const newWac = type === "entrada" && qtyNum > 0 && costNum > 0 ? computeWac(onHand, avgCost, qtyNum, costNum) : null;
  const needsAvail = type === "salida" || type === "transferencia" || (type === "ajuste" && ajusteSign === "restar");
  const insufficient = needsAvail && qtyNum > 0 && qtyNum > available;

  function resetForm() {
    setType("entrada"); setProductId(null); setWarehouseId(""); setDestId(""); setQty(""); setUnitCost("");
    setAjusteSign("restar"); setSerial(""); setNotes("");
  }

  const canSubmit = !!productId && !!warehouseId && qtyNum > 0 &&
    (type !== "transferencia" || (!!destId && destId !== warehouseId)) && !insufficient;

  async function handleSubmit() {
    if (!canSubmit || !productId) return;
    setSubmitting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    const createdBy = user?.id ?? null;

    let error;
    if (type === "transferencia") {
      ({ error } = await sb.rpc("apply_stock_transfer", {
        p_product_id: productId, p_from: warehouseId, p_to: destId, p_qty: qtyNum,
        p_serial: serial || null, p_notes: notes || null, p_created_by: createdBy,
      }));
    } else {
      const signed = type === "salida" ? -qtyNum : type === "ajuste" ? (ajusteSign === "restar" ? -qtyNum : qtyNum) : qtyNum;
      ({ error } = await sb.rpc("apply_stock_movement", {
        p_product_id: productId, p_warehouse_id: warehouseId, p_type: type as MovementType, p_qty: signed,
        p_unit_cost: type === "entrada" && costNum > 0 ? costNum : null,
        p_ref_type: type === "entrada" ? "compra" : "ajuste", p_serial: serial || null,
        p_notes: notes || null, p_created_by: createdBy,
      }));
    }

    setSubmitting(false);
    if (error) { toast.error(error.message?.includes("insuficiente") ? "Stock insuficiente para el movimiento" : "No se pudo registrar el movimiento"); return; }

    // Serie/lote: mantener el estado de la unidad serializada según el tipo de movimiento.
    if (serial.trim()) {
      const s = serial.trim();
      if (type === "entrada") {
        await sb.from("stock_serials").upsert({ product_id: productId, serial: s, warehouse_id: warehouseId, status: "disponible", unit_cost: costNum > 0 ? costNum : null }, { onConflict: "product_id,serial" });
      } else if (type === "salida") {
        await sb.from("stock_serials").update({ status: "despachado" }).eq("product_id", productId).eq("serial", s);
      } else if (type === "transferencia") {
        await sb.from("stock_serials").update({ warehouse_id: destId }).eq("product_id", productId).eq("serial", s);
      }
    }
    logStockAudit("stock_movement", productId, "movement", `${MOVEMENT_TYPE_LABELS[type as MovementType]} de ${qtyNum} · ${product?.name ?? ""}`);
    toast.success("Movimiento registrado");
    resetForm();
    onDone();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-4 gap-2">
            {(["entrada", "salida", "ajuste", "transferencia"] as FormType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn("px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  type === t ? "bg-brand text-white border-brand" : "bg-panel text-(--zaire-text-muted) border-(--zaire-border) hover:bg-subtle")}>
                {MOVEMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Producto */}
          <div>
            <Label>Producto *</Label>
            <div className="mt-1"><ProductSelect products={products} value={productId} onChange={setProductId} /></div>
          </div>

          {/* Depósito(s) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{type === "transferencia" ? "Origen *" : "Depósito *"}</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v ?? "")}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Elegir depósito">{warehouses.find((w) => w.id === warehouseId)?.name}</SelectValue></SelectTrigger>
                <SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {type === "transferencia" && (
              <div>
                <Label>Destino *</Label>
                <Select value={destId} onValueChange={(v) => setDestId(v ?? "")}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Elegir destino">{warehouses.find((w) => w.id === destId)?.name}</SelectValue></SelectTrigger>
                  <SelectContent>{warehouses.filter((w) => w.id !== warehouseId).map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            {type === "ajuste" && (
              <div>
                <Label>Sentido</Label>
                <Select value={ajusteSign} onValueChange={(v) => setAjusteSign((v as "sumar" | "restar") ?? "restar")}>
                  <SelectTrigger className="mt-1"><SelectValue>{ajusteSign === "sumar" ? "Sumar (+)" : "Restar (−)"}</SelectValue></SelectTrigger>
                  <SelectContent><SelectItem value="sumar">Sumar (+)</SelectItem><SelectItem value="restar">Restar (−)</SelectItem></SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Estado actual del nivel */}
          {productId && warehouseId && (
            <div className="rounded-lg bg-subtle border border-(--zaire-border) px-3 py-2 text-xs text-(--zaire-text-muted) flex flex-wrap gap-x-4 gap-y-1">
              <span>Stock: <b className="text-(--zaire-text) tabular-nums">{onHand}</b></span>
              <span>Disponible: <b className="text-(--zaire-text) tabular-nums">{available}</b></span>
              <span>Costo WAC: <b className="text-(--zaire-text) tabular-nums">{formatCurrency(avgCost, currency)}</b></span>
            </div>
          )}

          {/* Cantidad + costo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cantidad *</Label>
              <Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" placeholder="0" />
              {insufficient && <p className="text-xs text-red-600 dark:text-red-300 mt-1">Supera el disponible ({available}).</p>}
            </div>
            {type === "entrada" && (
              <div>
                <Label>Costo unitario</Label>
                <Input type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="mt-1" placeholder="0" />
              </div>
            )}
          </div>

          {/* WAC en vivo */}
          {newWac != null && (
            <div className="rounded-lg bg-brand-soft border border-(--zaire-border) px-3 py-2 text-xs flex items-center gap-2">
              <span className="text-(--zaire-text-muted)">Nuevo costo WAC:</span>
              <span className="tabular-nums text-(--zaire-text-muted)">{formatCurrency(avgCost, currency)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-(--zaire-text-muted)" />
              <span className="tabular-nums font-semibold text-brand-strong">{formatCurrency(newWac, currency)}</span>
            </div>
          )}

          {/* Serie / notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>N° de serie / lote (opcional)</Label>
              <Input value={serial} onChange={(e) => setSerial(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Registrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
