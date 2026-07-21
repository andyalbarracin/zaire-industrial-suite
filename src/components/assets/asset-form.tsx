"use client";
// asset-form.tsx — src/components/assets/asset-form.tsx — 2026-07-20
// Modal crear/editar equipo. rhf + zod + Supabase. Reusa ClientSelect; sitio de Field opcional.

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
import { ClientSelect } from "@/components/clients/client-select";
import { ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, CRITICIDAD_LABELS } from "@/lib/assets/constants";
import { logAssetAudit } from "@/lib/assets/audit";
import type { Asset, AssetType, AssetStatus, Client } from "@/lib/assets/types";

const schema = z.object({
  tag: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["bomba", "sello", "compresor", "motor", "valvula", "otro"]).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  client_id: z.string().optional(),
  site_id: z.string().optional(),
  status: z.enum(["operativo", "en_reparacion", "standby", "baja"]),
  criticidad: z.string(),
  installed_at: z.string().optional(),
  warranty_until: z.string().optional(),
  expected_life_years: z.string().optional(),
  address: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  clients: Client[];
  sites: { id: string; name: string }[];
  onSaved: (a: Asset) => void;
}

export function AssetForm({ open, onOpenChange, asset, clients, sites, onSaved }: Props) {
  const isEdit = !!asset;
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "operativo", criticidad: "3" },
  });

  const type = watch("type");
  const status = watch("status");
  const criticidad = watch("criticidad");
  const clientId = watch("client_id");
  const siteId = watch("site_id");

  useEffect(() => {
    if (open) {
      reset(asset ? {
        tag: asset.tag ?? "", name: asset.name, type: asset.type ?? undefined, brand: asset.brand ?? "",
        model: asset.model ?? "", serial: asset.serial ?? "", client_id: asset.client_id ?? "",
        site_id: asset.site_id ?? "", status: asset.status, criticidad: String(asset.criticidad),
        installed_at: asset.installed_at ?? "", warranty_until: asset.warranty_until ?? "",
        expected_life_years: asset.expected_life_years != null ? String(asset.expected_life_years) : "",
        address: asset.address ?? "", latitude: asset.latitude != null ? String(asset.latitude) : "",
        longitude: asset.longitude != null ? String(asset.longitude) : "", notes: asset.notes ?? "",
      } : { status: "operativo", criticidad: "3", name: "", tag: "" });
    }
  }, [open, asset, reset]);

  async function onSubmit(v: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const num = (s?: string) => (s && s.trim() !== "" ? Number(s) : null);
    const payload = {
      tag: v.tag || null, name: v.name, type: v.type ?? null, brand: v.brand || null, model: v.model || null,
      serial: v.serial || null, client_id: v.client_id || null,
      site_id: v.site_id && v.site_id !== "none" ? v.site_id : null,
      status: v.status, criticidad: Number(v.criticidad),
      installed_at: v.installed_at || null, warranty_until: v.warranty_until || null,
      expected_life_years: num(v.expected_life_years), address: v.address || null,
      latitude: num(v.latitude), longitude: num(v.longitude), notes: v.notes || null,
    };
    const query = isEdit
      ? sb.from("assets").update(payload).eq("id", asset!.id).select("*, client:clients(id, business_name)").single()
      : sb.from("assets").insert(payload).select("*, client:clients(id, business_name)").single();
    const { data, error } = await query;
    if (error) { toast.error("No se pudo guardar el equipo"); return; }
    logAssetAudit("asset", data.id, isEdit ? "update" : "create", `Equipo ${v.name} ${isEdit ? "editado" : "creado"}`);
    toast.success(isEdit ? "Equipo actualizado" : "Equipo creado");
    onSaved(data as Asset);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar equipo" : "Nuevo equipo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Tag / código</Label><Input {...register("tag")} placeholder="BBA-001" className="mt-1" /></div>
            <div className="col-span-2"><Label>Nombre *</Label><Input {...register("name")} className="mt-1" />{errors.name && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{errors.name.message}</p>}</div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type ?? ""} onValueChange={(v) => setValue("type", (v as AssetType) || undefined)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tipo">{type ? ASSET_TYPE_LABELS[type] : ""}</SelectValue></SelectTrigger>
                <SelectContent>{Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Marca</Label><Input {...register("brand")} className="mt-1" /></div>
            <div><Label>Modelo</Label><Input {...register("model")} className="mt-1" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>N° de serie</Label><Input {...register("serial")} className="mt-1" /></div>
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setValue("status", (v as AssetStatus) ?? "operativo")}>
                <SelectTrigger className="mt-1"><SelectValue>{ASSET_STATUS_LABELS[status ?? "operativo"]}</SelectValue></SelectTrigger>
                <SelectContent>{Object.entries(ASSET_STATUS_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Criticidad</Label>
              <Select value={criticidad} onValueChange={(v) => setValue("criticidad", v ?? "3")}>
                <SelectTrigger className="mt-1"><SelectValue>{criticidad} · {CRITICIDAD_LABELS[Number(criticidad)] ?? ""}</SelectValue></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => (<SelectItem key={n} value={String(n)}>{n} · {CRITICIDAD_LABELS[n]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cliente (dueño)</Label><div className="mt-1"><ClientSelect clients={clients} value={clientId || null} onChange={(v) => setValue("client_id", v ?? "")} /></div></div>
            {sites.length > 0 && (
              <div>
                <Label>Sitio / planta (Field)</Label>
                <Select value={siteId || "none"} onValueChange={(v) => setValue("site_id", v ?? "")}>
                  <SelectTrigger className="mt-1"><SelectValue>{sites.find((s) => s.id === siteId)?.name ?? "Sin sitio"}</SelectValue></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sin sitio</SelectItem>{sites.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Instalado el</Label><Input type="date" {...register("installed_at")} className="mt-1" /></div>
            <div><Label>Garantía hasta</Label><Input type="date" {...register("warranty_until")} className="mt-1" /></div>
            <div><Label>Vida útil (años)</Label><Input type="number" step="any" {...register("expected_life_years")} className="mt-1" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1"><Label>Ubicación (texto)</Label><Input {...register("address")} className="mt-1" placeholder="Planta / sector" /></div>
            <div><Label>Latitud</Label><Input type="number" step="any" {...register("latitude")} className="mt-1" /></div>
            <div><Label>Longitud</Label><Input type="number" step="any" {...register("longitude")} className="mt-1" /></div>
          </div>

          <div><Label>Notas</Label><Textarea {...register("notes")} rows={2} className="mt-1" /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}{isEdit ? "Guardar" : "Crear"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
