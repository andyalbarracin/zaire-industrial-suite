"use client";
// pipeline-view.tsx — src/components/crm/pipeline-view.tsx — 2026-07-17
// Vista del pipeline comercial: toggle Tablero (Kanban) / Lista, gestión de etapas
// dinámicas, alta/edición/eliminación de oportunidades y export. Estado optimista compartido.

import { useState, useMemo } from "react";
import { Plus, Search, Download, LayoutGrid, List, Pencil, Trash2, SlidersHorizontal } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logCrmAudit } from "@/lib/crm/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/field/filter-bar";
import { LimitNotice } from "@/components/shared/limit-notice";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OpportunitiesKanban } from "./opportunities-kanban";
import { OpportunityForm } from "./opportunity-form";
import { StageManager } from "./stage-manager";
import { OPPORTUNITIES_LIMIT, stageBadge } from "@/lib/crm/constants";
import { downloadCSV } from "@/lib/export";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { CrmOpportunity, CrmPipelineStage, Client } from "@/lib/crm/types";
import type { Profile } from "@/lib/types/database";

interface PipelineViewProps {
  initialOpportunities: CrmOpportunity[];
  initialStages: CrmPipelineStage[];
  clients: Client[];
  profiles: Pick<Profile, "id" | "full_name">[];
}

