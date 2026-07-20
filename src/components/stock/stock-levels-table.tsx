"use client";
// stock-levels-table.tsx — src/components/stock/stock-levels-table.tsx — 2026-07-18
// Existencias (producto × depósito): búsqueda, filtro por depósito, "solo bajo stock", export XLS/CSV,
// semáforo de mínimo y filas clickeables al kardex del producto.

import { useState, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { Search, Download, ArrowUpDown, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot } from "@/components/shared/status-dot";
import { ClickableRow } from "@/components/shared/clickable-row";
import { downloadCSV } from "@/lib/export";
import { formatCurrency, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { stockLight } from "@/lib/stock/constants";
import type { StockLevel, Warehouse, Currency } from "@/lib/stock/types";

interface Props {
  levels: StockLevel[];
  warehouses: Warehouse[];
}

const curOf = (l: StockLevel) => (l.product?.default_currency ?? "ARS") as Currency;

export function StockLevelsTable({ levels, warehouses }: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    let data = levels;
    if (warehouseFilter !== "all") data = data.filter((l) => l.warehouse_id === warehouseFilter);
    if (lowOnly) data = data.filter((l) => l.min_qty > 0 && l.on_hand <= l.min_qty);
    return data;
  }, [levels, warehouseFilter, lowOnly]);

  const columns = useMemo<ColumnDef<StockLevel>[]>(() => [
    {
      id: "product",
      accessorFn: (l) => `${l.product?.name ?? ""} ${l.product?.code ?? ""}`,
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Producto <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusDot status={stockLight(row.original.on_hand, row.original.min_qty)} size="sm" pulse={row.original.on_hand <= 0} />
          <div className="min-w-0">
            <p className="font-medium text-(--zaire-text) truncate">{row.original.product?.name ?? "—"}</p>
            {row.original.product?.code && <p className="text-xs text-(--zaire-text-muted) font-mono">{row.original.product.code}</p>}
          </div>
        </div>
      ),
    },
    { accessorFn: (l) => l.warehouse?.name ?? "", id: "warehouse", header: "Depósito", cell: ({ row }) => row.original.warehouse?.name ?? "—" },
    { accessorKey: "on_hand", header: "Stock", cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.on_hand} <span className="text-(--zaire-text-muted) text-xs">{row.original.product?.unit ?? ""}</span></span> },
    { accessorKey: "reserved", header: "Reservado", cell: ({ getValue }) => <span className="tabular-nums text-(--zaire-text-muted)">{getValue() as number}</span> },
    { accessorKey: "available", header: "Disponible", cell: ({ getValue }) => <span className="tabular-nums font-medium">{getValue() as number}</span> },
    { accessorKey: "avg_cost", header: "Costo (WAC)", cell: ({ row }) => <span className="tabular-nums text-(--zaire-text-muted)">{formatCurrency(row.original.avg_cost, curOf(row.original))}</span> },
    { id: "value", accessorFn: (l) => l.on_hand * l.avg_cost, header: "Valor", cell: ({ row }) => <span className="tabular-nums font-medium">{formatCurrency(row.original.on_hand * row.original.avg_cost, curOf(row.original))}</span> },
    { accessorKey: "min_qty", header: "Mín.", cell: ({ getValue }) => <span className="tabular-nums text-(--zaire-text-muted)">{getValue() as number}</span> },
  ], []);

  const table = useReactTable({
    data: filtered, columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  function exportRows() {
    return table.getFilteredRowModel().rows.map((r) => {
      const l = r.original;
      return {
        Producto: l.product?.name ?? "", Código: l.product?.code ?? "", Depósito: l.warehouse?.name ?? "",
        Stock: l.on_hand, Reservado: l.reserved, Disponible: l.available,
        "Costo WAC": l.avg_cost, Valor: l.on_hand * l.avg_cost, Moneda: curOf(l), Mínimo: l.min_qty,
      };
    });
  }
  function exportXLS() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows()), "Existencias");
    XLSX.writeFile(wb, `Zaire_Stock_Existencias_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function exportCSV() {
    downloadCSV(`Zaire_Stock_Existencias_${new Date().toISOString().slice(0, 10)}.csv`, exportRows());
  }

  return (
    <div className="zaire-card">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--zaire-border) flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar producto..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-48"><SelectValue>{warehouseFilter === "all" ? "Todos los depósitos" : warehouses.find((w) => w.id === warehouseFilter)?.name ?? "Depósito"}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los depósitos</SelectItem>
            {warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant={lowOnly ? "default" : "outline"} size="sm" onClick={() => setLowOnly((v) => !v)} className="h-9">
          <AlertTriangle className="w-4 h-4 mr-1.5" /> Bajo mínimo
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportXLS} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-9"><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border)">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {table.getRowModel().rows.map((row) => (
              <ClickableRow key={row.id} href={ROUTES.stock.producto(row.original.product_id)} className="hover:bg-subtle/80 transition-colors duration-100">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-(--zaire-text)">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </ClickableRow>
            ))}
            {!table.getRowModel().rows.length && (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-(--zaire-text-muted)">No hay existencias que coincidan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
        <span>{table.getFilteredRowModel().rows.length} líneas</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <span className="text-xs">Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
