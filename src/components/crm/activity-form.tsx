"use client";
// activity-form.tsx — src/components/crm/activity-form.tsx — 2026-07-16
// Modal para registrar/editar una actividad comercial (llamada/email/reunión/nota/tarea).
// Se puede vincular a un cliente y/o a una oportunidad. Las tareas llevan vencimiento.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/lib/crm/constants";
import type { CrmActivity, ActivityType, CrmOpportunity, Client } from "@/lib/crm/types";

const NONE = "__none__";

const schema = z.object({
  activity_type: z.string(),
  opportunity_id: z.string(),
  subject: z.string().optional(),
  body: z.string().optional(),
  due_at: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: CrmActivity | null;
  clients: Client[];
  opportunities: Pick<CrmOpportunity, "id" | "title" | "client_id">[];
  onSaved: (activity: CrmActivity) => void;
}

export function ActivityForm({ open, onOpenChange, activity, clients, opportunities, onSaved }: ActivityFormProps) {
  const isEdit = !!activity;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { activity_type: "nota", opportunity_id: NONE } });

  // ClientSelect es un componente controlado (no register-friendly): único useState.
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      reset({
        activity_type: activity?.activity_type ?? "nota",
        opportunity_id: activity?.opportunity_id ?? NONE,
        subject: activity?.subject ?? "",
        body: activity?.body ?? "",
        due_at: activity?.due_at ? activity.due_at.slice(0, 16) : "",
      });
      setClientId(activity?.client_id ?? null);
    }
  }, [open, activity, reset]);

  const type = watch("activity_type") as ActivityType;
  const opportunityId = watch("opportunity_id");

  // Oportunidades filtradas por el cliente elegido (si hay).
  const oppOptions = clientId ? opportunities.filter((o) => o.client_id === clientId) : opportunities;

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const payload = {
      activity_type: data.activity_type,
      subject: data.subject?.trim() || null,
      body: data.body?.trim() || null,
      client_id: clientId,
      opportunity_id: data.opportunity_id === NONE ? null : data.opportunity_id,
      due_at: data.activity_type === "tarea" && data.due_at ? new Date(data.due_at).toISOString() : null,
    };

    if (isEdit && activity) {
      const { data: updated, error } = await sb.from("crm_activities").update(payload).eq("id", activity.id).select().single();
      if (error) { toast.error("Error al actualizar la actividad"); return; }
      toast.success("Actividad actualizada");
      onSaved(updated as CrmActivity);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: created, error } = await sb
        .from("crm_activities")
        .insert({ ...payload, done: false, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) { toast.error("Error al registrar la actividad"); return; }
      toast.success("Actividad registrada");
      onSaved(created as CrmActivity);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setValue("activity_type", v ?? "nota")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{ACTIVITY_TYPE_LABELS[type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {type === "tarea" && (
              <div className="space-y-1.5">
                <Label htmlFor="due_at">Vencimiento</Label>
                <Input id="due_at" type="datetime-local" {...register("due_at")} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Asunto</Label>
            <Input id="subject" {...register("subject")} placeholder="Llamada de seguimiento" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Detalle</Label>
            <Textarea id="body" {...register("body")} rows={3} placeholder="Qué se habló, próximos pasos, etc." />
          </div>

          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <ClientSelect clients={clients} value={clientId} onChange={(id) => { setClientId(id); setValue("opportunity_id", NONE); }} />
          </div>

          <div className="space-y-1.5">
            <Label>Oportunidad</Label>
            <Select value={opportunityId} onValueChange={(v) => setValue("opportunity_id", v ?? NONE)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin oportunidad">
                  {opportunityId !== NONE ? oppOptions.find((o) => o.id === opportunityId)?.title ?? "Sin oportunidad" : "— Sin oportunidad —"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sin oportunidad —</SelectItem>
                {oppOptions.map((o) => (<SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Registrar actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
