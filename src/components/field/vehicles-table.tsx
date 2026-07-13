"use client";
// vehicles-table.tsx — src/components/field/vehicles-table.tsx — 2026-07-13
// Tabla de unidades/vehículos (TanStack Table) + búsqueda + modal crear/editar.

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
import { BRANCHES } from "@/lib/constants";
import { VEHICLE_TYPE_LABELS } from "@/lib/field/constants";
import { VehicleForm } from "./vehicle-form";
import type { FieldVehicle, FieldTechnician, VehicleType } from "@/lib/field/types";

function branchName(id: string | null): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? "—";
}

interface VehiclesTableProps {
  initialVehicles: FieldVehicle[];
  technicians: FieldTechnician[];
}

export function VehiclesTable({ initialVehicles, technicians }: VehiclesTableProps) {
  const [vehicles, setVehicles] = useState<FieldVehicle[]>(initialVehicles);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FieldVehicle | null>(null);

  const techName = (id: string | null) => technicians.find((t) => t.id === id)?.full_name ?? "—";

  const columns = useMemo<ColumnDef<FieldVehicle>[]>(
    () => [
      {
        accessorKey: "plate",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Patente <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        ),
        cell: ({ getValue }) => <span className="font-mono font-medium text-(--sas-text)">{(getValue() as string) ?? "—"}</span>,
      },
      {
        id: "vehicle",
        header: "Vehículo",
        cell: ({ row }) => {
          const v = row.original;
          return <span>{[v.brand, v.model].filter(Boolean).join(" ") || "—"}{v.year ? ` (${v.year})` : ""}</span>;
        },
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ getValue }) => {
          const t = getValue() as VehicleType | null;
          return t ? VEHICLE_TYPE_LABELS[t] : "—";
        },
      },
      { accessorKey: "branch_id", header: "Sucursal", cell: ({ getValue }) => branchName(getValue() as string | null) },
      { accessorKey: "assigned_technician_id", header: "Técnico", cell: ({ getValue }) => techName(getValue() as string | null) },
      {
        accessorKey: "is_active",
        header: "Estado",
        cell: ({ getValue }) => (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getValue() ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {getValue() ? "Activo" : "Inactivo"}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [technicians]
  );

  const table = useReactTable({
    data: vehicles,
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

  function handleSaved(v: FieldVehicle) {
    setVehicles((prev) => {
      const idx = prev.findIndex((x) => x.id === v.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = v; return next; }
      return [v, ...prev];
    });
  }

  return (
    <>
      <div className="sas-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--sas-border)">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
            <Input placeholder="Buscar unidades..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Unidad
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
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron unidades</td>
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

      <VehicleForm open={formOpen} onOpenChange={setFormOpen} vehicle={editing} technicians={technicians} onSaved={handleSaved} />
    </>
  );
}
