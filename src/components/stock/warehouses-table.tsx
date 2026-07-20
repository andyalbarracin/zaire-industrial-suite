"use client";
// warehouses-table.tsx — src/components/stock/warehouses-table.tsx — 2026-07-18
// ABM de depósitos (empresa / unidad móvil). Tabla simple + form modal.

import { useState } from "react";
import { Plus, Pencil, Warehouse as WarehouseIcon, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarehouseForm } from "@/components/stock/warehouse-form";
import { WAREHOUSE_TYPE_LABELS } from "@/lib/stock/constants";
import { cn } from "@/lib/utils";
import type { Warehouse } from "@/lib/stock/types";

interface Props {
  initialWarehouses: Warehouse[];
  vehicles: { id: string; label: string }[];
}

export function WarehousesTable({ initialWarehouses, vehicles }: Props) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  function handleSaved(w: Warehouse) {
    setWarehouses((prev) => {
      const idx = prev.findIndex((x) => x.id === w.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = w; return next; }
      return [w, ...prev];
    });
  }

  return (
    <>
      <div className="zaire-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--zaire-border)">
          <span className="text-sm text-(--zaire-text-muted)">{warehouses.length} depósito(s)</span>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo depósito
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Depósito</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Ubicación</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {warehouses.map((w) => (
                <tr key={w.id} className="hover:bg-subtle/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-soft grid place-items-center shrink-0">
                        {w.type === "vehiculo" ? <Truck className="w-4 h-4 text-brand-strong" /> : <WarehouseIcon className="w-4 h-4 text-brand-strong" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-(--zaire-text)">{w.name}</p>
                        {w.code && <p className="text-xs text-(--zaire-text-muted) font-mono">{w.code}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-subtle-2 text-(--zaire-text-muted) border border-(--zaire-border)">
                      {WAREHOUSE_TYPE_LABELS[w.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{w.address ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                      w.is_active ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30"
                                  : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30")}>
                      {w.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(w); setFormOpen(true); }} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {warehouses.length === 0 && (<tr><td colSpan={5} className="px-4 py-12 text-center text-(--zaire-text-muted)">Sin depósitos. Creá el primero.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <WarehouseForm open={formOpen} onOpenChange={setFormOpen} warehouse={editing} vehicles={vehicles} onSaved={handleSaved} />
    </>
  );
}
