"use client";
// assets-table.tsx — src/components/assets/assets-table.tsx — 2026-07-20
// Equipos: búsqueda, filtros (tipo/estado/en riesgo), ABM (AssetForm) y filas clickeables a la ficha.

import { useState, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { Search, Plus, ArrowUpDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot } from "@/components/shared/status-dot";
import { ClickableRow } from "@/components/shared/clickable-row";
import { AssetForm } from "@/components/assets/asset-form";
import { ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_BADGE, CRITICIDAD_LABELS } from "@/lib/assets/constants";
import { healthLight } from "@/lib/assets/health";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Asset, AssetType, AssetStatus, Client } from "@/lib/assets/types";

interface Props {
  initialAssets: Asset[];
  clients: Client[];
  sites: { id: string; name: string }[];
}

export function AssetsTable({ initialAssets, clients, sites }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const filtered = useMemo(() => {
    let data = assets;
    if (typeFilter !== "all") data = data.filter((a) => a.type === typeFilter);
    if (statusFilter !== "all") data = data.filter((a) => a.status === statusFilter);
    if (riskOnly) data = data.filter((a) => (a.health ?? 100) < 60);
    return data;
  }, [assets, typeFilter, statusFilter, riskOnly]);

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      id: "asset",
      accessorFn: (a) => `${a.name} ${a.tag ?? ""} ${a.serial ?? ""}`,
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Equipo <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusDot status={healthLight(row.original.health ?? 100)} size="sm" pulse={(row.original.health ?? 100) < 40} />
          <div className="min-w-0">
            <p className="font-medium text-(--zaire-text) truncate">{row.original.name}</p>
            {row.original.tag && <p className="text-xs text-(--zaire-text-muted) font-mono">{row.original.tag}</p>}
          </div>
        </div>
      ),
    },
    { accessorKey: "type", header: "Tipo", cell: ({ getValue }) => { const t = getValue() as AssetType | null; return t ? ASSET_TYPE_LABELS[t] : "—"; } },
    { id: "client", accessorFn: (a) => a.client?.business_name ?? "", header: "Cliente", cell: ({ row }) => <span className="text-(--zaire-text-muted) truncate max-w-40 inline-block">{row.original.client?.business_name ?? "—"}</span> },
    { accessorKey: "criticidad", header: "Criticidad", cell: ({ getValue }) => { const c = getValue() as number; return <span className={cn("text-xs", c >= 4 && "text-red-600 dark:text-red-300 font-medium")}>{CRITICIDAD_LABELS[c] ?? c}</span>; } },
    { accessorKey: "status", header: "Estado", cell: ({ getValue }) => { const s = getValue() as AssetStatus; return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ASSET_STATUS_BADGE[s])}>{ASSET_STATUS_LABELS[s]}</span>; } },
    { accessorKey: "health", header: "Salud", cell: ({ getValue }) => <span className="tabular-nums font-medium">{getValue() as number}</span> },
    {
      id: "edit", header: "",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(row.original); setFormOpen(true); }}
          className="text-xs text-zaire-blue hover:underline"
        >Editar</button>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered, columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  function handleSaved(a: Asset) {
    setAssets((prev) => { const i = prev.findIndex((x) => x.id === a.id); if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], ...a }; return n; } return [a, ...prev]; });
  }

  return (
    <div className="zaire-card">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--zaire-border) flex-wrap">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar equipo..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-36"><SelectValue>{typeFilter === "all" ? "Todos los tipos" : ASSET_TYPE_LABELS[typeFilter as AssetType]}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-40"><SelectValue>{statusFilter === "all" ? "Todos los estados" : ASSET_STATUS_LABELS[statusFilter as AssetStatus]}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los estados</SelectItem>{Object.entries(ASSET_STATUS_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
        </Select>
        <Button variant={riskOnly ? "default" : "outline"} size="sm" onClick={() => setRiskOnly((v) => !v)} className="h-9"><ShieldAlert className="w-4 h-4 mr-1.5" /> En riesgo</Button>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="ml-auto h-9"><Plus className="w-4 h-4 mr-1.5" /> Nuevo equipo</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border)">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>{hg.headers.map((h) => (<th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr>
            ))}
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {table.getRowModel().rows.map((row) => (
              <ClickableRow key={row.id} href={ROUTES.assets.equipo(row.original.id)} className="hover:bg-subtle/80 transition-colors duration-100">
                {row.getVisibleCells().map((cell) => (<td key={cell.id} className="px-4 py-3 text-(--zaire-text)">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>))}
              </ClickableRow>
            ))}
            {!table.getRowModel().rows.length && (<tr><td colSpan={columns.length} className="px-4 py-12 text-center text-(--zaire-text-muted)">No hay equipos que coincidan</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
        <span>{table.getFilteredRowModel().rows.length} equipos</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <span className="text-xs">Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>

      <AssetForm open={formOpen} onOpenChange={setFormOpen} asset={editing} clients={clients} sites={sites} onSaved={handleSaved} />
    </div>
  );
}
