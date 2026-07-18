"use client";
// orders-table.tsx — src/components/trace/orders-table.tsx — 2026-05-27
// Tabla principal de OTs con TanStack Table v8, filtros múltiples, export XLS/CSV

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Search, FileText, Download, X, List, Columns3 } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatusBadge, OrderTypeBadge } from "./order-status-badge";
import { OrdersKanban } from "./orders-kanban";
import { StatusDot } from "@/components/shared/status-dot";
import { ROUTES } from "@/lib/routes";
import { ORDER_STATUS_LABELS } from "@/lib/trace/constants";
import { BRANCHES } from "@/lib/constants";
import { formatDate, formatCurrency, cn, calculateTrafficLight } from "@/lib/utils";
import type { OrderStatus, OrderType, Currency } from "@/lib/types/database";

interface ItemSummary {
  is_quoted: boolean;
  is_remitted: boolean;
  is_delivered: boolean;
  is_invoiced: boolean;
  status: string;
  serial_number: string | null;
  equipment_number: string | null;
  custom_description: string | null;
  modelo: string | null;
  orden_compra_item: string | null;
  origen_abastecimiento: string | null;
  total_price_ars: number;
  marca: string | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  additional_observation: string | null;
  products: { name: string } | null;
}

export interface OrderRow {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  date_in: string;
  date_due: string | null;
  currency: string;
  total: number;
  branch_id: string | null;
  general_notes: string | null;
  remito_salida: string | null;
  orden_compra: string | null;
  clients: { id: string; business_name: string; client_code: string | null } | null;
  work_order_items: ItemSummary[];
}

interface OrdersTableProps {
  initialOrders: OrderRow[];
  clients: { id: string; business_name: string }[];
  initialSearch?: string;
  currentProfile: { id: string; full_name: string } | null;
}

// Custom global filter — universal search across all order, client, and item fields
const globalFilterFn: FilterFn<OrderRow> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  const search = filterValue.toLowerCase();
  const r = row.original;

  // Order-level fields
  if (r.order_number.toLowerCase().includes(search)) return true;
  if (r.general_notes?.toLowerCase().includes(search)) return true;
  if (r.remito_salida?.toLowerCase().includes(search)) return true;
  if (r.orden_compra?.toLowerCase().includes(search)) return true;
  if (ORDER_STATUS_LABELS[r.status as OrderStatus]?.toLowerCase().includes(search)) return true;

  // Client fields
  if (r.clients?.business_name.toLowerCase().includes(search)) return true;
  if (r.clients?.client_code?.toLowerCase().includes(search)) return true;

  // Item fields
  return (r.work_order_items ?? []).some(
    (item) =>
      item.serial_number?.toLowerCase().includes(search) ||
      item.equipment_number?.toLowerCase().includes(search) ||
      item.custom_description?.toLowerCase().includes(search) ||
      item.modelo?.toLowerCase().includes(search) ||
      item.orden_compra_item?.toLowerCase().includes(search) ||
      item.origen_abastecimiento?.toLowerCase().includes(search) ||
      item.marca?.toLowerCase().includes(search) ||
      item.materiales_caras?.toLowerCase().includes(search) ||
      item.materiales_orings?.toLowerCase().includes(search) ||
      item.additional_observation?.toLowerCase().includes(search) ||
      item.products?.name?.toLowerCase().includes(search)
  );
};

