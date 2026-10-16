"use client";
// asset-form-page.tsx — src/components/assets/asset-form-page.tsx — 2026-10-15
// Alta y edición de un equipo, en PÁGINA COMPLETA. Reemplaza al modal.
//
// Por qué dejó de ser modal: el formulario tiene 17 campos. En un diálogo de 2xl con scroll
// propio quedaban tres por fila, apretados, y no había lugar para nada más. En página entera los
// campos respiran, se agrupan por tema y —lo que no entraba de ninguna forma— se pueden adjuntar
// los documentos del equipo durante el alta, en vez de obligar a crear primero y subir después.
//
// Los documentos solo se ofrecen al CREAR. Al editar, el equipo ya tiene su ficha, que es donde
// viven: duplicar ahí la gestión de archivos daría dos lugares para lo mismo.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2, Upload, X, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import {
  ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, CRITICIDAD_LABELS,
  ASSET_DOCS_BUCKET, DOC_TYPES, assetDocPath,
} from "@/lib/assets/constants";
import { validateDocFile, DOC_ACCEPT } from "@/lib/assets/doc-upload";
import { logAssetAudit } from "@/lib/assets/audit";
import { ROUTES } from "@/lib/routes";
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

/** Un archivo esperando a que el equipo exista para poder subirse. */
interface DocEnCola {
  id: string;
  file: File;
  docType: string;
  expiresAt: string;
}

