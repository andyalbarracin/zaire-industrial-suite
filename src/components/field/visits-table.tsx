"use client";
// visits-table.tsx — src/components/field/visits-table.tsx — 2026-07-13
// Lista de visitas (TanStack Table) + filtros (búsqueda, estado, sucursal) + export Excel.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type FilterFn,
} from "@tanstack/react-table";
import { Plus, Search, Pencil, Eye, ArrowUpDown, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/shared/status-dot";
import { cn, formatDateTime } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import {
  VISIT_STATUSES,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
  VISIT_PURPOSE_LABELS,
} from "@/lib/field/constants";
import type { FieldVisit, VisitStatus, VisitPurpose } from "@/lib/field/types";

function branchName(id: string | null): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? id ?? "—";
}

const globalFilterFn: FilterFn<FieldVisit> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  const s = filterValue.toLowerCase();
  const r = row.original;
  return (
    (r.visit_number ?? "").toLowerCase().includes(s) ||
    (r.technician?.full_name ?? "").toLowerCase().includes(s) ||
    (r.client?.business_name ?? "").toLowerCase().includes(s) ||
    (r.site?.name ?? "").toLowerCase().includes(s)
  );
};

interface VisitsTableProps {
  initialVisits: FieldVisit[];
}

export function VisitsTable({ initialVisits }: VisitsTableProps) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("");

  const filtered = useMemo(() => {
    return initialVisits.filter((v) => {
      if (statusFilter.length && !statusFilter.includes(v.status)) return false;
      if (branchFilter && v.branch_id !== branchFilter) return false;
      return true;
    });
  }, [initialVisits, statusFilter, branchFilter]);

  const columns = useMemo<ColumnDef<FieldVisit>[]>(
    () => [
      {
        accessorKey: "visit_number",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            N° Visita <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs font-medium text-(--sas-text)">{row.original.visit_number ?? "—"}</span>,
      },
      {
        accessorKey: "scheduled_at",
        header: "Agendada",
        cell: ({ getValue }) => <span className="text-sm">{formatDateTime(getValue() as string | null)}</span>,
      },
      { id: "technician", header: "Técnico", cell: ({ row }) => row.original.technician?.full_name ?? "—" },
      { id: "client", header: "Cliente", cell: ({ row }) => row.original.client?.business_name ?? "—" },
      { id: "site", header: "Sitio", cell: ({ row }) => row.original.site?.name ?? "—" },
      {
        accessorKey: "branch_id",
        header: "Sucursal",
        cell: ({ getValue }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {branchName(getValue() as string | null)}
          </span>
        ),
      },
      {
        accessorKey: "purpose",
        header: "Propósito",
        cell: ({ getValue }) => {
          const p = getValue() as VisitPurpose | null;
          return p ? VISIT_PURPOSE_LABELS[p] : "—";
        },
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ getValue }) => {
          const st = getValue() as VisitStatus;
          return (
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", VISIT_STATUS_COLORS[st])}>
              {VISIT_STATUS_LABELS[st]}
            </span>
          );
        },
      },
      {
        accessorKey: "is_billable",
        header: "Facturable",
        cell: ({ getValue }) => (
          <StatusDot status={getValue() ? "green" : "red"} size="sm" />
        ),
        meta: { center: true },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild title="Ver detalle">
              <Link href={`/field/visitas/${row.original.id}`}><Eye className="w-3.5 h-3.5" /></Link>
            </Button>
            <Button variant="ghost" size="sm" asChild title="Editar">
              <Link href={`/field/visitas/${row.original.id}/editar`}><Pencil className="w-3.5 h-3.5" /></Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  function toggleStatus(value: string) {
    setStatusFilter((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]));
  }

  function exportExcel() {
    const rows = table.getFilteredRowModel().rows.map((r) => {
      const v = r.original;
      return {
        "N° Visita": v.visit_number ?? "",
        Agendada: formatDateTime(v.scheduled_at),
        Técnico: v.technician?.full_name ?? "",
        Cliente: v.client?.business_name ?? "",
        Sitio: v.site?.name ?? "",
        Sucursal: branchName(v.branch_id),
        Propósito: v.purpose ? VISIT_PURPOSE_LABELS[v.purpose] : "",
        Estado: VISIT_STATUS_LABELS[v.status],
        Facturable: v.is_billable ? "Sí" : "No",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visitas");
    XLSX.writeFile(wb, `Zaire_Field_Visitas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="sas-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--sas-border)">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
            <Input placeholder="Buscar visitas..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9 h-9" />
          </div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-lg border border-(--sas-border) bg-white px-2 text-sm text-(--sas-text)"
          >
            <option value="">Todas las sucursales</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-9">
            <Download className="w-4 h-4 mr-1.5" /> Excel
          </Button>
          <Button asChild className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9">
            <Link href="/field/visitas/nueva"><Plus className="w-4 h-4 mr-1.5" /> Nueva Visita</Link>
          </Button>
        </div>
      </div>

      {/* Chips de estado */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-(--sas-border)">
        {VISIT_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => toggleStatus(s.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              statusFilter.includes(s.value)
                ? VISIT_STATUS_COLORS[s.value]
                : "bg-white text-(--sas-text-muted) border-(--sas-border) hover:bg-slate-50"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-(--sas-border)">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const center = (header.column.columnDef.meta as { center?: boolean })?.center;
                  return (
                    <th key={header.id} className={cn("px-4 py-3 text-xs font-medium text-(--sas-text-muted) uppercase tracking-wide", center ? "text-center" : "text-left")}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-(--sas-border)">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/field/visitas/${row.original.id}`)}
                className={cn(
                  "hover:bg-slate-50/80 transition-colors duration-100 cursor-pointer",
                  row.original.status === "cancelada" && "opacity-55"
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const center = (cell.column.columnDef.meta as { center?: boolean })?.center;
                  return (
                    <td key={cell.id} className={cn("px-4 py-3 text-(--sas-text)", center && "text-center")} onClick={(e) => { if (cell.column.id === "actions") e.stopPropagation(); }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!table.getRowModel().rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron visitas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-(--sas-border) text-sm text-(--sas-text-muted)">
        <span>{table.getFilteredRowModel().rows.length} registros</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <span className="text-xs">Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
