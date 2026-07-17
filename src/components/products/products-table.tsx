"use client";
// products-table.tsx — src/components/products/products-table.tsx — 2026-05-19
// Tabla de productos con TanStack Table, filtro por categoría y búsqueda

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductForm } from "./product-form";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory, Currency } from "@/lib/types/database";

interface ProductsTableProps {
  initialProducts: Product[];
}

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    let data = products;
    if (categoryFilter !== "all") {
      data = data.filter((p) => p.category === categoryFilter);
    }
    return data;
  }, [products, categoryFilter]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            {(getValue() as string) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button className="flex items-center gap-1 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Nombre <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-(--zaire-text)">{row.original.name}</p>
            {row.original.brand && (
              <p className="text-xs text-(--zaire-text-muted)">{row.original.brand}{row.original.model ? ` · ${row.original.model}` : ""}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Categoría",
        cell: ({ getValue }) => {
          const cat = getValue() as ProductCategory | null;
          if (!cat) return "—";
          return (
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", PRODUCT_CATEGORY_COLORS[cat])}>
              {PRODUCT_CATEGORY_LABELS[cat]}
            </span>
          );
        },
      },
      {
        accessorKey: "unit",
        header: "Unidad",
        cell: ({ getValue }) => (getValue() as string) ?? "unidad",
      },
      {
        accessorKey: "default_unit_price",
        header: "Precio Base",
        cell: ({ row }) => {
          const price = row.original.default_unit_price;
          return price != null
            ? formatCurrency(price, row.original.default_currency as Currency)
            : "—";
        },
      },
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingProduct(row.original); setFormOpen(true); }}
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  function handleSaved(product: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
  }

  return (
    <>
      <div className="zaire-card">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-(--zaire-border) flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input placeholder="Buscar productos..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue>{categoryFilter === "all" ? "Todas las categorías" : PRODUCT_CATEGORY_LABELS[categoryFilter as ProductCategory] ?? categoryFilter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.entries(PRODUCT_CATEGORY_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setEditingProduct(null); setFormOpen(true); }}
            className="ml-auto bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Producto
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--zaire-border)">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide">
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
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
          <span>{table.getFilteredRowModel().rows.length} registros</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
            <span className="text-xs">Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}</span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
          </div>
        </div>
      </div>

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={handleSaved}
      />
    </>
  );
}
