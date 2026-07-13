"use client";
// sites-table.tsx — src/components/field/sites-table.tsx — 2026-07-13
// Tabla de plantas: mapa de todas, filtros en pills, paginación + selector, fila clickeable, export.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Download, Map as MapIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldMap, type MapMarker } from "@/components/field/field-map";
import { SiteForm } from "./site-form";
import { FilterBar } from "@/components/field/filter-bar";
import { cn } from "@/lib/utils";
import type { FieldSite, Client } from "@/lib/field/types";

const PAGE_SIZES = [10, 20, 50, 100];

interface SitesTableProps {
  initialSites: FieldSite[];
  clients: Client[];
}

export function SitesTable({ initialSites, clients }: SitesTableProps) {
  const router = useRouter();
  const [sites, setSites] = useState<FieldSite[]>(initialSites);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [locFilter, setLocFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return sites.filter((v) => {
      const hasCoords = v.latitude != null && v.longitude != null;
      if (activeFilter === "activas" && !v.is_active) return false;
      if (activeFilter === "inactivas" && v.is_active) return false;
      if (locFilter === "con" && !hasCoords) return false;
      if (locFilter === "sin" && hasCoords) return false;
      if (s) {
        const hay = `${v.name} ${v.city ?? ""} ${v.province ?? ""} ${v.client?.business_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [sites, search, activeFilter, locFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const mapMarkers: MapMarker[] = filtered
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({ id: s.id, lat: s.latitude!, lng: s.longitude!, kind: "site", label: s.name }));

  function handleSaved(s: FieldSite) {
    setSites((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      const merged = idx >= 0 ? { ...prev[idx], ...s } : s;
      if (idx >= 0) { const next = [...prev]; next[idx] = merged; return next; }
      return [merged, ...prev];
    });
  }

  function exportExcel() {
    const rows = filtered.map((s) => ({
      Planta: s.name, Cliente: s.client?.business_name ?? "", Ciudad: s.city ?? "", Provincia: s.province ?? "",
      Radio_m: s.latitude != null ? s.geofence_radius_m : "", Estado: s.is_active ? "Activa" : "Inactiva",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantas");
    XLSX.writeFile(wb, `Zaire_Field_Plantas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      {showMap && mapMarkers.length > 0 && (
        <div className="sas-card p-4">
          <FieldMap markers={mapMarkers} center={[-38.5, -66.0]} zoom={4} height={340} />
        </div>
      )}

      <div className="sas-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--sas-border)">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
            <Input placeholder="Buscar plantas..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowMap((m) => !m)} className="h-9"><MapIcon className="w-4 h-4 mr-1.5" /> {showMap ? "Ocultar mapa" : "Ver mapa"}</Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
            <Button onClick={() => setFormOpen(true)} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9"><Plus className="w-4 h-4 mr-1.5" /> Nueva Planta</Button>
          </div>
        </div>

        <FilterBar
          groups={[
            { key: "estado", label: "Estado", options: [{ value: "activas", label: "Activas" }, { value: "inactivas", label: "Inactivas" }], selected: activeFilter ? [activeFilter] : [], onToggle: (v) => { setActiveFilter(activeFilter === v ? "" : v); setPage(0); } },
            { key: "ubic", label: "Ubicación", options: [{ value: "con", label: "Con ubicación" }, { value: "sin", label: "Sin ubicación" }], selected: locFilter ? [locFilter] : [], onToggle: (v) => { setLocFilter(locFilter === v ? "" : v); setPage(0); } },
          ]}
          onClear={() => { setActiveFilter(""); setLocFilter(""); setPage(0); }}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--sas-border) text-xs text-(--sas-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Planta</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Ciudad</th>
                <th className="text-left px-4 py-3">Provincia</th>
                <th className="text-left px-4 py-3">Geocerca</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--sas-border)">
              {pageRows.map((s) => {
                const hasCoords = s.latitude != null && s.longitude != null;
                return (
                  <tr key={s.id} onClick={() => router.push(`/field/plantas/${s.id}`)} className="hover:bg-slate-50/80 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-(--sas-text)">{s.name}</td>
                    <td className="px-4 py-3">{s.client?.business_name ?? "—"}</td>
                    <td className="px-4 py-3">{s.city ?? "—"}</td>
                    <td className="px-4 py-3">{s.province ?? "—"}</td>
                    <td className="px-4 py-3">{hasCoords ? <span className="text-xs">{s.geofence_radius_m} m</span> : <span className="text-xs text-amber-600">Sin ubicación</span>}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", s.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{s.is_active ? "Activa" : "Inactiva"}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/field/plantas/${s.id}`)} title="Ver ficha"><Pencil className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
              {!pageRows.length && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron plantas</td></tr>
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

      <SiteForm open={formOpen} onOpenChange={setFormOpen} site={null} clients={clients} onSaved={handleSaved} />
    </div>
  );
}
