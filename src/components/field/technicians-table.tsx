"use client";
// technicians-table.tsx — src/components/field/technicians-table.tsx — 2026-07-13
// Tabla de técnicos: filtros en pills, paginación + selector, fila clickeable (→ ficha), export.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Pencil, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRANCHES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FieldTechnician } from "@/lib/field/types";

const PAGE_SIZES = [10, 20, 50, 100];

function branchName(id: string | null): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? "—";
}

interface TechniciansTableProps {
  initialTechnicians: FieldTechnician[];
}

export function TechniciansTable({ initialTechnicians }: TechniciansTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return initialTechnicians.filter((t) => {
      if (branchFilter.length && !branchFilter.includes(t.branch_id ?? "")) return false;
      if (activeFilter === "activos" && !t.is_active) return false;
      if (activeFilter === "inactivos" && t.is_active) return false;
      if (s) {
        const hay = `${t.full_name} ${t.document_id ?? ""} ${t.license_number ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [initialTechnicians, search, branchFilter, activeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleBranch(id: string) {
    setPage(0);
    setBranchFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function exportExcel() {
    const rows = filtered.map((t) => ({
      Nombre: t.full_name, DNI: t.document_id ?? "", Sucursal: branchName(t.branch_id),
      Licencia: t.license_number ?? "", Teléfono: t.phone ?? "", Email: t.email ?? "",
      Estado: t.is_active ? "Activo" : "Inactivo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Técnicos");
    XLSX.writeFile(wb, `Zaire_Field_Tecnicos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const pill = (active: boolean, extra = "") =>
    cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
      active ? "bg-sas-navy text-white border-sas-navy" : "bg-white text-(--sas-text-muted) border-(--sas-border) hover:bg-slate-50", extra);

  return (
    <div className="sas-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--sas-border)">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
          <Input placeholder="Buscar técnicos..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          <Button asChild className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9">
            <Link href="/field/tecnicos/nuevo"><Plus className="w-4 h-4 mr-1.5" /> Nuevo Técnico</Link>
          </Button>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-(--sas-border) flex flex-wrap items-center gap-1.5">
        {BRANCHES.map((b) => (<button key={b.id} onClick={() => toggleBranch(b.id)} className={pill(branchFilter.includes(b.id))}>{b.code}</button>))}
        <span className="w-px h-4 bg-(--sas-border) mx-1" />
        <button onClick={() => { setActiveFilter(activeFilter === "activos" ? "" : "activos"); setPage(0); }} className={pill(activeFilter === "activos", "border-green-200")}>Activos</button>
        <button onClick={() => { setActiveFilter(activeFilter === "inactivos" ? "" : "inactivos"); setPage(0); }} className={pill(activeFilter === "inactivos", "border-red-200")}>Inactivos</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-(--sas-border) text-xs text-(--sas-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">DNI</th>
              <th className="text-left px-4 py-3">Sucursal</th>
              <th className="text-left px-4 py-3">Licencia</th>
              <th className="text-left px-4 py-3">Teléfono</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--sas-border)">
            {pageRows.map((t) => (
              <tr key={t.id} onClick={() => router.push(`/field/tecnicos/${t.id}`)} className="hover:bg-slate-50/80 cursor-pointer">
                <td className="px-4 py-3 font-medium text-(--sas-text)">{t.full_name}</td>
                <td className="px-4 py-3">{t.document_id ?? "—"}</td>
                <td className="px-4 py-3">{branchName(t.branch_id)}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.license_number ?? "—"}</td>
                <td className="px-4 py-3">{t.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", t.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                    {t.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                  <Button variant="ghost" size="sm" asChild title="Editar"><Link href={`/field/tecnicos/${t.id}/editar`}><Pencil className="w-3.5 h-3.5" /></Link></Button>
                </td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron técnicos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--sas-border) text-sm text-(--sas-text-muted)">
        <div className="flex items-center gap-2">
          <span>{filtered.length} registros</span>
          <span className="text-(--sas-border)">·</span>
          <label className="flex items-center gap-1.5">Mostrar
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-8 rounded-lg border border-(--sas-border) bg-white px-2 text-sm text-(--sas-text)">
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
