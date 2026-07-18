"use client";
// client-form.tsx — src/components/clients/client-form.tsx — 2026-05-27
// Modal para crear y editar clientes, react-hook-form + zod + Supabase

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Client } from "@/lib/types/database";

const schema = z.object({
  business_name: z.string().min(1, "La razón social es obligatoria"),
  client_code: z.string().optional(),
  tax_id: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSaved: (client: Client) => void;
}

export function ClientForm({ open, onOpenChange, client, onSaved }: ClientFormProps) {
  const isEdit = !!client;

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
        client
          ? {
              business_name: client.business_name,
              client_code: client.client_code ?? "",
              tax_id: client.tax_id ?? "",
              contact_name: client.contact_name ?? "",
              email: client.email ?? "",
              phone: client.phone ?? "",
              address: client.address ?? "",
              city: client.city ?? "",
              notes: client.notes ?? "",
              is_active: client.is_active,
            }
          : { is_active: true }
      );
    }
  }, [open, client, reset]);

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = {
      business_name: data.business_name,
      client_code: data.client_code || null,
      tax_id: data.tax_id || null,
      contact_name: data.contact_name || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    if (isEdit && client) {
      const { data: updated, error } = await sb.from("clients").update(payload).eq("id", client.id).select().single();
      if (error) { toast.error("Error al actualizar el cliente"); return; }
      toast.success("Cliente actualizado");
      onSaved(updated as Client);
    } else {
      const { data: created, error } = await sb.from("clients").insert(payload).select().single();
      if (error) { toast.error("Error al crear el cliente"); return; }
      toast.success("Cliente creado");
      onSaved(created as Client);
    }
    onOpenChange(false);
  }

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="business_name">Razón Social *</Label>
              <Input id="business_name" {...register("business_name")} placeholder="Empresa S.A." />
              {errors.business_name && <p className="text-xs text-red-600 dark:text-red-300">{errors.business_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_code">Código de Cliente</Label>
              <Input id="client_code" {...register("client_code")} placeholder="Ej: C-0001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_id">CUIT</Label>
              <Input id="tax_id" {...register("tax_id")} placeholder="30-12345678-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contacto</Label>
              <Input id="contact_name" {...register("contact_name")} placeholder="Nombre y apellido" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} placeholder="+54 11 ..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="contacto@empresa.com" />
            {errors.email && <p className="text-xs text-red-600 dark:text-red-300">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register("address")} placeholder="Av. Corrientes 1234" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register("city")} placeholder="CABA" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Observaciones, acuerdos especiales..." rows={2} />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
            <Label htmlFor="is_active">Cliente activo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-zaire-navy-mid hover:bg-zaire-navy text-white"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
