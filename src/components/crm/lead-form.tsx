"use client";
// lead-form.tsx — src/components/crm/lead-form.tsx — 2026-07-16
// Modal crear/editar lead (prospecto). Al descartar pide motivo. La conversión a
// cliente NO se hace acá: va por el diálogo de conversión (lead-convert-dialog).

import { useEffect } from "react";
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
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/crm/constants";
import type { CrmLead, LeadSource, LeadStatus } from "@/lib/crm/types";
import type { Profile } from "@/lib/types/database";

const NONE = "__none__";

// La conversión se maneja aparte; en el form sólo se llega hasta "calificado" o "descartado".
const FORM_STATUSES: LeadStatus[] = ["nuevo", "contactado", "calificado", "descartado"];

const schema = z.object({
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  source: z.string(),
  status: z.string(),
  currency: z.string(),
  owner_id: z.string(),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
  discard_reason: z.string().optional(),
}).refine((d) => !!(d.company_name?.trim() || d.contact_name?.trim()), {
  message: "Cargá al menos la empresa o el nombre de contacto",
  path: ["company_name"],
});

type FormData = z.infer<typeof schema>;

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  profiles: Pick<Profile, "id" | "full_name">[];
  onSaved: (lead: CrmLead) => void;
}

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function LeadForm({ open, onOpenChange, lead, profiles, onSaved }: LeadFormProps) {
  const isEdit = !!lead;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: NONE, status: "nuevo", currency: "ARS", owner_id: NONE },
  });

  useEffect(() => {
    if (open) {
      reset({
        company_name: lead?.company_name ?? "",
        contact_name: lead?.contact_name ?? "",
        email: lead?.email ?? "",
        phone: lead?.phone ?? "",
        source: lead?.source ?? NONE,
        status: lead?.status && lead.status !== "convertido" ? lead.status : "nuevo",
        currency: lead?.currency ?? "ARS",
        owner_id: lead?.owner_id ?? NONE,
        estimated_value: lead?.estimated_value != null ? String(lead.estimated_value) : "",
        notes: lead?.notes ?? "",
        discard_reason: lead?.discard_reason ?? "",
      });
    }
  }, [open, lead, reset]);

  const source = watch("source");
  const status = watch("status") as LeadStatus;
  const currency = watch("currency");
  const ownerId = watch("owner_id");

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const payload = {
      company_name: data.company_name?.trim() || null,
      contact_name: data.contact_name?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      source: data.source === NONE ? null : data.source,
      status: data.status,
      owner_id: data.owner_id === NONE ? null : data.owner_id,
      estimated_value: parseNum(data.estimated_value),
      currency: data.currency,
      notes: data.notes?.trim() || null,
      discard_reason: data.status === "descartado" ? (data.discard_reason?.trim() || null) : null,
    };

    if (isEdit && lead) {
      const { data: updated, error } = await sb.from("crm_leads").update(payload).eq("id", lead.id).select().single();
      if (error) { toast.error("Error al actualizar el lead"); return; }
      void logCrmAudit("crm_lead", lead.id, "update", `Lead actualizado: ${payload.company_name ?? payload.contact_name ?? ""}`);
      toast.success("Lead actualizado");
      onSaved(updated as CrmLead);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: created, error } = await sb
        .from("crm_leads")
        .insert({ ...payload, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) { toast.error("Error al crear el lead"); return; }
      void logCrmAudit("crm_lead", created.id, "create", `Lead creado: ${payload.company_name ?? payload.contact_name ?? ""}`);
      toast.success("Lead creado");
      onSaved(created as CrmLead);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Lead" : "Nuevo Lead"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Empresa</Label>
              <Input id="company_name" {...register("company_name")} placeholder="Razón social del prospecto" />
              {errors.company_name && <p className="text-xs text-red-600 dark:text-red-300">{errors.company_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contacto</Label>
              <Input id="contact_name" {...register("contact_name")} placeholder="Nombre y apellido" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="contacto@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} placeholder="+54 ..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <Select value={source} onValueChange={(v) => setValue("source", v ?? NONE)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar...">
                    {source && source !== NONE ? LEAD_SOURCE_LABELS[source as LeadSource] : "— Sin especificar —"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Sin especificar —</SelectItem>
                  {LEAD_SOURCES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v ?? "nuevo")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{status ? LEAD_STATUS_LABELS[status] : "Nuevo"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FORM_STATUSES.map((s) => (<SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "descartado" && (
            <div className="space-y-1.5">
              <Label htmlFor="discard_reason">Motivo del descarte</Label>
              <Input id="discard_reason" {...register("discard_reason")} placeholder="Sin presupuesto, no responde, etc." />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="estimated_value">Valor estimado</Label>
              <Input id="estimated_value" type="number" step="0.01" {...register("estimated_value")} placeholder="0.00" />
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

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} rows={2} placeholder="Contexto, necesidad detectada, etc." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
