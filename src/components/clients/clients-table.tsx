"use client";
// clients-table.tsx — src/components/clients/clients-table.tsx — 2026-05-27
// Tabla de clientes con TanStack Table, búsqueda, modal crear/editar

import { useState, useMemo } from "react";
import { ROUTES } from "@/lib/routes";
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
import { Plus, Search, Pencil, Eye, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientForm } from "./client-form";
import type { Client } from "@/lib/types/database";

interface ClientsTableProps {
  initialClients: Client[];
}

export function ClientsTable({ initialClients }: ClientsTableProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const columns = useMemo<ColumnDef<Client>[]>(
    () => [
      {
        accessorKey: "client_code",
        header: "Código",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-(--zaire-text-muted)">{(getValue() as string) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "business_name",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Razón Social <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-(--zaire-text)">
            {row.original.business_name}
          </span>
        ),
      },
      {
        accessorKey: "tax_id",
        header: "CUIT",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{(getValue() as string) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "contact_name",
        header: "Contacto",
        cell: ({ getValue }) => (getValue() as string) ?? "—",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => {
          const email = getValue() as string | null;
          return email ? (
            <a href={`mailto:${email}`} className="text-zaire-blue hover:underline text-sm">
              {email}
            </a>
          ) : "—";
        },
      },
      {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ getValue }) => (getValue() as string) ?? "—",
      },
      {
        accessorKey: "city",
        header: "Ciudad",
        cell: ({ getValue }) => (getValue() as string) ?? "—",
      },
      {
        accessorKey: "is_active",
        header: "Estado",
        cell: ({ getValue }) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              getValue()
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {getValue() ? "Activo" : "Inactivo"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingClient(row.original);
                setFormOpen(true);
              }}
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" asChild title="Ver detalle">
              <Link href={ROUTES.cliente(row.original.id)}>
                <Eye className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: clients,
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

  function handleSaved(client: Client) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === client.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = client;
        return next;
      }
      return [client, ...prev];
    });
  }

  return (
    <>
      <div className="zaire-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--zaire-border)">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input
              placeholder="Buscar clientes..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            onClick={() => {
              setEditingClient(null);
              setFormOpen(true);
            }}
            className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--zaire-border)">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors duration-100">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-(--zaire-text)">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {!table.getRowModel().rows.length && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-(--zaire-text-muted)">
                    No se encontraron clientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
          <span>{table.getFilteredRowModel().rows.length} registros</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <span className="text-xs">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        onSaved={handleSaved}
      />
    </>
  );
}
