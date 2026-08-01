"use client";
// site-form-page.tsx — src/components/field/site-form-page.tsx — 2026-07-22
// Alta de planta/sitio como PÁGINA (más espacio que el modal): datos + ubicación/geocerca + contacto.
// react-hook-form + zod. La edición sigue en el modal (site-form.tsx) desde la ficha de la planta.
// Layout: dos columnas en desktop (campos | mapa) que ocupan todo el ancho; una columna en mobile.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ClientSelect } from "@/components/clients/client-select";
import { FieldMap } from "@/components/field/field-map";
import type { Client } from "@/lib/field/types";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
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

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function SiteFormPage({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, geofence_radius_m: "150", latitude: "", longitude: "" },
  });

  const isActive = watch("is_active");
  const lat = parseNum(watch("latitude"));
  const lng = parseNum(watch("longitude"));
  const radius = parseNum(watch("geofence_radius_m")) ?? 150;
  const hasCoords = lat != null && lng != null;

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
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
    const { data: created, error } = await sb.from("field_sites").insert(payload).select("id").single();
    if (error || !created) { toast.error("Error al crear la planta"); return; }
    toast.success("Planta creada");
    router.push(ROUTES.field.planta(created.id));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Columna izquierda: datos + contacto */}
        <div className="space-y-5">
          <div className="zaire-card p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Datos de la planta</h2>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre de la planta *</Label>
              <Input id="name" className="h-11 sm:h-9" {...register("name")} placeholder="Planta Fortín de Piedra" />
              {errors.name && <p className="text-xs text-red-600 dark:text-red-300">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" className="h-11 sm:h-9" {...register("address")} placeholder="Ruta / dirección" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" className="h-11 sm:h-9" {...register("city")} placeholder="Añelo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" className="h-11 sm:h-9" {...register("province")} placeholder="Neuquén" />
              </div>
            </div>
          </div>

          <div className="zaire-card p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Contacto en planta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Nombre del contacto</Label>
                <Input id="contact_name" className="h-11 sm:h-9" {...register("contact_name")} placeholder="Nombre" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input id="contact_phone" className="h-11 sm:h-9" {...register("contact_phone")} placeholder="+54 ..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" {...register("notes")} rows={3} placeholder="Requisitos de acceso, inducción, etc." />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
              <Label htmlFor="is_active">Planta activa</Label>
            </div>
          </div>
        </div>

        {/* Columna derecha: ubicación + geocerca */}
        <div className="zaire-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">
            <MapPin className="w-4 h-4 text-zaire-blue" /> Ubicación y geocerca
          </div>
          <p className="text-xs text-(--zaire-text-muted)">Tocá el mapa para fijar la ubicación, o cargá las coordenadas a mano.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitud</Label>
              <Input id="latitude" className="h-11 sm:h-9" {...register("latitude")} placeholder="-37.85" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitud</Label>
              <Input id="longitude" className="h-11 sm:h-9" {...register("longitude")} placeholder="-68.90" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="geofence_radius_m">Radio (m)</Label>
              <Input id="geofence_radius_m" type="number" min={20} step={10} className="h-11 sm:h-9" {...register("geofence_radius_m")} />
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
            picker
            onPick={(la, ln) => { setValue("latitude", la.toFixed(7)); setValue("longitude", ln.toFixed(7)); }}
            center={hasCoords ? [lat!, lng!] : undefined}
            zoom={13}
            height={420}
            markers={hasCoords ? [{ id: "site", lat: lat!, lng: lng!, kind: "site" }] : []}
            geofences={hasCoords ? [{ lat: lat!, lng: lng!, radius }] : []}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(ROUTES.field.plantas)} className="w-full sm:w-auto h-11 sm:h-9">Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto h-11 sm:h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Crear planta
        </Button>
      </div>
    </form>
  );
}
