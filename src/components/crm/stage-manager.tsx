"use client";
// stage-manager.tsx — src/components/crm/stage-manager.tsx — 2026-07-17
// Administra las etapas del pipeline (crm_pipeline_stages): agregar, renombrar, recolorear,
// reordenar, marcar ganada/perdida y eliminar (bloqueado si la etapa tiene oportunidades).
// Se monta sólo cuando está abierto (initializer de useState) para no usar setState en effect.

import { useState } from "react";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_PALETTE, stageDot } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";
import type { CrmPipelineStage } from "@/lib/crm/types";

type Draft = Pick<CrmPipelineStage, "key" | "name" | "color" | "is_won" | "is_lost">;

type StageType = "abierta" | "ganada" | "perdida";
const typeOf = (s: Draft): StageType => (s.is_won ? "ganada" : s.is_lost ? "perdida" : "abierta");

interface StageManagerProps {
  onOpenChange: (open: boolean) => void;
  stages: CrmPipelineStage[];
  countByStage: Record<string, number>;
  onSaved: (stages: CrmPipelineStage[]) => void;
}

export function StageManager({ onOpenChange, stages, countByStage, onSaved }: StageManagerProps) {
  const [draft, setDraft] = useState<Draft[]>(() =>
    [...stages]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ key: s.key, name: s.name, color: s.color, is_won: s.is_won, is_lost: s.is_lost }))
  );
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<Draft>) {
    setDraft((d) => d.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function setType(i: number, t: StageType) {
    update(i, { is_won: t === "ganada", is_lost: t === "perdida" });
  }

  function move(i: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addStage() {
    setDraft((d) => [
      ...d,
      { key: `etapa_${Date.now()}`, name: "Nueva etapa", color: "slate", is_won: false, is_lost: false },
    ]);
  }

  function removeStage(i: number) {
    const s = draft[i];
    if ((countByStage[s.key] ?? 0) > 0) {
      toast.error("No se puede eliminar una etapa con oportunidades. Movelas primero.");
      return;
    }
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (draft.length === 0) { toast.error("Debe haber al menos una etapa."); return; }
    if (draft.some((s) => !s.name.trim())) { toast.error("Todas las etapas necesitan nombre."); return; }
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const rows = draft.map((s, i) => ({
      key: s.key,
      name: s.name.trim(),
      position: (i + 1) * 10,
      color: s.color,
      is_won: s.is_won,
      is_lost: s.is_lost,
    }));

    const { error: upErr } = await sb.from("crm_pipeline_stages").upsert(rows, { onConflict: "key" });
    if (upErr) { toast.error("Error al guardar las etapas"); setSaving(false); return; }

    // Borrar las etapas que se quitaron (ya validado que no tienen oportunidades)
    const keptKeys = new Set(rows.map((r) => r.key));
    const removed = stages.filter((s) => !keptKeys.has(s.key)).map((s) => s.key);
    if (removed.length) {
      const { error: delErr } = await sb.from("crm_pipeline_stages").delete().in("key", removed);
      if (delErr) { toast.error("Etapas guardadas, pero falló al eliminar alguna"); setSaving(false); return; }
    }

    const saved: CrmPipelineStage[] = rows.map((r) => ({
      ...r,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    toast.success("Etapas actualizadas");
    setSaving(false);
    onSaved(saved);
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar etapas del pipeline</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-(--zaire-text-muted) mt-1">
          Renombrá, recoloreá, reordená o agregá/eliminá etapas. Una etapa marcada <strong>Ganada</strong> o{" "}
          <strong>Perdida</strong> sella el cierre de la oportunidad.
        </p>

        <div className="space-y-2 mt-3">
          {draft.map((s, i) => {
            const count = countByStage[s.key] ?? 0;
            return (
              <div key={s.key} className="flex items-center gap-2 rounded-lg border border-(--zaire-border) bg-panel p-2">
                <GripVertical className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />

                <Input
                  value={s.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="h-8 flex-1 min-w-32"
                  placeholder="Nombre de la etapa"
                />

                {/* Color */}
                <Select value={s.color} onValueChange={(v) => update(i, { color: v ?? "slate" })}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("w-2.5 h-2.5 rounded-full", stageDot(s.color))} />
                        {s.color}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_PALETTE.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-2.5 h-2.5 rounded-full", stageDot(c))} />
                          {c}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Tipo */}
                <Select value={typeOf(s)} onValueChange={(v) => setType(i, (v ?? "abierta") as StageType)}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue>{typeOf(s) === "abierta" ? "Abierta" : typeOf(s) === "ganada" ? "Ganada" : "Perdida"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abierta">Abierta</SelectItem>
                    <SelectItem value="ganada">Ganada</SelectItem>
                    <SelectItem value="perdida">Perdida</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Subir" className="p-1 rounded hover:bg-subtle-2 text-(--zaire-text-muted) disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === draft.length - 1} title="Bajar" className="p-1 rounded hover:bg-subtle-2 text-(--zaire-text-muted) disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    title={count > 0 ? `${count} oportunidad(es): no se puede eliminar` : "Eliminar"}
                    className="p-1 rounded hover:bg-red-50 dark:bg-red-500/15 text-(--zaire-text-muted) hover:text-red-600 dark:text-red-300 disabled:opacity-30"
                    disabled={count > 0}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addStage} className="mt-3">
          <Plus className="w-4 h-4 mr-1.5" /> Agregar etapa
        </Button>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar etapas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
