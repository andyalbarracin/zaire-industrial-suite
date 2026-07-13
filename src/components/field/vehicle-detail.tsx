"use client";
// vehicle-detail.tsx — src/components/field/vehicle-detail.tsx — 2026-07-13
// Ficha de unidad: datos, foto de portada, archivos (fotos/PDF), mantenimiento y combustible.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Pencil, Upload, Trash2, FileText, Star, Loader2, Plus, Wrench, Fuel,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleForm } from "@/components/field/vehicle-form";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import {
  VEHICLE_TYPE_LABELS, VEHICLE_FILE_CATEGORIES, VEHICLE_FILE_CATEGORY_LABELS,
  MAINTENANCE_TYPES, MAINTENANCE_TYPE_LABELS,
} from "@/lib/field/constants";
import type {
  FieldVehicle, FieldTechnician, FieldVehicleFile, FieldVehicleMaintenance, FieldVehicleFuelLog,
  VehicleType, MaintenanceType,
} from "@/lib/field/types";

const BUCKET = "field-vehicles";

interface VehicleDetailProps {
  vehicle: FieldVehicle;
  technicians: FieldTechnician[];
  files: FieldVehicleFile[];
  maintenance: FieldVehicleMaintenance[];
  fuel: FieldVehicleFuelLog[];
  currentUser: { id: string; full_name: string } | null;
}