export function OrdersTable({ initialOrders, clients, initialSearch = "", currentProfile }: OrdersTableProps) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState(initialSearch);
  const [view, setView] = useState<"list" | "board">("list");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    return initialOrders.filter((o) => {
      if (typeFilter !== "all" && o.order_type !== typeFilter) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(o.status)) return false;
      if (clientFilter !== "all" && o.clients?.id !== clientFilter) return false;
      if (branchFilter !== "all" && o.branch_id !== branchFilter) return false;
      const dateIn = o.date_in.slice(0, 10);
      if (dateFrom && dateIn < dateFrom) return false;
      if (dateTo && dateIn > dateTo) return false;
      return true;
    });
  }, [initialOrders, typeFilter, statusFilter, clientFilter, branchFilter, dateFrom, dateTo]);

  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "order_number",
        header: "Nro Orden",
        cell: ({ row }) => (
          <Link
            href={ROUTES.trace.orden(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "font-mono text-sm font-semibold hover:underline",
              row.original.order_type === "OT" ? "text-blue-700 dark:text-blue-300" : "text-orange-700 dark:text-orange-300"
            )}
          >
            {row.original.order_number}
          </Link>
        ),
      },
      {
        id: "branch",
        header: "Suc.",
        accessorFn: (row) => row.branch_id ?? "",
        cell: ({ row }) => {
          const b = BRANCHES.find((x) => x.id === row.original.branch_id);
          return b ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-subtle-2 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {b.code}
            </span>
          ) : <span className="text-(--zaire-text-muted) text-xs">—</span>;
        },
      },
      {
        id: "client",
        header: "Cliente",
        accessorFn: (row) => row.clients?.business_name ?? "",
        cell: ({ row }) => (
          <span className="text-sm text-(--zaire-text) truncate max-w-45 block">
            {row.original.clients?.business_name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "order_type",
        header: "Tipo",
        cell: ({ getValue }) => <OrderTypeBadge type={getValue() as OrderType} />,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ getValue }) => <OrderStatusBadge status={getValue() as OrderStatus} />,
      },
      {
        accessorKey: "date_in",
        header: "Ingreso",
        cell: ({ getValue }) => (
          <span className="text-sm text-(--zaire-text-muted)">{formatDate(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: "date_due",
        header: "Vencimiento",
        cell: ({ getValue }) => {
          const d = getValue() as string | null;
          return <span className="text-sm text-(--zaire-text-muted)">{formatDate(d)}</span>;
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => {
          const totalArs = (row.original.work_order_items ?? []).reduce((s, i) => s + (i.total_price_ars ?? 0), 0);
          return (
            <div>
              <span className="text-sm font-medium">
                {formatCurrency(row.original.total, row.original.currency as Currency)}
              </span>
              {totalArs > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-0.5">{formatCurrency(totalArs, "ARS")}</p>
              )}
            </div>
          );
        },
      },
      {
        id: "semaforo_remitido",
        header: "Remitido",
        meta: { center: true },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusDot
              status={calculateTrafficLight(row.original.work_order_items ?? [], "is_remitted")}
              size="sm"
            />
          </div>
        ),
      },
      {
        id: "semaforo_entregado",
        header: "Entregado",
        meta: { center: true },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusDot
              status={calculateTrafficLight(row.original.work_order_items ?? [], "is_delivered")}
              size="sm"
            />
          </div>
        ),
      },
      {
        id: "semaforo_facturado",
        header: "Facturado",
        meta: { center: true },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusDot
              status={calculateTrafficLight(row.original.work_order_items ?? [], "is_invoiced")}
              size="sm"
            />
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

  function exportExcel() {
    const rows = table.getFilteredRowModel().rows.map((r) => {
      const totalArs = (r.original.work_order_items ?? []).reduce((s, i) => s + (i.total_price_ars ?? 0), 0);
      return {
        "Nro Orden": r.original.order_number,
        "Sucursal": BRANCHES.find((b) => b.id === r.original.branch_id)?.name ?? r.original.branch_id ?? "",
        "Tipo": r.original.order_type,
        "Cliente": r.original.clients?.business_name ?? "",
        "Estado": ORDER_STATUS_LABELS[r.original.status as OrderStatus],
        "Fecha Ingreso": formatDate(r.original.date_in),
        "Vencimiento": formatDate(r.original.date_due),
        "Moneda": r.original.currency,
        "Total USD": r.original.total,
        "Total ARS": totalArs,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Órdenes");
    XLSX.writeFile(wb, `Zaire_Trace_Ordenes_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  function exportCSV() {
    const rows = table.getFilteredRowModel().rows.map((r) => {
      const totalArs = (r.original.work_order_items ?? []).reduce((s, i) => s + (i.total_price_ars ?? 0), 0);
      return [
        r.original.order_number,
        BRANCHES.find((b) => b.id === r.original.branch_id)?.name ?? r.original.branch_id ?? "",
        r.original.order_type,
        r.original.clients?.business_name ?? "",
        ORDER_STATUS_LABELS[r.original.status as OrderStatus],
        formatDate(r.original.date_in),
        formatDate(r.original.date_due),
        r.original.currency,
        r.original.total.toString(),
        totalArs.toString(),
      ];
    });
    const header = ["Nro Orden", "Sucursal", "Tipo", "Cliente", "Estado", "Fecha Ingreso", "Vencimiento", "Moneda", "Total USD", "Total ARS"];
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Zaire_Trace_Ordenes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allStatuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

  return (
    <div className="zaire-card">
      {/* Toolbar */}
      <div className="p-4 border-b border-(--zaire-border) space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input
              placeholder="Buscar orden, cliente, serie, equipo/TAG, remito, OC, modelo..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger className="h-9 w-32"><SelectValue>{typeFilter === "all" ? "Todos" : typeFilter}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="OT">OT</SelectItem>
              <SelectItem value="OTS">OTS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "all")}>
            <SelectTrigger className="h-9 w-40"><SelectValue>{branchFilter === "all" ? "Todas las sucursales" : BRANCHES.find(b => b.id === branchFilter)?.name ?? branchFilter}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {BRANCHES.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? "all")}>
            <SelectTrigger className="h-9 w-48"><SelectValue>{clientFilter === "all" ? "Todos los clientes" : clients.find(c => c.id === clientFilter)?.business_name ?? clientFilter}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-(--zaire-text-muted) whitespace-nowrap">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-(--zaire-text-muted) whitespace-nowrap">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-background text-(--zaire-text-muted) hover:text-(--zaire-text) transition-colors"
                title="Limpiar rango de fechas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-md border border-(--zaire-border) p-0.5 bg-panel">
              <button type="button" onClick={() => setView("list")} title="Vista lista"
                className={cn("flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium transition-colors", view === "list" ? "bg-zaire-navy text-white" : "text-(--zaire-text-muted) hover:text-(--zaire-text)")}>
                <List className="w-3.5 h-3.5" /> Lista
              </button>
              <button type="button" onClick={() => setView("board")} title="Vista tablero (Kanban)"
                className={cn("flex items-center gap-1.5 h-8 px-2.5 rounded text-xs font-medium transition-colors", view === "board" ? "bg-zaire-navy text-white" : "text-(--zaire-text-muted) hover:text-(--zaire-text)")}>
                <Columns3 className="w-3.5 h-3.5" /> Tablero
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-9 gap-1.5">
              <Download className="w-3.5 h-3.5" /> XLS
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5">
              <FileText className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button asChild className="h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              <Link href={ROUTES.trace.ordenNueva}>
                <Plus className="w-4 h-4 mr-1.5" /> Nueva Orden
              </Link>
            </Button>
          </div>
        </div>
        {/* Estado multiselect */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-(--zaire-text-muted) mr-0.5">Estado:</span>
          <button
            type="button"
            onClick={() => setStatusFilter([])}
            className={cn("text-xs px-3 py-1 rounded-full border font-medium transition-colors duration-140", statusFilter.length === 0 ? "bg-zaire-navy text-white border-zaire-navy" : "bg-panel text-(--zaire-text-muted) border-(--zaire-border) hover:border-zaire-navy-mid hover:text-(--zaire-text)")}
          >
            Todos
          </button>
          {allStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
              className={cn("text-xs px-3 py-1 rounded-full border font-medium transition-colors duration-140", statusFilter.includes(s) ? "bg-zaire-navy-mid text-white border-zaire-navy-mid" : "bg-panel text-(--zaire-text-muted) border-(--zaire-border) hover:border-zaire-navy-mid hover:text-(--zaire-text)")}
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {view === "board" ? (
        <OrdersKanban orders={table.getFilteredRowModel().rows.map((r) => r.original)} currentProfile={currentProfile} />
      ) : (
      <>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border)">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const isCentered = (header.column.columnDef.meta as { center?: boolean } | undefined)?.center;
                  return (
                    <th key={header.id} className={cn("px-4 py-3 text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide whitespace-nowrap", isCentered ? "text-center" : "text-left")}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(ROUTES.trace.orden(row.original.id))}
                className={cn(
                  "cursor-pointer hover:bg-blue-50 dark:bg-blue-500/15/50 transition-colors duration-100",
                  row.original.status === "cancelada" && "opacity-50",
                  row.original.order_type === "OTS" ? "border-l-2 border-l-orange-200" : "border-l-2 border-l-blue-200"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!table.getRowModel().rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-(--zaire-text-muted)">
                  No se encontraron órdenes
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
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <span className="text-xs">Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
