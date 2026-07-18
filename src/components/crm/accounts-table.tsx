"use client";
// accounts-table.tsx — src/components/crm/accounts-table.tsx — 2026-07-17
// Cuentas B2B = clientes (master data) con rollups comerciales del CRM. Solo lectura +
// navegación a la ficha (las cuentas se crean como clientes en Administración / al convertir un lead).

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CrmAccount } from "@/lib/crm/types";

const PAGE_SIZES = [10, 20, 50, 100];

function scoreClass(s: number) {
  return s >= 66
    ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30"
    : s >= 33
      ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
      : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30";
}

export function AccountsTable({ initialAccounts }: { initialAccounts: CrmAccount[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return initialAccounts;
    return initialAccounts.filter((a) => `${a.client.business_name} ${a.client.tax_id ?? ""}`.toLowerCase().includes(s));
  }, [initialAccounts, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function exportExcel() {
    const rows = filtered.map((a) => ({
      Cuenta: a.client.business_name, CUIT: a.client.tax_id ?? "", Score: a.score, Contactos: a.contactsCount,
      Oportunidades_abiertas: a.openOpportunities, Pipeline_ARS: a.pipelineArs, Pipeline_USD: a.pipelineUsd,
      Ultima_actividad: a.lastActivityAt ? formatDate(a.lastActivityAt) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cuentas");
    XLSX.writeFile(wb, `Zaire_CRM_Cuentas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="zaire-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar cuentas..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Cuenta</th>
              <th className="text-center px-4 py-3">Score</th>
              <th className="text-right px-4 py-3">Contactos</th>
              <th className="text-right px-4 py-3">Oport. abiertas</th>
              <th className="text-right px-4 py-3">En pipeline</th>
              <th className="text-left px-4 py-3">Última actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {pageRows.map((a) => (
              <tr key={a.client.id} onClick={() => router.push(ROUTES.crm.cuenta(a.client.id))} className="hover:bg-subtle/80 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-medium text-(--zaire-text)">{a.client.business_name}</div>
                  {a.client.tax_id && <div className="text-xs text-(--zaire-text-muted) font-mono">{a.client.tax_id}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center min-w-9 px-2 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${scoreClass(a.score)}`}>{a.score}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{a.contactsCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{a.openOpportunities}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {a.pipelineArs > 0 ? formatCurrency(a.pipelineArs, "ARS") : ""}
                  {a.pipelineArs > 0 && a.pipelineUsd > 0 ? " · " : ""}
                  {a.pipelineUsd > 0 ? formatCurrency(a.pipelineUsd, "USD") : ""}
                  {a.pipelineArs === 0 && a.pipelineUsd === 0 ? "—" : ""}
                </td>
                <td className="px-4 py-3 text-(--zaire-text-muted)">{a.lastActivityAt ? formatDate(a.lastActivityAt) : "—"}</td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-(--zaire-text-muted)">No se encontraron cuentas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
        <div className="flex items-center gap-2">
          <span>{filtered.length} cuentas</span>
          <span className="text-(--zaire-border)">·</span>
          <label className="flex items-center gap-1.5">Mostrar
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-8 rounded-lg border border-(--zaire-border) bg-panel px-2 text-sm text-(--zaire-text)">
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
  );
}