export function VehicleDetail({ vehicle: initialVehicle, technicians, files: initialFiles, maintenance: initialMaint, fuel: initialFuel, currentUser }: VehicleDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [files, setFiles] = useState(initialFiles);
  const [maintenance, setMaintenance] = useState(initialMaint);
  const [fuel, setFuel] = useState(initialFuel);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("foto");

  const branch = BRANCHES.find((b) => b.id === vehicle.branch_id);
  const isImage = (f: FieldVehicleFile) => f.file_type?.startsWith("image") || f.category === "foto";

  // URLs firmadas para imágenes (bucket privado)
  useEffect(() => {
    const imgs = files.filter(isImage);
    (async () => {
      if (imgs.length === 0) { setUrls({}); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.storage.from(BUCKET) as any).createSignedUrls(imgs.map((f) => f.storage_path), 3600);
      const map: Record<string, string> = {};
      (data ?? []).forEach((d: { signedUrl?: string }, i: number) => { if (d.signedUrl) map[imgs[i].id] = d.signedUrl; });
      setUrls(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    (async () => {
      if (!vehicle.cover_photo_path) { setCoverUrl(null); return; }
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(vehicle.cover_photo_path, 3600);
      setCoverUrl(data?.signedUrl ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.cover_photo_path]);

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop() ?? "bin";
      // eslint-disable-next-line react-hooks/purity
      const path = `${vehicle.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) { toast.error(`Error al subir ${file.name}`); continue; }
      const { data: created, error } = await sb.from("field_vehicle_files")
        .insert({ vehicle_id: vehicle.id, category: uploadCategory, title: file.name, storage_path: path, file_type: file.type, uploaded_by: currentUser?.id ?? null })
        .select().single();
      if (error) { toast.error("Error al registrar el archivo"); continue; }
      setFiles((prev) => [created as FieldVehicleFile, ...prev]);
    }
    setUploading(false);
    toast.success("Archivos subidos");
  }

  async function setCover(f: FieldVehicleFile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from("field_vehicles").update({ cover_photo_path: f.storage_path }).eq("id", vehicle.id);
    setVehicle((v) => ({ ...v, cover_photo_path: f.storage_path }));
    toast.success("Foto de portada actualizada");
  }

  async function deleteFile(f: FieldVehicleFile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await supabase.storage.from(BUCKET).remove([f.storage_path]);
    await sb.from("field_vehicle_files").update({ deleted_at: new Date().toISOString() }).eq("id", f.id);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    if (vehicle.cover_photo_path === f.storage_path) {
      await sb.from("field_vehicles").update({ cover_photo_path: null }).eq("id", vehicle.id);
      setVehicle((v) => ({ ...v, cover_photo_path: null }));
    }
    toast.success("Archivo eliminado");
  }

  const photos = files.filter(isImage);
  const docs = files.filter((f) => !isImage(f));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/field/unidades" className="inline-flex items-center gap-1 text-sm text-(--sas-text-muted) hover:text-sas-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a unidades
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--sas-text) font-mono">{vehicle.plate ?? "Unidad"}</h1>
            <span className="text-(--sas-text-muted)">{[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}</span>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", vehicle.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
              {vehicle.is_active ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info + portada */}
        <div className="space-y-6">
          <div className="sas-card overflow-hidden">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Portada" className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-44 bg-slate-100 flex items-center justify-center text-sm text-(--sas-text-muted)">Sin foto de portada</div>
            )}
            <div className="p-5 space-y-2.5 text-sm">
              <Row label="Tipo" value={vehicle.type ? VEHICLE_TYPE_LABELS[vehicle.type as VehicleType] : "—"} />
              <Row label="Año" value={vehicle.year ? String(vehicle.year) : "—"} />
              <Row label="Sucursal" value={branch?.name ?? "—"} />
              <Row label="Técnico" value={vehicle.technician?.full_name ?? "—"} />
              <Row label="Odómetro" value={vehicle.current_odometer != null ? `${vehicle.current_odometer.toLocaleString("es-AR")} km` : "—"} />
              {vehicle.notes && <div className="pt-1"><p className="text-(--sas-text-muted)">Notas</p><p className="text-(--sas-text)">{vehicle.notes}</p></div>}
            </div>
          </div>
        </div>

        {/* Tabs: archivos / mantenimiento / combustible */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="archivos">
            <TabsList>
              <TabsTrigger value="archivos">Archivos</TabsTrigger>
              <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
              <TabsTrigger value="combustible">Combustible</TabsTrigger>
            </TabsList>

            {/* ARCHIVOS */}
            <TabsContent value="archivos" className="mt-4 space-y-4">
              <div className="sas-card p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Categoría</Label>
                  <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v ?? "foto")}>
                    <SelectTrigger className="h-9"><SelectValue>{VEHICLE_FILE_CATEGORY_LABELS[uploadCategory]}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_FILE_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="inline-flex">
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                  <span className={cn("inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium cursor-pointer bg-sas-navy-mid hover:bg-sas-navy text-white", uploading && "opacity-60 pointer-events-none")}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />} Subir archivo(s)
                  </span>
                </label>
              </div>

              {photos.length > 0 && (
                <div className="sas-card p-4">
                  <h3 className="text-sm font-semibold text-(--sas-text) mb-3">Fotos</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photos.map((f) => (
                      <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden border border-(--sas-border) bg-slate-100">
                        {urls[f.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={urls[f.id]} alt={f.title ?? "Foto"} className="w-full h-full object-cover" />
                        ) : <div className="w-full h-full animate-pulse" />}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setCover(f)} title="Poner de portada" className="bg-white/90 rounded p-1 text-amber-500 hover:bg-white">
                            <Star className={cn("w-3.5 h-3.5", vehicle.cover_photo_path === f.storage_path && "fill-amber-400")} />
                          </button>
                          <button onClick={() => deleteFile(f)} title="Eliminar" className="bg-white/90 rounded p-1 text-red-600 hover:bg-white">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sas-card p-4">
                <h3 className="text-sm font-semibold text-(--sas-text) mb-3">Documentos ({docs.length})</h3>
                {docs.length === 0 ? (
                  <p className="text-sm text-(--sas-text-muted) py-2">Sin documentos (presupuestos, remitos de taller, seguros…).</p>
                ) : (
                  <ul className="divide-y divide-(--sas-border)">
                    {docs.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 py-2.5">
                        <FileText className="w-4 h-4 text-sas-blue shrink-0" />
                        <button onClick={() => openFile(f.storage_path)} className="flex-1 text-left text-sm text-sas-blue hover:underline truncate">{f.title ?? f.storage_path}</button>
                        <span className="text-xs text-(--sas-text-muted)">{VEHICLE_FILE_CATEGORY_LABELS[f.category ?? "otro"]}</span>
                        <button onClick={() => deleteFile(f)} title="Eliminar" className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* MANTENIMIENTO */}
            <TabsContent value="mantenimiento" className="mt-4">
              <MaintenanceSection vehicleId={vehicle.id} currentUser={currentUser} items={maintenance} setItems={setMaintenance} />
            </TabsContent>

            {/* COMBUSTIBLE */}
            <TabsContent value="combustible" className="mt-4">
              <FuelSection vehicleId={vehicle.id} currentUser={currentUser} items={fuel} setItems={setFuel} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <VehicleForm open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} technicians={technicians} onSaved={(v) => { setVehicle((prev) => ({ ...prev, ...v })); router.refresh(); }} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-(--sas-text-muted) w-24 shrink-0">{label}</span>
      <span className="text-(--sas-text) font-medium truncate">{value}</span>
    </div>
  );
}

// ---------- Mantenimiento ----------
function MaintenanceSection({ vehicleId, currentUser, items, setItems }: {
  vehicleId: string; currentUser: { id: string; full_name: string } | null;
  items: FieldVehicleMaintenance[]; setItems: React.Dispatch<React.SetStateAction<FieldVehicleMaintenance[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "service", performed_at: "", odometer: "", cost: "", currency: "ARS", workshop: "", description: "", next_service_at: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: created, error } = await sb.from("field_vehicle_maintenance").insert({
      vehicle_id: vehicleId, type: form.type, performed_at: form.performed_at || null,
      odometer: form.odometer ? Number(form.odometer) : null, cost: form.cost ? Number(form.cost) : null,
      currency: form.currency, workshop: form.workshop || null, description: form.description || null,
      next_service_at: form.next_service_at || null, created_by: currentUser?.id ?? null,
    }).select().single();
    if (error) { toast.error("Error al guardar el mantenimiento"); setBusy(false); return; }
    setItems((prev) => [created as FieldVehicleMaintenance, ...prev]);
    setBusy(false); setOpen(false);
    setForm({ type: "service", performed_at: "", odometer: "", cost: "", currency: "ARS", workshop: "", description: "", next_service_at: "" });
    toast.success("Mantenimiento registrado");
  }

  return (
    <div className="sas-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-(--sas-text) flex items-center gap-2"><Wrench className="w-4 h-4 text-sas-blue" /> Historial de mantenimiento</h3>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-8"><Plus className="w-4 h-4 mr-1" /> Registrar</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-(--sas-text-muted) py-3 text-center">Sin registros de mantenimiento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-(--sas-text-muted) uppercase tracking-wide border-b border-(--sas-border)">
              <tr><th className="text-left py-2">Fecha</th><th className="text-left py-2">Tipo</th><th className="text-right py-2">Odóm.</th><th className="text-right py-2">Costo</th><th className="text-left py-2 pl-3">Taller</th><th className="text-left py-2">Próx.</th></tr>
            </thead>
            <tbody className="divide-y divide-(--sas-border)">
              {items.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">{formatDate(m.performed_at)}</td>
                  <td className="py-2">{m.type ? MAINTENANCE_TYPE_LABELS[m.type as MaintenanceType] : "—"}</td>
                  <td className="py-2 text-right">{m.odometer != null ? m.odometer.toLocaleString("es-AR") : "—"}</td>
                  <td className="py-2 text-right">{m.cost != null ? formatCurrency(Number(m.cost), m.currency) : "—"}</td>
                  <td className="py-2 pl-3">{m.workshop ?? "—"}</td>
                  <td className="py-2">{formatDate(m.next_service_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo mantenimiento</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? "service" }))}>
                  <SelectTrigger><SelectValue>{MAINTENANCE_TYPE_LABELS[form.type]}</SelectValue></SelectTrigger>
                  <SelectContent>{MAINTENANCE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.performed_at} onChange={(e) => setForm((f) => ({ ...f, performed_at: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Odómetro</Label><Input type="number" value={form.odometer} onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Costo</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Taller</Label><Input value={form.workshop} onChange={(e) => setForm((f) => ({ ...f, workshop: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Próximo service</Label><Input type="date" value={form.next_service_at} onChange={(e) => setForm((f) => ({ ...f, next_service_at: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Descripción</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={add} disabled={busy} className="bg-sas-navy-mid hover:bg-sas-navy text-white">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Combustible ----------
function FuelSection({ vehicleId, currentUser, items, setItems }: {
  vehicleId: string; currentUser: { id: string; full_name: string } | null;
  items: FieldVehicleFuelLog[]; setItems: React.Dispatch<React.SetStateAction<FieldVehicleFuelLog[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ filled_at: "", liters: "", amount: "", currency: "ARS", odometer: "", station: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: created, error } = await sb.from("field_vehicle_fuel_logs").insert({
      vehicle_id: vehicleId, filled_at: form.filled_at ? new Date(form.filled_at).toISOString() : new Date().toISOString(),
      liters: form.liters ? Number(form.liters) : null, amount: form.amount ? Number(form.amount) : null,
      currency: form.currency, odometer: form.odometer ? Number(form.odometer) : null, station: form.station || null,
      created_by: currentUser?.id ?? null,
    }).select().single();
    if (error) { toast.error("Error al guardar la carga"); setBusy(false); return; }
    setItems((prev) => [created as FieldVehicleFuelLog, ...prev]);
    setBusy(false); setOpen(false);
    setForm({ filled_at: "", liters: "", amount: "", currency: "ARS", odometer: "", station: "" });
    toast.success("Carga registrada");
  }

  const totalArs = items.filter((f) => f.currency === "ARS").reduce((s, f) => s + Number(f.amount ?? 0), 0);

  return (
    <div className="sas-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-(--sas-text) flex items-center gap-2"><Fuel className="w-4 h-4 text-sas-blue" /> Cargas de combustible</h3>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-8"><Plus className="w-4 h-4 mr-1" /> Registrar</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-(--sas-text-muted) py-3 text-center">Sin cargas registradas.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-(--sas-text-muted) uppercase tracking-wide border-b border-(--sas-border)">
                <tr><th className="text-left py-2">Fecha</th><th className="text-right py-2">Litros</th><th className="text-right py-2">Monto</th><th className="text-right py-2">Odóm.</th><th className="text-left py-2 pl-3">Estación</th></tr>
              </thead>
              <tbody className="divide-y divide-(--sas-border)">
                {items.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2">{formatDate(f.filled_at)}</td>
                    <td className="py-2 text-right">{f.liters != null ? f.liters : "—"}</td>
                    <td className="py-2 text-right">{f.amount != null ? formatCurrency(Number(f.amount), f.currency) : "—"}</td>
                    <td className="py-2 text-right">{f.odometer != null ? f.odometer.toLocaleString("es-AR") : "—"}</td>
                    <td className="py-2 pl-3">{f.station ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-(--sas-border) text-sm">Total ARS: <strong className="ml-1">{formatCurrency(totalArs, "ARS")}</strong></div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva carga de combustible</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.filled_at} onChange={(e) => setForm((f) => ({ ...f, filled_at: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Litros</Label><Input type="number" step="0.01" value={form.liters} onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v ?? "ARS" }))}>
                  <SelectTrigger><SelectValue>{form.currency}</SelectValue></SelectTrigger>
                  <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Odómetro</Label><Input type="number" value={form.odometer} onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Estación</Label><Input value={form.station} onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={add} disabled={busy} className="bg-sas-navy-mid hover:bg-sas-navy text-white">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
