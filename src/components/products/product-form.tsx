"use client";
// product-form.tsx — src/components/products/product-form.tsx — 2026-05-19
// Modal para crear/editar productos, react-hook-form + zod + Supabase

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
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import type { Product } from "@/lib/types/database";

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  category: z.enum(["sello_mecanico", "bomba", "empaquetadura", "spare_part", "otro"]).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  unit: z.string().min(1),
  default_currency: z.enum(["USD", "ARS"]),
  default_unit_price: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSaved: (product: Product) => void;
}

export function ProductForm({ open, onOpenChange, product, onSaved }: ProductFormProps) {
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: "unidad", default_currency: "USD", is_active: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              code: product.code ?? "",
              name: product.name,
              description: product.description ?? "",
              category: product.category ?? undefined,
              brand: product.brand ?? "",
              model: product.model ?? "",
              unit: product.unit,
              default_currency: product.default_currency,
              default_unit_price: product.default_unit_price?.toString() ?? "",
              notes: product.notes ?? "",
              is_active: product.is_active,
            }
          : { unit: "unidad", default_currency: "USD", is_active: true }
      );
    }
  }, [open, product, reset]);

  async function onSubmit(data: FormData) {
    const supabase = createClient();

    // Verificar código duplicado antes de guardar
    const codeToCheck = data.code?.trim() || null;
    if (codeToCheck) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from("products").select("id").eq("code", codeToCheck);
      if (isEdit && product) query = query.neq("id", product.id);
      const { data: existing } = await query.maybeSingle();
      if (existing) {
        setError("code", { message: `El código "${codeToCheck}" ya está en uso por otro producto` });
        return;
      }
    }

    const payload = {
      code: data.code || null,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      brand: data.brand || null,
      model: data.model || null,
      unit: data.unit,
      default_currency: data.default_currency,
      default_unit_price: data.default_unit_price ? parseFloat(data.default_unit_price) : null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    if (isEdit && product) {
      const { data: updated, error } = await sb.from("products").update(payload).eq("id", product.id).select().single();
      if (error) { toast.error("Error al actualizar"); return; }
      toast.success("Producto actualizado");
      onSaved(updated as Product);
    } else {
      const { data: created, error } = await sb.from("products").insert(payload).select().single();
      if (error) { toast.error("Error al crear producto"); return; }
      toast.success("Producto creado");
      onSaved(created as Product);
    }
    onOpenChange(false);
  }

  const isActive = watch("is_active");
  const currency = watch("default_currency");
  const category = watch("category");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input {...register("code")} placeholder="SM-001" />
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input {...register("name")} placeholder="Nombre del producto" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setValue("category", (v ?? undefined) as FormData["category"])}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Select value={watch("unit")} onValueChange={(v) => setValue("unit", v ?? "unidad")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["unidad", "juego", "kit", "metro", "par", "kg"].map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input {...register("brand")} placeholder="John Crane, Flowserve..." />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input {...register("model")} placeholder="Type 1, ISC2..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => setValue("default_currency", (v ?? "USD") as "USD" | "ARS")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="ARS">ARS ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Precio base</Label>
              <Input {...register("default_unit_price")} type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea {...register("description")} placeholder="Descripción técnica del producto..." rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas internas</Label>
            <Textarea {...register("notes")} placeholder="Observaciones..." rows={2} />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
            <Label htmlFor="is_active">Producto activo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
