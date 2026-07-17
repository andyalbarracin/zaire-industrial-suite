"use client";
// visit-form.tsx — src/components/field/visit-form.tsx — 2026-07-13
// Alta y edición de visitas. react-hook-form + zod. Genera N° de visita por RPC al crear.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import { BRANCHES } from "@/lib/constants";
import { VISIT_PURPOSES, VISIT_PURPOSE_LABELS } from "@/lib/field/constants";
import type {
  FieldVisit,
  FieldTechnician,
  FieldVehicle,
  FieldSite,
  Client,
  WorkOrder,
  VisitPurpose,
} from "@/lib/field/types";

const NONE = "__none__";

const schema = z.object({
  branch_id: z.string().min(1, "La sucursal es obligatoria"),
  technician_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  site_id: z.string().optional(),
  work_order_id: z.string().optional(),
  purpose: z.string().optional(),
  scheduled_at: z.string().optional(),
  planned_notes: z.string().optional(),
  is_billable: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface VisitFormProps {
  visit?: FieldVisit | null;
  technicians: FieldTechnician[];
  vehicles: FieldVehicle[];
  sites: FieldSite[];
  clients: Client[];
  workOrders: Pick<WorkOrder, "id" | "order_number" | "client_id">[];
  currentUser: { id: string; full_name: string } | null;
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VisitForm({ visit, technicians, vehicles, sites, clients, workOrders, currentUser }: VisitFormProps) {
  const router = useRouter();
  const isEdit = !!visit;

  const [clientId, setClientId] = useState<string | null>(visit?.client_id ?? null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      branch_id: visit?.branch_id ?? "bb",
      technician_id: visit?.technician_id ?? NONE,
      vehicle_id: visit?.vehicle_id ?? NONE,
      site_id: visit?.site_id ?? NONE,
      work_order_id: visit?.work_order_id ?? NONE,
      purpose: visit?.purpose ?? "",
      scheduled_at: toDatetimeLocal(visit?.scheduled_at),
      planned_notes: visit?.planned_notes ?? "",
      is_billable: visit?.is_billable ?? false,
    },
  });

  const branchId = watch("branch_id");
  const techId = watch("technician_id") ?? NONE;
  const vehicleId = watch("vehicle_id") ?? NONE;
  const siteId = watch("site_id") ?? NONE;
  const woId = watch("work_order_id") ?? NONE;
  const purpose = watch("purpose") ?? "";
  const isBillable = watch("is_billable");

  const sitesForClient = clientId ? sites.filter((s) => s.client_id === clientId) : sites;
  const ordersForClient = clientId ? workOrders.filter((w) => w.client_id === clientId) : workOrders;

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const base = {
      technician_id: data.technician_id === NONE ? null : data.technician_id || null,
      vehicle_id: data.vehicle_id === NONE ? null : data.vehicle_id || null,
      client_id: clientId,
      site_id: data.site_id === NONE ? null : data.site_id || null,
      work_order_id: data.work_order_id === NONE ? null : data.work_order_id || null,
      purpose: data.purpose || null,
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null,
      planned_notes: data.planned_notes || null,
      is_billable: data.is_billable,
    };

    if (isEdit && visit) {
      const { error } = await sb.from("field_visits").update(base).eq("id", visit.id);
      if (error) { toast.error("Error al actualizar la visita"); return; }
      toast.success("Visita actualizada");
      router.push(ROUTES.field.visita(visit.id));
      router.refresh();
      return;
    }

    // Alta: generar número correlativo por sucursal
    const { data: visitNumber, error: rpcError } = await sb.rpc("generate_visit_number", { p_branch_id: data.branch_id });
    if (rpcError) { toast.error("Error al generar el número de visita"); return; }

    const { data: created, error } = await sb
      .from("field_visits")
      .insert({
        ...base,
        visit_number: visitNumber,
        branch_id: data.branch_id,
        status: "planificada",
        created_by: currentUser?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !created) { toast.error("Error al crear la visita"); return; }

    // Evento inicial + audit log
    await sb.from("field_visit_events").insert({
      visit_id: created.id,
      event_type: "cambio_estado",
      description: "Visita planificada",
      created_by: currentUser?.id ?? null,
    });
    await sb.from("audit_logs").insert({
      entity_type: "field_visit",
      entity_id: created.id,
      action: "create",
      description: `Visita ${visitNumber} creada`,
      user_id: currentUser?.id ?? null,
      user_name: currentUser?.full_name ?? null,
    });

    toast.success(`Visita ${visitNumber} creada`);
    router.push(ROUTES.field.visita(created.id));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-3xl">
      <div className="zaire-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Datos de la visita</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Sucursal */}
          <div className="space-y-1.5">
            <Label>Sucursal *</Label>
            {isEdit ? (
              <div className="h-9 flex items-center px-3 rounded-lg border border-(--zaire-border) bg-slate-50 text-sm text-(--zaire-text-muted)">
                {BRANCHES.find((b) => b.id === branchId)?.name ?? branchId}
              </div>
            ) : (
              <Select value={branchId} onValueChange={(v) => { if (v) setValue("branch_id", v); }}>
                <SelectTrigger>
                  <SelectValue>
                    {(() => { const b = BRANCHES.find((b) => b.id === branchId); return b ? `${b.name} (${b.code})` : "Seleccionar..."; })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="flex items-center gap-2">{b.name}<span className="text-xs text-(--zaire-text-muted) font-mono">({b.code})</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id.message}</p>}
          </div>

          {/* Propósito */}
          <div className="space-y-1.5">
            <Label>Propósito</Label>
            <Select value={purpose} onValueChange={(v) => setValue("purpose", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar...">{purpose ? VISIT_PURPOSE_LABELS[purpose as VisitPurpose] : null}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VISIT_PURPOSES.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Técnico */}
          <div className="space-y-1.5">
            <Label>Técnico</Label>
            <Select value={techId} onValueChange={(v) => setValue("technician_id", v ?? NONE)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar">{techId === NONE ? "— Sin asignar —" : technicians.find((t) => t.id === techId)?.full_name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sin asignar —</SelectItem>
                {technicians.map((t) => (<SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehículo */}
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <Select value={vehicleId} onValueChange={(v) => setValue("vehicle_id", v ?? NONE)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar">
                  {vehicleId === NONE ? "— Sin asignar —" : (() => { const ve = vehicles.find((x) => x.id === vehicleId); return ve ? `${ve.plate ?? ""} ${ve.brand ?? ""}`.trim() : null; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sin asignar —</SelectItem>
                {vehicles.map((ve) => (<SelectItem key={ve.id} value={ve.id}>{[ve.plate, ve.brand, ve.model].filter(Boolean).join(" ")}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <ClientSelect clients={clients} value={clientId} onChange={(id) => { setClientId(id); setValue("site_id", NONE); setValue("work_order_id", NONE); }} />
          </div>

          {/* Sitio */}
          <div className="space-y-1.5">
            <Label>Sitio / Planta</Label>
            <Select value={siteId} onValueChange={(v) => setValue("site_id", v ?? NONE)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar...">{siteId === NONE ? "— Sin sitio —" : sites.find((s) => s.id === siteId)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sin sitio —</SelectItem>
                {sitesForClient.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha agendada */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_at">Fecha agendada</Label>
            <Input id="scheduled_at" type="datetime-local" {...register("scheduled_at")} />
          </div>

          {/* Facturable */}
          <div className="space-y-1.5">
            <Label>Facturable</Label>
            <div className="h-9 flex items-center gap-3">
              <Switch id="is_billable" checked={isBillable} onCheckedChange={(v) => setValue("is_billable", v)} />
              <span className="text-sm text-(--zaire-text-muted)">{isBillable ? "Sí, re-facturable al cliente" : "No facturable"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="planned_notes">Notas de la visita</Label>
          <Textarea id="planned_notes" {...register("planned_notes")} rows={3} placeholder="Objetivo de la visita, indicaciones, contacto..." />
        </div>
      </div>

      {/* Link opcional a OT */}
      <div className="zaire-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Orden de trabajo (opcional)</h2>
        <div className="space-y-1.5 max-w-md">
          <Label>Asociar a una OT existente</Label>
          <Select value={woId} onValueChange={(v) => setValue("work_order_id", v ?? NONE)}>
            <SelectTrigger>
              <SelectValue placeholder="Sin OT">{woId === NONE ? "— Sin OT —" : ordersForClient.find((w) => w.id === woId)?.order_number}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Sin OT —</SelectItem>
              {ordersForClient.map((w) => (<SelectItem key={w.id} value={w.id}>{w.order_number}</SelectItem>))}
            </SelectContent>
          </Select>
          {clientId && ordersForClient.length === 0 && (
            <p className="text-xs text-(--zaire-text-muted)">El cliente seleccionado no tiene OTs.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Crear visita"}
        </Button>
      </div>
    </form>
  );
}
