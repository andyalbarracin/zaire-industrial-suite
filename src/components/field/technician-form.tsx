"use client";
// technician-form.tsx — src/components/field/technician-form.tsx — 2026-07-13
// Modal crear/editar técnico de campo. react-hook-form + zod + Supabase.

import { useEffect } from "react";
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

interface TechnicianFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: FieldTechnician | null;
  onSaved: (technician: FieldTechnician) => void;
}

export function TechnicianForm({ open, onOpenChange, technician, onSaved }: TechnicianFormProps) {
  const isEdit = !!technician;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        technician
          ? {
              full_name: technician.full_name,
              document_id: technician.document_id ?? "",
              phone: technician.phone ?? "",
              email: technician.email ?? "",
              branch_id: technician.branch_id ?? "",
              license_number: technician.license_number ?? "",
              notes: technician.notes ?? "",
              is_active: technician.is_active,
            }
          : { is_active: true, branch_id: "" }
      );
    }
  }, [open, technician, reset]);

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = {
      full_name: data.full_name,
      document_id: data.document_id || null,
      phone: data.phone || null,
      email: data.email || null,
      branch_id: data.branch_id || null,
      license_number: data.license_number || null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    if (isEdit && technician) {
      const { data: updated, error } = await sb
        .from("field_technicians")
        .update(payload)
        .eq("id", technician.id)
        .select()
        .single();
      if (error) { toast.error("Error al actualizar el técnico"); return; }
      toast.success("Técnico actualizado");
      onSaved(updated as FieldTechnician);
    } else {
      const { data: created, error } = await sb
        .from("field_technicians")
        .insert(payload)
        .select()
        .single();
      if (error) { toast.error("Error al crear el técnico"); return; }
      toast.success("Técnico creado");
      onSaved(created as FieldTechnician);
    }
    onOpenChange(false);
  }

  const isActive = watch("is_active");
  const branchId = watch("branch_id") ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Técnico" : "Nuevo Técnico"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input id="full_name" {...register("full_name")} placeholder="Nombre y apellido" />
            {errors.full_name && <p className="text-xs text-red-600">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="document_id">DNI</Label>
              <Input id="document_id" {...register("document_id")} placeholder="28.444.121" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license_number">Licencia</Label>
              <Input id="license_number" {...register("license_number")} placeholder="B1-..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} placeholder="+54 ..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="tecnico@empresa.com" />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sucursal base</Label>
            <Select value={branchId} onValueChange={(v) => setValue("branch_id", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal...">
                  {(() => {
                    const b = BRANCHES.find((b) => b.id === branchId);
                    return b ? `${b.name} (${b.code})` : null;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      {b.name}
                      <span className="text-xs text-(--sas-text-muted) font-mono">({b.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} rows={2} placeholder="Especialidad, observaciones..." />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
            <Label htmlFor="is_active">Técnico activo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-sas-navy-mid hover:bg-sas-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear técnico"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
