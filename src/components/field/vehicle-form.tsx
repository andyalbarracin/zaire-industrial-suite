"use client";
// vehicle-form.tsx — src/components/field/vehicle-form.tsx — 2026-07-13
// Modal crear/editar unidad/vehículo. react-hook-form + zod + Supabase.

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
import { VEHICLE_TYPES, VEHICLE_TYPE_LABELS } from "@/lib/field/constants";
import type { FieldVehicle, FieldTechnician, VehicleType } from "@/lib/field/types";

const NONE = "__none__";

const schema = z.object({
  plate: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  type: z.string().optional(),
  branch_id: z.string().optional(),
  assigned_technician_id: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: FieldVehicle | null;
  technicians: FieldTechnician[];
  onSaved: (vehicle: FieldVehicle) => void;
}

export function VehicleForm({ open, onOpenChange, vehicle, technicians, onSaved }: VehicleFormProps) {
  const isEdit = !!vehicle;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        vehicle
          ? {
              plate: vehicle.plate ?? "",
              brand: vehicle.brand ?? "",
              model: vehicle.model ?? "",
              year: vehicle.year ? String(vehicle.year) : "",
              type: vehicle.type ?? "",
              branch_id: vehicle.branch_id ?? "",
              assigned_technician_id: vehicle.assigned_technician_id ?? NONE,
              notes: vehicle.notes ?? "",
              is_active: vehicle.is_active,
            }
          : { is_active: true, branch_id: "", type: "", assigned_technician_id: NONE }
      );
    }
  }, [open, vehicle, reset]);

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = {
      plate: data.plate || null,
      brand: data.brand || null,
      model: data.model || null,
      year: data.year ? Number(data.year) : null,
      type: data.type || null,
      branch_id: data.branch_id || null,
      assigned_technician_id: data.assigned_technician_id === NONE ? null : data.assigned_technician_id || null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    if (isEdit && vehicle) {
      const { data: updated, error } = await sb.from("field_vehicles").update(payload).eq("id", vehicle.id).select().single();
      if (error) { toast.error("Error al actualizar la unidad"); return; }
      toast.success("Unidad actualizada");
      onSaved(updated as FieldVehicle);
    } else {
      const { data: created, error } = await sb.from("field_vehicles").insert(payload).select().single();
      if (error) { toast.error("Error al crear la unidad"); return; }
      toast.success("Unidad creada");
      onSaved(created as FieldVehicle);
    }
    onOpenChange(false);
  }

  const isActive = watch("is_active");
  const type = watch("type") ?? "";
  const branchId = watch("branch_id") ?? "";
  const techId = watch("assigned_technician_id") ?? NONE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Unidad" : "Nueva Unidad"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plate">Patente</Label>
              <Input id="plate" {...register("plate")} placeholder="AB123CD" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setValue("type", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar...">
                    {type ? VEHICLE_TYPE_LABELS[type as VehicleType] : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" {...register("brand")} placeholder="Toyota" />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" {...register("model")} placeholder="Hilux" />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="year">Año</Label>
              <Input id="year" type="number" {...register("year")} placeholder="2022" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sucursal</Label>
            <Select value={branchId} onValueChange={(v) => setValue("branch_id", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal...">
                  {(() => { const b = BRANCHES.find((b) => b.id === branchId); return b ? `${b.name} (${b.code})` : null; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">{b.name}<span className="text-xs text-(--sas-text-muted) font-mono">({b.code})</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Técnico asignado</Label>
            <Select value={techId} onValueChange={(v) => setValue("assigned_technician_id", v ?? NONE)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar">
                  {techId === NONE ? "— Sin asignar —" : technicians.find((t) => t.id === techId)?.full_name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sin asignar —</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} rows={2} />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
            <Label htmlFor="is_active">Unidad activa</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-sas-navy-mid hover:bg-sas-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear unidad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
