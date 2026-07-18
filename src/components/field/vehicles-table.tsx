"use client";
// vehicles-table.tsx — src/components/field/vehicles-table.tsx — 2026-07-13
// Tabla de unidades: filtros en pills, paginación + selector, fila clickeable (→ ficha), export.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRANCHES } from "@/lib/constants";
import { VEHICLE_TYPES, VEHICLE_TYPE_LABELS } from "@/lib/field/constants";
import { VehicleForm } from "./vehicle-form";
import { FilterBar } from "@/components/field/filter-bar";
import { cn } from "@/lib/utils";
import type { FieldVehicle, FieldTechnician, VehicleType } from "@/lib/field/types";

const PAGE_SIZES = [10, 20, 50, 100];

function branchName(id: string | null): string {
  return BRANCHES.find((b) => b.id === id)?.name ?? "—";
}

interface VehiclesTableProps {
  initialVehicles: FieldVehicle[];
  technicians: FieldTechnician[];
}

export function VehiclesTable({ initialVehicles, technicians }: VehiclesTableProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<FieldVehicle[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(""); // "" | "activas" | "inactivas"
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FieldVehicle | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const techName = (id: string | null) => technicians.find((t) => t.id === id)?.full_name ?? "—";

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return vehicles.filter((v) => {
      if (typeFilter.length && !typeFilter.includes(v.type ?? "")) return false;
      if (branchFilter.length && !branchFilter.includes(v.branch_id ?? "")) return false;
      if (activeFilter === "activas" && !v.is_active) return false;
      if (activeFilter === "inactivas" && v.is_active) return false;
      if (s) {
        const hay = `${v.plate ?? ""} ${v.brand ?? ""} ${v.model ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [vehicles, search, typeFilter, branchFilter, activeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setPage(0);
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function handleSaved(v: FieldVehicle) {
    setVehicles((prev) => {
      const idx = prev.findIndex((x) => x.id === v.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...v }; return next; }
      return [v, ...prev];
    });
  }

  function exportExcel() {
    const rows = filtered.map((v) => ({
      Patente: v.plate ?? "", Marca: v.brand ?? "", Modelo: v.model ?? "", Año: v.year ?? "",
      Tipo: v.type ? VEHICLE_TYPE_LABELS[v.type as VehicleType] : "", Sucursal: branchName(v.branch_id),
      Técnico: techName(v.assigned_technician_id), Estado: v.is_active ? "Activa" : "Inactiva",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unidades");
    XLSX.writeFile(wb, `Zaire_Field_Unidades_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="zaire-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar unidades..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Unidad
          </Button>
        </div>
      </div>

      {/* Filtros unificados */}
      <FilterBar
        groups={[
          { key: "tipo", label: "Tipo", options: VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label })), selected: typeFilter, onToggle: (v) => toggle(typeFilter, setTypeFilter, v) },
          { key: "sucursal", label: "Sucursal", options: BRANCHES.map((b) => ({ value: b.id, label: b.code })), selected: branchFilter, onToggle: (v) => toggle(branchFilter, setBranchFilter, v) },
          { key: "estado", label: "Estado", options: [{ value: "activas", label: "Activas" }, { value: "inactivas", label: "Inactivas" }], selected: activeFilter ? [activeFilter] : [], onToggle: (v) => { setActiveFilter(activeFilter === v ? "" : v); setPage(0); } },
        ]}
        onClear={() => { setTypeFilter([]); setBranchFilter([]); setActiveFilter(""); setPage(0); }}
      />

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Patente</th>
              <th className="text-left px-4 py-3">Vehículo</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Sucursal</th>
              <th className="text-left px-4 py-3">Técnico</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {pageRows.map((v) => (
              <tr key={v.id} onClick={() => router.push(ROUTES.field.unidad(v.id))} className="hover:bg-subtle/80 cursor-pointer">
                <td className="px-4 py-3 font-mono font-medium text-(--zaire-text)">{v.plate ?? "—"}</td>
                <td className="px-4 py-3">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}{v.year ? ` (${v.year})` : ""}</td>
                <td className="px-4 py-3">{v.type ? VEHICLE_TYPE_LABELS[v.type as VehicleType] : "—"}</td>
                <td className="px-4 py-3">{branchName(v.branch_id)}</td>
                <td className="px-4 py-3">{techName(v.assigned_technician_id)}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", v.is_active ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30" : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30")}>
                    {v.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(v); setFormOpen(true); }} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-(--zaire-text-muted)">No se encontraron unidades</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
        <div className="flex items-center gap-2">
          <span>{filtered.length} registros</span>
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

      <VehicleForm open={formOpen} onOpenChange={setFormOpen} vehicle={editing} technicians={technicians} onSaved={handleSaved} />
    </div>
  );
}
