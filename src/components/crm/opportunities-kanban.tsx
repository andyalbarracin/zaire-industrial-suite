"use client";
// opportunities-kanban.tsx — src/components/crm/opportunities-kanban.tsx — 2026-07-16
// Tablero del pipeline por etapa (etapas dinámicas de crm_pipeline_stages). Drag-and-drop
// para mover a cualquier etapa con confirmación (las etapas is_won/is_lost sellan closed_at).
// Cada card tiene iconos para editar y eliminar.

import { useState, useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logCrmAudit } from "@/lib/crm/audit";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { stageDot } from "@/lib/crm/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { CrmOpportunity, CrmPipelineStage } from "@/lib/crm/types";

interface OpportunitiesKanbanProps {
  opportunities: CrmOpportunity[];
  stages: CrmPipelineStage[];
  onEdit: (opp: CrmOpportunity) => void;
  onRequestDelete: (opp: CrmOpportunity) => void;
  onStageChanged: (id: string, stage: string, closedAt: string | null) => void;
}

export function OpportunitiesKanban({ opportunities, stages, onEdit, onRequestDelete, onStageChanged }: OpportunitiesKanbanProps) {
  const [dragging, setDragging] = useState<{ id: string; stage: string } | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ opp: CrmOpportunity; target: CrmPipelineStage } | null>(null);
  const [saving, setSaving] = useState(false);

  const stageByKey = useMemo(() => new Map(stages.map((s) => [s.key, s])), [stages]);

  const byStage = useMemo(() => {
    const map = new Map<string, CrmOpportunity[]>();
    for (const s of stages) map.set(s.key, []);
    for (const o of opportunities) {
      const list = map.get(o.stage);
      if (list) list.push(o);
      else map.set(o.stage, [o]); // etapa desconocida (ej. borrada): no perder la card
    }
    return map;
  }, [opportunities, stages]);

  const canDrop = (target: string) => !!dragging && dragging.stage !== target;

  function handleDrop(target: string) {
    const drag = dragging;
    setOverStage(null);
    setDragging(null);
    if (!drag || drag.stage === target) return;
    const opp = opportunities.find((o) => o.id === drag.id);
    const targetStage = stageByKey.get(target);
    if (!opp || !targetStage) return;
    setConfirm({ opp, target: targetStage });
  }

  async function doStageChange() {
    if (!confirm) return;
    const { opp, target } = confirm;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const isClosed = target.is_won || target.is_lost;
    const closedAt = isClosed ? (opp.closed_at ?? new Date().toISOString()) : null;
    const { error } = await sb.from("crm_opportunities").update({ stage: target.key, closed_at: closedAt }).eq("id", opp.id);
    if (error) { toast.error("Error al mover la oportunidad"); setSaving(false); return; }

    const fromStage = stageByKey.get(opp.stage)?.name ?? opp.stage;
    void logCrmAudit("crm_opportunity", opp.id, "status_change", `Etapa: ${fromStage} → ${target.name} (${opp.title})`);
    toast.success(`${opp.title}: ${target.name}`);
    setSaving(false);
    setConfirm(null);
    onStageChanged(opp.id, target.key, closedAt);
  }

  return (
    <>
      <div className="overflow-x-auto p-4">
        <div className="flex gap-3 min-w-max pb-2">
          {stages.map((col) => {
            const list = byStage.get(col.key) ?? [];
            const isTarget = overStage === col.key;
            const valid = canDrop(col.key);
            const totalArs = list.filter((o) => o.currency === "ARS").reduce((a, o) => a + (Number(o.amount) || 0), 0);
            const totalUsd = list.filter((o) => o.currency === "USD").reduce((a, o) => a + (Number(o.amount) || 0), 0);
            return (
              <div
                key={col.key}
                onDragOver={(e) => { if (dragging) { e.preventDefault(); setOverStage(col.key); } }}
                onDragLeave={() => setOverStage((s) => (s === col.key ? null : s))}
                onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
                className={cn(
                  "w-64 shrink-0 rounded-xl border bg-subtle/60 flex flex-col max-h-[calc(100vh-19rem)]",
                  isTarget && valid && "border-green-400 bg-green-50 dark:bg-green-500/15/60 ring-1 ring-green-300",
                  !isTarget && "border-(--zaire-border)"
                )}
              >
                <div className="px-3 py-2.5 border-b border-(--zaire-border) sticky top-0 bg-subtle/90 backdrop-blur-sm rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", stageDot(col.color))} />
                    <span className="text-xs font-semibold text-(--zaire-text) uppercase tracking-wide truncate">{col.name}</span>
                    <span className="ml-auto text-xs font-semibold text-(--zaire-text-muted) bg-panel border border-(--zaire-border) rounded-full px-1.5 min-w-5 text-center">{list.length}</span>
                  </div>
                  {(totalArs > 0 || totalUsd > 0) && (
                    <div className="mt-1 text-[10px] text-(--zaire-text-muted) tabular-nums">
                      {totalArs > 0 && <span>{formatCurrency(totalArs, "ARS")}</span>}
                      {totalArs > 0 && totalUsd > 0 && <span> · </span>}
                      {totalUsd > 0 && <span>{formatCurrency(totalUsd, "USD")}</span>}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-(--zaire-text-muted) text-center py-6">—</p>
                  ) : (
                    list.map((o) => {
                      const isDragging = dragging?.id === o.id;
                      return (
                        <div
                          key={o.id}
                          draggable
                          onDragStart={() => setDragging({ id: o.id, stage: o.stage })}
                          onDragEnd={() => { setDragging(null); setOverStage(null); }}
                          className={cn(
                            "group bg-panel border border-(--zaire-border) rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-opacity",
                            isDragging && "opacity-40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEdit(o)}
                              className="text-sm font-medium text-(--zaire-text) text-left truncate hover:text-zaire-blue flex-1"
                            >
                              {o.title}
                            </button>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => onEdit(o)} title="Editar" className="p-0.5 rounded hover:bg-subtle-2 text-(--zaire-text-muted) hover:text-zaire-blue">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => onRequestDelete(o)} title="Eliminar" className="p-0.5 rounded hover:bg-red-50 dark:bg-red-500/15 text-(--zaire-text-muted) hover:text-red-600 dark:text-red-300">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-(--zaire-text-muted) mt-0.5 truncate">{o.client?.business_name ?? "—"}</p>
                          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-(--zaire-text-muted)">
                            <span>{o.expected_close_date ? formatDate(o.expected_close_date) : "Sin fecha"}</span>
                            {o.amount != null && <span className="font-semibold text-(--zaire-text) tabular-nums">{formatCurrency(o.amount, o.currency)}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title="Mover oportunidad de etapa"
        description={
          confirm
            ? `Vas a mover "${confirm.opp.title}" de "${stageByKey.get(confirm.opp.stage)?.name ?? confirm.opp.stage}" a "${confirm.target.name}".`
            : ""
        }
        confirmLabel={confirm?.target.is_lost ? "Sí, marcar perdida" : "Sí, mover"}
        variant={confirm?.target.is_lost ? "destructive" : "default"}
        loading={saving}
        onConfirm={doStageChange}
      />
    </>
  );
}
