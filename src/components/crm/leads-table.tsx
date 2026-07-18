"use client";
// leads-table.tsx — src/components/crm/leads-table.tsx — 2026-07-16
// Tabla de leads: búsqueda, filtro por estado, paginación, export XLS, alta/edición y
// conversión a cliente. Sigue el molde de sites-table (Field).

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Download, ArrowRightLeft } from "lucide-react";
import * as XLSX from "xlsx";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/field/filter-bar";
import { LimitNotice } from "@/components/shared/limit-notice";
import { LeadForm } from "./lead-form";
import { LeadConvertDialog } from "./lead-convert-dialog";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS, LEADS_LIMIT } from "@/lib/crm/constants";
import { formatCurrency, cn } from "@/lib/utils";
import type { CrmLead, LeadSource } from "@/lib/crm/types";
import type { Profile } from "@/lib/types/database";

const PAGE_SIZES = [10, 20, 50, 100];

interface LeadsTableProps {
  initialLeads: CrmLead[];
  profiles: Pick<Profile, "id" | "full_name">[];
}

export function LeadsTable({ initialLeads, profiles }: LeadsTableProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<CrmLead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmLead | null>(null);
  const [converting, setConverting] = useState<CrmLead | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (s) {
        const hay = `${l.company_name ?? ""} ${l.contact_name ?? ""} ${l.email ?? ""} ${l.phone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function handleSaved(l: CrmLead) {
    setLeads((prev) => {
      const idx = prev.findIndex((x) => x.id === l.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...l }; return next; }
      return [l, ...prev];
    });
  }

  function handleConverted(leadId: string, clientId: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: "convertido", converted_client_id: clientId } : l)));
  }

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(l: CrmLead) { setEditing(l); setFormOpen(true); }

  function exportExcel() {
    const rows = filtered.map((l) => ({
      Empresa: l.company_name ?? "", Contacto: l.contact_name ?? "", Email: l.email ?? "", Teléfono: l.phone ?? "",
      Origen: l.source ? LEAD_SOURCE_LABELS[l.source] : "", Estado: LEAD_STATUS_LABELS[l.status],
      Valor: l.estimated_value ?? "", Moneda: l.currency, Responsable: l.owner?.full_name ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `Zaire_CRM_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <LimitNotice count={leads.length} limit={LEADS_LIMIT} />

      <div className="zaire-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input placeholder="Buscar leads..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
            <Button onClick={openNew} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"><Plus className="w-4 h-4 mr-1.5" /> Nuevo Lead</Button>
          </div>
        </div>

        <FilterBar
          groups={[
            {
              key: "estado", label: "Estado",
              options: LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label })),
              selected: statusFilter ? [statusFilter] : [],
              onToggle: (v) => { setStatusFilter(statusFilter === v ? "" : v); setPage(0); },
            },
          ]}
          onClear={() => { setStatusFilter(""); setPage(0); }}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Empresa / Contacto</th>
                <th className="text-left px-4 py-3">Origen</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Valor estimado</th>
                <th className="text-left px-4 py-3">Responsable</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {pageRows.map((l) => {
                const canConvert = l.status !== "convertido" && l.status !== "descartado";
                return (
                  <tr key={l.id} onClick={() => router.push(ROUTES.crm.lead(l.id))} className="hover:bg-subtle/80 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-medium text-(--zaire-text)">{l.company_name ?? l.contact_name ?? "—"}</div>
                      {l.company_name && l.contact_name && (
                        <div className="text-xs text-(--zaire-text-muted)">{l.contact_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-(--zaire-text-muted)">{l.source ? LEAD_SOURCE_LABELS[l.source as LeadSource] : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", LEAD_STATUS_COLORS[l.status])}>
                        {LEAD_STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.estimated_value != null ? formatCurrency(l.estimated_value, l.currency) : "—"}</td>
                    <td className="px-4 py-3 text-(--zaire-text-muted)">{l.owner?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                      {canConvert && (
                        <Button variant="ghost" size="sm" onClick={() => setConverting(l)} title="Convertir a cliente">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(l)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
              {!pageRows.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-(--zaire-text-muted)">No se encontraron leads</td></tr>
              )}
            </tbody>
          </table>
        </div>

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
      </div>

      <LeadForm open={formOpen} onOpenChange={setFormOpen} lead={editing} profiles={profiles} onSaved={handleSaved} />
      <LeadConvertDialog open={!!converting} onOpenChange={(o) => { if (!o) setConverting(null); }} lead={converting} onConverted={handleConverted} />
    </div>
  );
}
