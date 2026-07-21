"use client";
// asset-components-section.tsx — src/components/assets/asset-components-section.tsx — 2026-07-20
// Genealogía/BOM del equipo: agregar/quitar piezas (producto del catálogo de Stock o nombre libre).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2, X, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isModuleEnabled } from "@/lib/modules";
import { ROUTES } from "@/lib/routes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductSelect } from "@/components/products/product-select";
import { logAssetAudit } from "@/lib/assets/audit";
import type { AssetComponent } from "@/lib/assets/types";
import type { Product } from "@/lib/types/database";

export function AssetComponentsSection({ assetId, components, products }: { assetId: string; components: AssetComponent[]; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stockOn = isModuleEnabled("stock");
  const canAdd = !!productId || name.trim() !== "";

  async function add() {
    if (!canAdd) return;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("asset_components").insert({
      asset_id: assetId, product_id: productId, name: productId ? null : (name || null),
      serial: serial || null, qty: Number(qty) || 1,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo agregar el componente"); return; }
    logAssetAudit("asset", assetId, "update", "Componente agregado");
    toast.success("Componente agregado");
    setProductId(null); setName(""); setSerial(""); setQty("1"); setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("asset_components").delete().eq("id", id);
    setBusyId(null);
    if (error) { toast.error("No se pudo quitar"); return; }
    toast.success("Componente quitado");
    router.refresh();
  }

  return (
    <div className="zaire-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-(--zaire-border)">
        <h3 className="font-semibold text-(--zaire-text)">Componentes</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-8"><Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar</Button>
      </div>
      <div className="p-4">
        {components.length === 0 ? (
          <p className="text-sm text-(--zaire-text-muted) text-center py-2">Sin componentes registrados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {components.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-(--zaire-border) px-2.5 py-1.5 text-xs">
                {stockOn && c.product_id
                  ? <Link href={ROUTES.stock.producto(c.product_id)} className="text-zaire-blue hover:underline inline-flex items-center gap-1" title="Ver en stock"><PackageSearch className="w-3 h-3" />{c.product?.name ?? "Pieza"}</Link>
                  : <span className="text-(--zaire-text)">{c.product?.name ?? c.name ?? "Pieza"}</span>}
                {c.serial && <span className="font-mono text-(--zaire-text-muted)">{c.serial}</span>}
                {c.qty !== 1 && <span className="text-(--zaire-text-muted)">×{c.qty}</span>}
                <button type="button" onClick={() => remove(c.id)} disabled={busyId === c.id} className="text-(--zaire-text-muted) hover:text-red-600 dark:hover:text-red-300"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agregar componente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Producto del catálogo (opcional)</Label><div className="mt-1"><ProductSelect products={products} value={productId} onChange={setProductId} /></div></div>
            {!productId && (<div><Label>Nombre (si no está en catálogo)</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Ej: Rodamiento" /></div>)}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>N° de serie</Label><Input value={serial} onChange={(e) => setSerial(e.target.value)} className="mt-1" /></div>
              <div><Label>Cantidad</Label><Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={add} disabled={!canAdd || saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
