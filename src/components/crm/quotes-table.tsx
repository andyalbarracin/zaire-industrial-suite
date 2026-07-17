"use client";
// quotes-table.tsx — src/components/crm/quotes-table.tsx — 2026-07-17
// Lista de cotizaciones: búsqueda, filtro por estado, navegación a nueva/editar/ficha y borrado.
// Fila 100% clickeable (estándar UX). Deriva de props + router.refresh().

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logCrmAudit } from "@/lib/crm/audit";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/field/filter-bar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/crm/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { CrmQuote } from "@/lib/crm/types";

const PAGE_SIZES = [10, 20, 50, 100];

export function QuotesTable({ initialQuotes }: { initialQuotes: CrmQuote[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleting, setDeleting] = useState<CrmQuote | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return initialQuotes.filter((q) => {
      if (statusFilter && q.status !== statusFilter) return false;
      if (s) {
        const hay = `${q.quote_number ?? ""} ${q.title} ${q.client?.business_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [initialQuotes, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("crm_quotes").update({ deleted_at: new Date().toISOString() }).eq("id", deleting.id);
    if (error) { toast.error("Error al eliminar la cotización"); setDeletingBusy(false); return; }
    void logCrmAudit("crm_quote", deleting.id, "delete", `Cotización eliminada: ${deleting.title}`);
    toast.success("Cotización eliminada");
    setDeletingBusy(false);
    setDeleting(null);
    router.refresh();
  }

  function exportExcel() {
    const rows = filtered.map((q) => ({
      Número: q.quote_number ?? "", Título: q.title, Cliente: q.client?.business_name ?? "",
      Estado: QUOTE_STATUS_LABELS[q.status], Total: q.total, Moneda: q.currency,
      Margen_pct: q.margin_pct, Válida_hasta: q.valid_until ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");
    XLSX.writeFile(wb, `Zaire_CRM_Cotizaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="zaire-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input placeholder="Buscar cotizaciones..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
            <Button onClick={() => router.push(ROUTES.crm.cotizacionNueva)} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"><Plus className="w-4 h-4 mr-1.5" /> Nueva Cotización</Button>
          </div>
        </div>

        <FilterBar
          groups={[{
            key: "estado", label: "Estado",
            options: QUOTE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            selected: statusFilter ? [statusFilter] : [],
            onToggle: (v) => { setStatusFilter(statusFilter === v ? "" : v); setPage(0); },
          }]}
          onClear={() => { setStatusFilter(""); setPage(0); }}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">N°</th>
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Margen</th>
                <th className="text-left px-4 py-3">Válida hasta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {pageRows.map((q) => (
                <tr key={q.id} onClick={() => router.push(ROUTES.crm.cotizacion(q.id))} className="hover:bg-slate-50/80 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-zaire-blue">{q.quote_number ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-(--zaire-text)">{q.title}</td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{q.client?.business_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", QUOTE_STATUS_COLORS[q.status])}>{QUOTE_STATUS_LABELS[q.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(q.total, q.currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{q.margin_pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{q.valid_until ? formatDate(q.valid_until) : "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.crm.cotizacionEditar(q.id))} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(q)} title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-(--zaire-text-muted)">No hay cotizaciones</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
          <div className="flex items-center gap-2">
            <span>{filtered.length} cotizaciones</span>
            <span className="text-(--zaire-border)">·</span>
            <label className="flex items-center gap-1.5">Mostrar
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-8 rounded-lg border border-(--zaire-border) bg-white px-2 text-sm text-(--zaire-text)">
                {PAGE_SIZES.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>Anterior</Button>
            <span className="text-xs">Página {safePage + 1} de {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>Siguiente</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null); }}
        title="Eliminar cotización"
        description={deleting ? `Vas a eliminar "${deleting.title}" (${deleting.quote_number ?? ""}).` : ""}
        confirmLabel="Sí, eliminar"
        variant="destructive"
        loading={deletingBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
