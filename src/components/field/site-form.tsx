"use client";
// site-form.tsx — src/components/field/site-form.tsx — 2026-07-13
// Modal crear/editar planta/sitio con mapa Leaflet para elegir ubicación y radio de geocerca.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ClientSelect } from "@/components/clients/client-select";
import { FieldMap } from "@/components/field/field-map";
import type { FieldSite, Client } from "@/lib/field/types";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  client_id: z.string().nullable().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geofence_radius_m: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface SiteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: FieldSite | null;
  clients: Client[];
  onSaved: (site: FieldSite) => void;
}

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function SiteForm({ open, onOpenChange, site, clients, onSaved }: SiteFormProps) {
  const isEdit = !!site;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, geofence_radius_m: "150" },
  });

  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const values: FormData = site
        ? {
            name: site.name,
            client_id: site.client_id,
            address: site.address ?? "",
            city: site.city ?? "",
            province: site.province ?? "",
            latitude: site.latitude != null ? String(site.latitude) : "",
            longitude: site.longitude != null ? String(site.longitude) : "",
            geofence_radius_m: String(site.geofence_radius_m ?? 150),
            contact_name: site.contact_name ?? "",
            contact_phone: site.contact_phone ?? "",
            notes: site.notes ?? "",
            is_active: site.is_active,
          }
        : { name: "", is_active: true, geofence_radius_m: "150", latitude: "", longitude: "" };
      reset(values);
      setClientId(site?.client_id ?? null);
    }
  }, [open, site, reset]);

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    const payload = {
      name: data.name,
      client_id: clientId,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      latitude: parseNum(data.latitude),
      longitude: parseNum(data.longitude),
      geofence_radius_m: parseNum(data.geofence_radius_m) ?? 150,
      contact_name: data.contact_name || null,
      contact_phone: data.contact_phone || null,
      notes: data.notes || null,
      is_active: data.is_active,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    if (isEdit && site) {
      const { data: updated, error } = await sb.from("field_sites").update(payload).eq("id", site.id).select().single();
      if (error) { toast.error("Error al actualizar la planta"); return; }
      toast.success("Planta actualizada");
      onSaved(updated as FieldSite);
    } else {
      const { data: created, error } = await sb.from("field_sites").insert(payload).select().single();
      if (error) { toast.error("Error al crear la planta"); return; }
      toast.success("Planta creada");
      onSaved(created as FieldSite);
    }
    onOpenChange(false);
  }

  const isActive = watch("is_active");
  const lat = parseNum(watch("latitude"));
  const lng = parseNum(watch("longitude"));
  const radius = parseNum(watch("geofence_radius_m")) ?? 150;

  const hasCoords = lat != null && lng != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Planta" : "Nueva Planta"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="name">Nombre de la planta *</Label>
              <Input id="name" {...register("name")} placeholder="Planta Fortín de Piedra" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Cliente</Label>
              <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register("address")} placeholder="Ruta / dirección" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" {...register("city")} placeholder="Añelo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" {...register("province")} placeholder="Neuquén" />
              </div>
            </div>
          </div>

          {/* Ubicación + geocerca */}
          <div className="space-y-2 rounded-lg border border-(--zaire-border) p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-(--zaire-text)">
              <MapPin className="w-4 h-4 text-zaire-blue" /> Ubicación y geocerca
            </div>
            <p className="text-xs text-(--zaire-text-muted)">Hacé click en el mapa para fijar la ubicación, o cargá las coordenadas a mano.</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="latitude">Latitud</Label>
                <Input id="latitude" {...register("latitude")} placeholder="-37.85" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude">Longitud</Label>
                <Input id="longitude" {...register("longitude")} placeholder="-68.90" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="geofence_radius_m">Radio (m)</Label>
                <Input id="geofence_radius_m" type="number" min={20} step={10} {...register("geofence_radius_m")} />
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={1000}
              step={10}
              value={radius}
              onChange={(e) => setValue("geofence_radius_m", e.target.value)}
              className="w-full accent-zaire-blue"
            />
            <FieldMap
              key={isEdit ? site?.id : "new-site"}
              picker
              onPick={(la, ln) => {
                setValue("latitude", la.toFixed(7));
                setValue("longitude", ln.toFixed(7));
              }}
              center={hasCoords ? [lat!, lng!] : undefined}
              zoom={13}
              height={280}
              markers={hasCoords ? [{ id: "site", lat: lat!, lng: lng!, kind: "site" }] : []}
              geofences={hasCoords ? [{ lat: lat!, lng: lng!, radius }] : []}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contacto en planta</Label>
              <Input id="contact_name" {...register("contact_name")} placeholder="Nombre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Teléfono de contacto</Label>
              <Input id="contact_phone" {...register("contact_phone")} placeholder="+54 ..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} rows={2} placeholder="Requisitos de acceso, inducción, etc." />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
            <Label htmlFor="is_active">Planta activa</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear planta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
