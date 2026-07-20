"use client";
// movements-view.tsx — src/components/stock/movements-view.tsx — 2026-07-18
// Lista de movimientos de stock + filtro por tipo/búsqueda + alta (MovementForm).

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovementForm } from "@/components/stock/movement-form";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_BADGE } from "@/lib/stock/constants";
import { formatDateTime, formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/types/database";
import type { StockMovement, Warehouse, StockLevel, MovementType, Currency } from "@/lib/stock/types";

interface Props {
  movements: StockMovement[];
  products: Product[];
  warehouses: Warehouse[];
  levels: StockLevel[];
}

export function MovementsView({ movements, products, warehouses, levels }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    let data = movements;
    if (typeFilter !== "all") data = data.filter((m) => m.type === typeFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter((m) => (m.product?.name ?? "").toLowerCase().includes(s) || (m.doc_number ?? "").toLowerCase().includes(s));
    }
    return data;
  }, [movements, typeFilter, q]);

  return (
    <div className="zaire-card">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--zaire-border) flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar producto o comprobante..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44"><SelectValue>{typeFilter === "all" ? "Todos los tipos" : MOVEMENT_TYPE_LABELS[typeFilter as MovementType]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)} className="ml-auto h-9"><Plus className="w-4 h-4 mr-1.5" /> Nuevo movimiento</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Comprobante</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-left px-4 py-3">Depósito</th>
              <th className="text-right px-4 py-3">Cant.</th>
              <th className="text-right px-4 py-3">Costo u.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {filtered.map((m) => {
              const cur = (m.product?.default_currency ?? "ARS") as Currency;
              return (
                <tr key={m.id} className="hover:bg-subtle/80 transition-colors">
                  <td className="px-4 py-3 text-(--zaire-text-muted) whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-(--zaire-text-muted)">{m.doc_number ?? "—"}</td>
                  <td className="px-4 py-3"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", MOVEMENT_TYPE_BADGE[m.type])}>{MOVEMENT_TYPE_LABELS[m.type]}</span></td>
                  <td className="px-4 py-3 text-(--zaire-text) truncate max-w-48">{m.product?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{m.warehouse?.name ?? "—"}</td>
                  <td className={cn("px-4 py-3 text-right tabular-nums font-medium", m.qty < 0 ? "text-red-600 dark:text-red-300" : "text-green-600 dark:text-green-300")}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-(--zaire-text-muted)">{m.unit_cost != null ? formatCurrency(m.unit_cost, cur) : "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-12 text-center text-(--zaire-text-muted)">Sin movimientos</td></tr>)}
          </tbody>
        </table>
      </div>

      <MovementForm open={formOpen} onOpenChange={setFormOpen} products={products} warehouses={warehouses} levels={levels} onDone={() => router.refresh()} />
    </div>
  );
}