export function PipelineView({ initialOpportunities, initialStages, clients, profiles }: PipelineViewProps) {
  const [opps, setOpps] = useState<CrmOpportunity[]>(initialOpportunities);
  const [stages, setStages] = useState<CrmPipelineStage[]>(initialStages);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmOpportunity | null>(null);
  const [deleting, setDeleting] = useState<CrmOpportunity | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [stageMgrOpen, setStageMgrOpen] = useState(false);

  const stageByKey = useMemo(() => new Map(stages.map((s) => [s.key, s])), [stages]);
  const countByStage = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of opps) m[o.stage] = (m[o.stage] ?? 0) + 1;
    return m;
  }, [opps]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return opps.filter((o) => {
      if (stageFilter && o.stage !== stageFilter) return false;
      if (s) {
        const hay = `${o.title} ${o.client?.business_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [opps, search, stageFilter]);

  function handleSaved(o: CrmOpportunity) {
    setOpps((prev) => {
      const idx = prev.findIndex((x) => x.id === o.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...o }; return next; }
      return [o, ...prev];
    });
  }

  function handleStageChanged(id: string, stage: string, closedAt: string | null) {
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, stage, closed_at: closedAt } : o)));
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("crm_opportunities").update({ deleted_at: new Date().toISOString() }).eq("id", deleting.id);
    if (error) { toast.error("Error al eliminar la oportunidad"); setDeletingBusy(false); return; }
    void logCrmAudit("crm_opportunity", deleting.id, "delete", `Oportunidad eliminada: ${deleting.title}`);
    toast.success("Oportunidad eliminada");
    setOpps((prev) => prev.filter((o) => o.id !== deleting.id));
    setDeletingBusy(false);
    setDeleting(null);
  }

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(o: CrmOpportunity) { setEditing(o); setFormOpen(true); }

  function exportRows() {
    return filtered.map((o) => ({
      Título: o.title, Cliente: o.client?.business_name ?? "", Etapa: stageByKey.get(o.stage)?.name ?? o.stage,
      Monto: o.amount ?? "", Moneda: o.currency, Probabilidad: o.probability ?? "",
      Cierre_estimado: o.expected_close_date ?? "", Responsable: o.owner?.full_name ?? "",
    }));
  }
  function exportXLS() {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pipeline");
    XLSX.writeFile(wb, `Zaire_CRM_Pipeline_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function exportCSV() {
    downloadCSV(`Zaire_CRM_Pipeline_${new Date().toISOString().slice(0, 10)}.csv`, exportRows());
  }

  return (
    <div className="space-y-4">
      <LimitNotice count={opps.length} limit={OPPORTUNITIES_LIMIT} />

      <div className="zaire-card">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 border-b border-(--zaire-border)">
          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openNew} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"><Plus className="w-4 h-4 mr-1.5" /> Nueva Oportunidad</Button>
            <div className="inline-flex rounded-lg border border-(--zaire-border) overflow-hidden h-9">
              <button onClick={exportXLS} title="Exportar a XLS" className="flex items-center gap-1.5 px-3 text-sm font-medium text-(--zaire-text-muted) hover:bg-slate-50"><Download className="w-4 h-4" /> XLS</button>
              <button onClick={exportCSV} title="Exportar a CSV" className="flex items-center gap-1.5 px-3 text-sm font-medium text-(--zaire-text-muted) hover:bg-slate-50 border-l border-(--zaire-border)"><Download className="w-4 h-4" /> CSV</button>
            </div>
          </div>

          {/* Vista + búsqueda */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-(--zaire-border) overflow-hidden">
              <button
                onClick={() => setView("board")}
                className={cn("flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition-colors", view === "board" ? "bg-zaire-navy text-white" : "bg-white text-(--zaire-text-muted) hover:bg-slate-50")}
              >
                <LayoutGrid className="w-4 h-4" /> Tablero
              </button>
              <button
                onClick={() => setView("list")}
                className={cn("flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition-colors border-l border-(--zaire-border)", view === "list" ? "bg-zaire-navy text-white" : "bg-white text-(--zaire-text-muted) hover:bg-slate-50")}
              >
                <List className="w-4 h-4" /> Lista
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStageMgrOpen(true)} className="h-9"><SlidersHorizontal className="w-4 h-4 mr-1.5" /> Etapas</Button>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
              <Input placeholder="Buscar oportunidades..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
        </div>

        {view === "list" && (
          <FilterBar
            groups={[
              {
                key: "etapa", label: "Etapa",
                options: stages.map((s) => ({ value: s.key, label: s.name })),
                selected: stageFilter ? [stageFilter] : [],
                onToggle: (v) => setStageFilter(stageFilter === v ? "" : v),
              },
            ]}
            onClear={() => setStageFilter("")}
          />
        )}

        {view === "board" ? (
          <OpportunitiesKanban
            opportunities={filtered}
            stages={stages}
            onEdit={openEdit}
            onRequestDelete={setDeleting}
            onStageChanged={handleStageChanged}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Oportunidad</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Etapa</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-right px-4 py-3">Prob.</th>
                  <th className="text-left px-4 py-3">Cierre est.</th>
                  <th className="text-left px-4 py-3">Responsable</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {filtered.map((o) => {
                  const st = stageByKey.get(o.stage);
                  return (
                    <tr key={o.id} onClick={() => openEdit(o)} className="hover:bg-slate-50/80 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-(--zaire-text)">{o.title}</td>
                      <td className="px-4 py-3 text-(--zaire-text-muted)">{o.client?.business_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", stageBadge(st?.color ?? "slate"))}>
                          {st?.name ?? o.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.amount != null ? formatCurrency(o.amount, o.currency) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.probability != null ? `${o.probability}%` : "—"}</td>
                      <td className="px-4 py-3 text-(--zaire-text-muted)">{o.expected_close_date ? formatDate(o.expected_close_date) : "—"}</td>
                      <td className="px-4 py-3 text-(--zaire-text-muted)">{o.owner?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(o)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(o)} title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-(--zaire-text-muted)">No hay oportunidades</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OpportunityForm open={formOpen} onOpenChange={setFormOpen} opportunity={editing} stages={stages} clients={clients} profiles={profiles} onSaved={handleSaved} />

      {stageMgrOpen && (
        <StageManager onOpenChange={setStageMgrOpen} stages={stages} countByStage={countByStage} onSaved={setStages} />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null); }}
        title="Eliminar oportunidad"
        description={deleting ? `Vas a eliminar "${deleting.title}". Esta acción se puede revertir desde la base (borrado lógico).` : ""}
        confirmLabel="Sí, eliminar"
        variant="destructive"
        loading={deletingBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
