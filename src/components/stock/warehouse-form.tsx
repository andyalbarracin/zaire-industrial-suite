"use client";
// warehouse-form.tsx — src/components/stock/warehouse-form.tsx — 2026-07-18
// Modal crear/editar depósito (empresa o unidad móvil de Field). rhf + zod + Supabase.

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WAREHOUSE_TYPE_LABELS } from "@/lib/stock/constants";
import { logStockAudit } from "@/lib/stock/audit";
import type { Warehouse, WarehouseType } from "@/lib/stock/types";

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["deposito", "vehiculo"]),
  field_vehicle_id: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
  vehicles: { id: string; label: string }[];
  onSaved: (w: Warehouse) => void;
}

export function WarehouseForm({ open, onOpenChange, warehouse, vehicles, onSaved }: Props) {
  const isEdit = !!warehouse;
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "deposito", is_active: true },
  });

  const type = watch("type");
  const isActive = watch("is_active");

  useEffect(() => {
    if (open) {
      reset(warehouse ? {
        code: warehouse.code ?? "", name: warehouse.name, type: warehouse.type,
        field_vehicle_id: warehouse.field_vehicle_id ?? "", address: warehouse.address ?? "",
        notes: warehouse.notes ?? "", is_active: warehouse.is_active,
      } : { code: "", name: "", type: "deposito", field_vehicle_id: "", address: "", notes: "", is_active: true });
    }
  }, [open, warehouse, reset]);

  async function onSubmit(values: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const payload = {
      code: values.code || null,
      name: values.name,
      type: values.type,
      field_vehicle_id: values.type === "vehiculo" && values.field_vehicle_id && values.field_vehicle_id !== "none" ? values.field_vehicle_id : null,
      address: values.address || null,
      notes: values.notes || null,
      is_active: values.is_active,
    };
    const query = isEdit
      ? sb.from("stock_warehouses").update(payload).eq("id", warehouse!.id).select().single()
      : sb.from("stock_warehouses").insert(payload).select().single();
    const { data, error } = await query;
    if (error) { toast.error("No se pudo guardar el depósito"); return; }
    logStockAudit("stock_warehouse", data.id, isEdit ? "update" : "create", `Depósito ${values.name} ${isEdit ? "editado" : "creado"}`);
    toast.success(isEdit ? "Depósito actualizado" : "Depósito creado");
    onSaved(data as Warehouse);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Editar depósito" : "Nuevo depósito"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input {...register("code")} placeholder="DEP-CEN" className="mt-1" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setValue("type", (v as WarehouseType) ?? "deposito")}>
                <SelectTrigger className="mt-1"><SelectValue>{WAREHOUSE_TYPE_LABELS[type ?? "deposito"]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {Object.entries(WAREHOUSE_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Nombre *</Label>
            <Input {...register("name")} placeholder="Depósito Central" className="mt-1" />
            {errors.name && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{errors.name.message}</p>}
          </div>

          {type === "vehiculo" && vehicles.length > 0 && (
            <div>
              <Label>Unidad de Field (opcional)</Label>
              <Select value={watch("field_vehicle_id") || ""} onValueChange={(v) => setValue("field_vehicle_id", v ?? "")}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Vincular a una unidad">{vehicles.find((v) => v.id === watch("field_vehicle_id"))?.label}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Dirección / ubicación</Label>
            <Input {...register("address")} className="mt-1" />
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea {...register("notes")} rows={2} className="mt-1" />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={(c) => setValue("is_active", c)} />
            <Label>Activo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
