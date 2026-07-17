"use client";
// technician-form-page.tsx — src/components/field/technician-form-page.tsx — 2026-07-13
// Alta y edición de técnico como PÁGINA (no modal). Registra evento en audit_logs.

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
import { BRANCHES } from "@/lib/constants";
import type { FieldTechnician } from "@/lib/field/types";

const schema = z.object({
  full_name: z.string().min(1, "El nombre es obligatorio"),
  document_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  branch_id: z.string().optional(),
  license_number: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

interface TechnicianFormPageProps {
  technician?: FieldTechnician | null;
  currentUser: { id: string; full_name: string } | null;
}

export function TechnicianFormPage({ technician, currentUser }: TechnicianFormPageProps) {
  const router = useRouter();
  const isEdit = !!technician;
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: technician
      ? {
          full_name: technician.full_name, document_id: technician.document_id ?? "", phone: technician.phone ?? "",
          email: technician.email ?? "", branch_id: technician.branch_id ?? "", license_number: technician.license_number ?? "",
          notes: technician.notes ?? "", is_active: technician.is_active,
        }
      : { is_active: true, branch_id: "" },
  });

  const isActive = watch("is_active");
  const branchId = watch("branch_id") ?? "";

  async function onSubmit(data: FormData) {
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const payload = {
      full_name: data.full_name, document_id: data.document_id || null, phone: data.phone || null,
      email: data.email || null, branch_id: data.branch_id || null, license_number: data.license_number || null,
      notes: data.notes || null, is_active: data.is_active,
    };

    let id = technician?.id;
    if (isEdit && technician) {
      const { error } = await sb.from("field_technicians").update(payload).eq("id", technician.id);
      if (error) { toast.error("Error al actualizar el técnico"); setSaving(false); return; }
    } else {
      const { data: created, error } = await sb.from("field_technicians").insert(payload).select("id").single();
      if (error || !created) { toast.error("Error al crear el técnico"); setSaving(false); return; }
      id = created.id;
    }
    await sb.from("audit_logs").insert({
      entity_type: "field_technician", entity_id: id, action: isEdit ? "update" : "create",
      description: isEdit ? "Técnico actualizado" : "Técnico creado",
      user_id: currentUser?.id ?? null, user_name: currentUser?.full_name ?? null,
    });
    toast.success(isEdit ? "Técnico actualizado" : "Técnico creado");
    router.push(ROUTES.field.tecnico(id!));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-3xl">
      <div className="zaire-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Datos del técnico</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input id="full_name" {...register("full_name")} placeholder="Nombre y apellido" />
            {errors.full_name && <p className="text-xs text-red-600">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="document_id">DNI</Label><Input id="document_id" {...register("document_id")} /></div>
          <div className="space-y-1.5"><Label htmlFor="license_number">Licencia</Label><Input id="license_number" {...register("license_number")} /></div>
          <div className="space-y-1.5"><Label htmlFor="phone">Teléfono</Label><Input id="phone" {...register("phone")} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Sucursal base</Label>
            <Select value={branchId} onValueChange={(v) => setValue("branch_id", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal...">
                  {(() => { const b = BRANCHES.find((b) => b.id === branchId); return b ? `${b.name} (${b.code})` : null; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" {...register("notes")} rows={2} /></div>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
          <Label htmlFor="is_active">Técnico activo</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Crear técnico"}
        </Button>
      </div>
    </form>
  );
}
