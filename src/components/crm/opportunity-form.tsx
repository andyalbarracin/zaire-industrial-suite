"use client";
// opportunity-form.tsx — src/components/crm/opportunity-form.tsx — 2026-07-16
// Modal crear/editar oportunidad del pipeline. Cliente vía ClientSelect (reusa clients).
// Etapas dinámicas (crm_pipeline_stages): al entrar a una etapa is_won/is_lost se sella
// closed_at; las etapas is_lost piden motivo.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logCrmAudit } from "@/lib/crm/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import type { CrmOpportunity, CrmPipelineStage, Client } from "@/lib/crm/types";
import type { Profile } from "@/lib/types/database";

const NONE = "__none__";

const schema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  stage: z.string(),
  currency: z.string(),
  owner_id: z.string(),
  amount: z.string().optional(),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
  lost_reason: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface OpportunityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: CrmOpportunity | null;
  stages: CrmPipelineStage[];
  clients: Client[];
  profiles: Pick<Profile, "id" | "full_name">[];
  onSaved: (opportunity: CrmOpportunity) => void;
}

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function OpportunityForm({ open, onOpenChange, opportunity, stages, clients, profiles, onSaved }: OpportunityFormProps) {
  const isEdit = !!opportunity;
  const defaultStage = stages[0]?.key ?? "prospecto";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stage: defaultStage, currency: "ARS", owner_id: NONE },
  });

  // ClientSelect es un componente controlado (no register-friendly): único useState.
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      reset({
        title: opportunity?.title ?? "",
        stage: opportunity?.stage ?? defaultStage,
        currency: opportunity?.currency ?? "ARS",
        owner_id: opportunity?.owner_id ?? NONE,
        amount: opportunity?.amount != null ? String(opportunity.amount) : "",
        probability: opportunity?.probability != null ? String(opportunity.probability) : "",
        expected_close_date: opportunity?.expected_close_date ?? "",
        notes: opportunity?.notes ?? "",
        lost_reason: opportunity?.lost_reason ?? "",
      });
      setClientId(opportunity?.client_id ?? null);
    }
  }, [open, opportunity, reset, defaultStage]);

  const stageKey = watch("stage");
  const currency = watch("currency");
  const ownerId = watch("owner_id");
  const selectedStage = stages.find((s) => s.key === stageKey);

  async function onSubmit(data: FormData) {
    if (!clientId) { toast.error("Elegí un cliente para la oportunidad"); return; }
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const st = stages.find((s) => s.key === data.stage);
    const isClosed = !!(st?.is_won || st?.is_lost);
    const payload = {
      title: data.title.trim(),
      client_id: clientId,
      stage: data.stage,
      amount: parseNum(data.amount),
      currency: data.currency,
      probability: parseNum(data.probability),
      expected_close_date: data.expected_close_date || null,
      owner_id: data.owner_id === NONE ? null : data.owner_id,
      notes: data.notes?.trim() || null,
      lost_reason: st?.is_lost ? (data.lost_reason?.trim() || null) : null,
      // Sella el cierre al entrar a una etapa ganada/perdida; lo limpia si vuelve a una abierta.
      closed_at: isClosed ? (opportunity?.closed_at ?? new Date().toISOString()) : null,
    };

    if (isEdit && opportunity) {
      const { data: updated, error } = await sb.from("crm_opportunities").update(payload).eq("id", opportunity.id).select().single();
      if (error) { toast.error("Error al actualizar la oportunidad"); return; }
      void logCrmAudit("crm_opportunity", opportunity.id, "update", `Oportunidad actualizada: ${payload.title}`);
      toast.success("Oportunidad actualizada");
      onSaved(updated as CrmOpportunity);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: created, error } = await sb
        .from("crm_opportunities")
        .insert({ ...payload, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) { toast.error("Error al crear la oportunidad"); return; }
      void logCrmAudit("crm_opportunity", created.id, "create", `Oportunidad creada: ${payload.title}`);
      toast.success("Oportunidad creada");
      onSaved(created as CrmOpportunity);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Oportunidad" : "Nueva Oportunidad"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...register("title")} placeholder="Provisión de sellos mecánicos" />
            {errors.title && <p className="text-xs text-red-600 dark:text-red-300">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={stageKey} onValueChange={(v) => setValue("stage", v ?? defaultStage)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{selectedStage?.name ?? stageKey}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (<SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Select value={ownerId} onValueChange={(v) => setValue("owner_id", v ?? NONE)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin asignar">
                    {ownerId && ownerId !== NONE ? profiles.find((p) => p.id === ownerId)?.full_name : "— Sin asignar —"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Sin asignar —</SelectItem>
                  {profiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setValue("currency", v ?? "ARS")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{currency}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="probability">Prob. %</Label>
              <Input id="probability" type="number" min={0} max={100} {...register("probability")} placeholder="50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expected_close_date">Cierre estimado</Label>
            <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
          </div>

          {selectedStage?.is_lost && (
            <div className="space-y-1.5">
              <Label htmlFor="lost_reason">Motivo de la pérdida</Label>
              <Input id="lost_reason" {...register("lost_reason")} placeholder="Precio, competencia, timing, etc." />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} rows={2} placeholder="Detalle de la oportunidad" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear oportunidad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
