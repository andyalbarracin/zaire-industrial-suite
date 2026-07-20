"use client";
// series-view.tsx — src/components/stock/series-view.tsx — 2026-07-18
// Trazabilidad de series/lotes: búsqueda + filtro por estado.

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERIAL_STATUS_LABELS, SERIAL_STATUS_BADGE } from "@/lib/stock/constants";
import { formatDate, cn } from "@/lib/utils";
import type { StockSerial, SerialStatus } from "@/lib/stock/types";

export function SeriesView({ serials }: { serials: StockSerial[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let data = serials;
    if (statusFilter !== "all") data = data.filter((s) => s.status === statusFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter((x) => x.serial.toLowerCase().includes(s) || (x.lot ?? "").toLowerCase().includes(s) || (x.product?.name ?? "").toLowerCase().includes(s));
    }
    return data;
  }, [serials, statusFilter, q]);

  return (
    <div className="zaire-card">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--zaire-border) flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar serie, lote o producto..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44"><SelectValue>{statusFilter === "all" ? "Todos los estados" : SERIAL_STATUS_LABELS[statusFilter as SerialStatus]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(SERIAL_STATUS_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Serie</th>
              <th className="text-left px-4 py-3">Lote</th>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-left px-4 py-3">Depósito</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-subtle/80 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-(--zaire-text)">{s.serial}</td>
                <td className="px-4 py-3 text-(--zaire-text-muted)">{s.lot ?? "—"}</td>
                <td className="px-4 py-3 text-(--zaire-text) truncate max-w-48">{s.product?.name ?? "—"}</td>
                <td className="px-4 py-3 text-(--zaire-text-muted)">{s.warehouse?.name ?? "—"}</td>
                <td className="px-4 py-3"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", SERIAL_STATUS_BADGE[s.status])}>{SERIAL_STATUS_LABELS[s.status]}</span></td>
                <td className="px-4 py-3 text-right text-(--zaire-text-muted) whitespace-nowrap">{formatDate(s.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (<tr><td colSpan={6} className="px-4 py-12 text-center text-(--zaire-text-muted)">Sin series registradas</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
