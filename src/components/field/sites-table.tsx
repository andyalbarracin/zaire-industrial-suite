"use client";
// sites-table.tsx — src/components/field/sites-table.tsx — 2026-07-13
// Tabla de plantas/sitios (TanStack Table) + búsqueda + modal crear/editar con geocerca.

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Plus, Search, Pencil, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteForm } from "./site-form";
import type { FieldSite, Client } from "@/lib/field/types";

interface SitesTableProps {
  initialSites: FieldSite[];
  clients: Client[];
}

export function SitesTable({ initialSites, clients }: SitesTableProps) {
  const [sites, setSites] = useState<FieldSite[]>(initialSites);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FieldSite | null>(null);

  const columns = useMemo<ColumnDef<FieldSite>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Planta <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        ),
        cell: ({ row }) => <span className="font-medium text-(--sas-text)">{row.original.name}</span>,
      },
      {
        id: "client",
        header: "Cliente",
        cell: ({ row }) => row.original.client?.business_name ?? "—",
      },
      { accessorKey: "city", header: "Ciudad", cell: ({ getValue }) => (getValue() as string) ?? "—" },
      { accessorKey: "province", header: "Provincia", cell: ({ getValue }) => (getValue() as string) ?? "—" },
      {
        accessorKey: "geofence_radius_m",
        header: "Geocerca",
        cell: ({ row }) => {
          const s = row.original;
          const hasCoords = s.latitude != null && s.longitude != null;
          return hasCoords ? (
            <span className="text-xs">{s.geofence_radius_m} m</span>
          ) : (
            <span className="text-xs text-amber-600">Sin ubicación</span>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Estado",
        cell: ({ getValue }) => (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getValue() ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {getValue() ? "Activa" : "Inactiva"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => { setEditing(row.original); setFormOpen(true); }} title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: sites,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  function handleSaved(s: FieldSite) {
    setSites((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      // El update no trae el join client; preservamos el existente si aplica.
      const merged = idx >= 0 ? { ...prev[idx], ...s } : s;
      if (idx >= 0) { const next = [...prev]; next[idx] = merged; return next; }
      return [merged, ...prev];
    });
  }

  return (
    <>
      <div className="sas-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--sas-border)">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
            <Input placeholder="Buscar plantas..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Planta
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--sas-border)">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-(--sas-text-muted) uppercase tracking-wide">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-(--sas-border)">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors duration-100">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-(--sas-text)">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {!table.getRowModel().rows.length && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron plantas</td>
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

      <SiteForm open={formOpen} onOpenChange={setFormOpen} site={editing} clients={clients} onSaved={handleSaved} />
    </>
  );
}