function Seccion({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="zaire-card p-5">
      <h2 className="font-semibold text-(--zaire-text)">{title}</h2>
      {hint && <p className="text-xs text-(--zaire-text-muted) mt-0.5">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function AssetFormPage({
  asset,
  clients,
  sites,
}: {
  /** `null` = alta. */
  asset: Asset | null;
  clients: Client[];
  sites: { id: string; name: string }[];
}) {
  const isEdit = !!asset;
  const router = useRouter();
  const [docs, setDocs] = useState<DocEnCola[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    // En alta, los valores por defecto. En edición, el equipo ya cargado: el formulario no
    // necesita un `reset` en un effect porque la página se monta con los datos ya resueltos.
    defaultValues: asset
      ? {
          tag: asset.tag ?? "", name: asset.name, type: asset.type ?? undefined, brand: asset.brand ?? "",
          model: asset.model ?? "", serial: asset.serial ?? "", client_id: asset.client_id ?? "",
          site_id: asset.site_id ?? "", status: asset.status, criticidad: String(asset.criticidad),
          installed_at: asset.installed_at ?? "", warranty_until: asset.warranty_until ?? "",
          expected_life_years: asset.expected_life_years != null ? String(asset.expected_life_years) : "",
          address: asset.address ?? "", latitude: asset.latitude != null ? String(asset.latitude) : "",
          longitude: asset.longitude != null ? String(asset.longitude) : "", notes: asset.notes ?? "",
        }
      : { status: "operativo", criticidad: "3", name: "", tag: "" },
  });

  const type = watch("type");
  const status = watch("status");
  const criticidad = watch("criticidad");
  const clientId = watch("client_id");
  const siteId = watch("site_id");

  function agregarArchivos(files: FileList) {
    // Se valida al elegirlos, no al guardar: enterarse de que un archivo no sirve después de
    // haber completado todo el formulario es la peor versión de este error.
    const buenos: DocEnCola[] = [];
    for (const file of Array.from(files)) {
      const problema = validateDocFile(file.name, file.size);
      if (problema) { toast.error(`${file.name}: ${problema}`); continue; }
      buenos.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file, docType: "manual", expiresAt: "",
      });
    }
    if (buenos.length > 0) setDocs((prev) => [...prev, ...buenos]);
  }

  const editarDoc = (id: string, cambio: Partial<DocEnCola>) =>
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...cambio } : d)));

  /**
   * Sube los documentos que estaban en cola. Devuelve los nombres que fallaron.
   *
   * Se corre DESPUÉS de crear el equipo, porque cada archivo necesita el id del equipo tanto en
   * su ruta del bucket como en la fila de `asset_documents`. Un archivo que falla no cancela al
   * resto ni deshace el equipo: el equipo ya es válido, y el usuario puede reintentar la subida
   * desde la ficha. Lo que no se hace es mentir: se avisa cuáles no entraron.
   */
  async function subirDocs(assetId: string, userId: string | null): Promise<string[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const fallaron: string[] = [];

    for (const d of docs) {
      const path = assetDocPath(assetId, d.file.name);
      const { error: upErr } = await supabase.storage.from(ASSET_DOCS_BUCKET).upload(path, d.file, { upsert: false });
      if (upErr) { fallaron.push(d.file.name); continue; }

      const { error } = await sb.from("asset_documents").insert({
        asset_id: assetId, doc_type: d.docType, name: d.file.name, file_path: path,
        expires_at: d.expiresAt || null, created_by: userId,
      });
      if (error) {
        // El archivo quedó en el bucket pero sin fila: se borra para no dejar huérfanos.
        await supabase.storage.from(ASSET_DOCS_BUCKET).remove([path]);
        fallaron.push(d.file.name);
        continue;
      }
      logAssetAudit("asset", assetId, "document", `Documento ${d.file.name} subido`);
    }
    return fallaron;
  }

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

    const { data, error } = await (isEdit
      ? sb.from("assets").update(payload).eq("id", asset!.id).select("id").single()
      : sb.from("assets").insert(payload).select("id").single());

    if (error) { toast.error("No se pudo guardar el equipo"); return; }

    logAssetAudit("asset", data.id, isEdit ? "update" : "create", `Equipo ${v.name} ${isEdit ? "editado" : "creado"}`);

    if (docs.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      const fallaron = await subirDocs(data.id, user?.id ?? null);
      if (fallaron.length > 0) {
        toast.error(`El equipo se creó, pero ${fallaron.length === 1 ? "no se pudo subir" : "no se pudieron subir"}: ${fallaron.join(", ")}. Reintentá desde la ficha.`);
      }
    }

    toast.success(isEdit ? "Equipo actualizado" : "Equipo creado");
    // `replace` y no `push`: volver atrás no tiene que traer de nuevo el formulario ya enviado.
    router.replace(ROUTES.assets.equipo(data.id));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
      <div>
        <Link href={ROUTES.assets.equipos} className="text-sm text-(--zaire-text-muted) hover:text-(--zaire-text) inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Equipos
        </Link>
        <h1 className="text-2xl font-bold text-(--zaire-text) mt-2">{isEdit ? "Editar equipo" : "Nuevo equipo"}</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {isEdit ? asset!.name : "Solo el nombre es obligatorio. El resto se puede completar después."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <Seccion title="Identificación">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Tag / código</Label><Input {...register("tag")} placeholder="BBA-001" className="mt-1" /></div>
              <div className="sm:col-span-2">
                <Label>Nombre *</Label>
                <Input {...register("name")} className="mt-1" autoFocus />
                {errors.name && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div><Label>N° de serie</Label><Input {...register("serial")} className="mt-1" /></div>
          </Seccion>

          <Seccion title="Operación" hint="Dónde está y cuánto duele que se pare.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-[11px] text-(--zaire-text-muted) mt-1">5 frena la línea si se para; 1 puede esperar.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </Seccion>
        </div>

        <div className="space-y-5">
          <Seccion title="Vida útil" hint="Alimentan la salud del equipo. Si no los sabés, se pueden cargar después.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Instalado el</Label><Input type="date" {...register("installed_at")} className="mt-1" /></div>
              <div><Label>Garantía hasta</Label><Input type="date" {...register("warranty_until")} className="mt-1" /></div>
              <div><Label>Vida útil (años)</Label><Input type="number" step="any" {...register("expected_life_years")} className="mt-1" /></div>
            </div>
          </Seccion>

          <Seccion title="Ubicación">
            <div><Label>Ubicación (texto)</Label><Input {...register("address")} className="mt-1" placeholder="Planta Norte · Línea 1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Latitud</Label><Input type="number" step="any" {...register("latitude")} className="mt-1" /></div>
              <div><Label>Longitud</Label><Input type="number" step="any" {...register("longitude")} className="mt-1" /></div>
            </div>
          </Seccion>

          <Seccion title="Notas" hint="Lo que no entra en ningún campo: cómo suena, cuándo no se puede parar, dónde está el repuesto.">
            <Textarea {...register("notes")} rows={4} placeholder="Vibra en frío los primeros minutos. No pararla los lunes." />
          </Seccion>

          {/* Solo en el alta: al editar, los documentos se gestionan desde la ficha. */}
          {!isEdit && (
            <Seccion title="Documentos" hint="Manuales, certificados, garantías. Se suben cuando se crea el equipo.">
              {docs.length > 0 && (
                <ul className="space-y-2">
                  {docs.map((d) => (
                    <li key={d.id} className="border border-(--zaire-border) rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
                        <span className="text-sm text-(--zaire-text) truncate flex-1" title={d.file.name}>{d.file.name}</span>
                        <button
                          type="button" onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
                          aria-label={`Quitar ${d.file.name}`}
                          className="cursor-pointer text-(--zaire-text-muted) hover:text-(--danger)"
                        ><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px]">Tipo</Label>
                          <Select value={d.docType} onValueChange={(v) => editarDoc(d.id, { docType: v ?? "manual" })}>
                            <SelectTrigger className="mt-1 h-9"><SelectValue>{DOC_TYPES.find((t) => t.value === d.docType)?.label}</SelectValue></SelectTrigger>
                            <SelectContent>{DOC_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px]">Vence</Label>
                          <Input type="date" value={d.expiresAt} onChange={(e) => editarDoc(d.id, { expiresAt: e.target.value })} className="mt-1 h-9" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex items-center justify-center gap-2 h-20 rounded-lg border border-dashed border-(--zaire-border) cursor-pointer text-sm text-(--zaire-text-muted) hover:border-zaire-blue hover:text-zaire-blue transition-colors">
                <Upload className="w-4 h-4" /> {docs.length > 0 ? "Agregar otro archivo" : "Elegir archivos"}
                <input
                  type="file" multiple accept={DOC_ACCEPT} className="hidden"
                  onChange={(e) => { if (e.target.files?.length) agregarArchivos(e.target.files); e.target.value = ""; }}
                />
              </label>
            </Seccion>
          )}
        </div>
      </div>

      {/* Barra fija: en una página larga, el botón de guardar no puede quedar al final del scroll. */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-(--zaire-border) bg-(--zaire-bg)/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-end gap-2 max-w-(--breakpoint-2xl) mx-auto">
          {!isEdit && docs.length > 0 && (
            <span className="text-xs text-(--zaire-text-muted) mr-auto">
              {docs.length} archivo{docs.length === 1 ? "" : "s"} se subirá{docs.length === 1 ? "" : "n"} al crear el equipo
            </span>
          )}
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear equipo"}
          </Button>
        </div>
      </div>
    </form>
  );
}
