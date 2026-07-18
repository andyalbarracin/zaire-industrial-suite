"use client";
// contact-form.tsx — src/components/crm/contact-form.tsx — 2026-07-16
// Modal crear/editar contacto de un cliente (persona: nombre, cargo, email, teléfono).
// El schema soporta también contactos de lead (lead_id); el alta desde acá es a nivel cliente.

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
import { Switch } from "@/components/ui/switch";
import { ClientSelect } from "@/components/clients/client-select";
import type { CrmContact, Client } from "@/lib/crm/types";

const schema = z.object({
  full_name: z.string().min(1, "El nombre es obligatorio"),
  role_title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  is_primary: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: CrmContact | null;
  clients: Client[];
  onSaved: (contact: CrmContact) => void;
}

export function ContactForm({ open, onOpenChange, contact, clients, onSaved }: ContactFormProps) {
  const isEdit = !!contact;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { is_primary: false } });

  // ClientSelect es un componente controlado (no register-friendly): único useState.
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      reset({
        full_name: contact?.full_name ?? "",
        role_title: contact?.role_title ?? "",
        email: contact?.email ?? "",
        phone: contact?.phone ?? "",
        notes: contact?.notes ?? "",
        is_primary: contact?.is_primary ?? false,
      });
      setClientId(contact?.client_id ?? null);
    }
  }, [open, contact, reset]);

  const isPrimary = watch("is_primary");

  async function onSubmit(data: FormData) {
    if (!clientId) { toast.error("Elegí el cliente del contacto"); return; }
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const payload = {
      client_id: clientId,
      full_name: data.full_name.trim(),
      role_title: data.role_title?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      is_primary: data.is_primary,
      notes: data.notes?.trim() || null,
    };

    if (isEdit && contact) {
      const { data: updated, error } = await sb.from("crm_contacts").update(payload).eq("id", contact.id).select().single();
      if (error) { toast.error("Error al actualizar el contacto"); return; }
      void logCrmAudit("crm_contact", contact.id, "update", `Contacto actualizado: ${payload.full_name}`);
      toast.success("Contacto actualizado");
      onSaved(updated as CrmContact);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: created, error } = await sb
        .from("crm_contacts")
        .insert({ ...payload, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) { toast.error("Error al crear el contacto"); return; }
      void logCrmAudit("crm_contact", created.id, "create", `Contacto creado: ${payload.full_name}`);
      toast.success("Contacto creado");
      onSaved(created as CrmContact);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nombre *</Label>
              <Input id="full_name" {...register("full_name")} placeholder="Nombre y apellido" />
              {errors.full_name && <p className="text-xs text-red-600 dark:text-red-300">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role_title">Cargo</Label>
              <Input id="role_title" {...register("role_title")} placeholder="Jefe de compras" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="persona@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} placeholder="+54 ..." />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_primary" checked={isPrimary} onCheckedChange={(v) => setValue("is_primary", v)} />
            <Label htmlFor="is_primary" className="font-normal">Contacto principal</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} rows={2} placeholder="Preferencias, horarios, etc." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear contacto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
