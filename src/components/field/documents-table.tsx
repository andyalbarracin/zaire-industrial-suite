"use client";
// documents-table.tsx — src/components/field/documents-table.tsx — 2026-07-13
// Documentos con vencimiento (técnicos/vehículos): semáforo + filtros + alta con upload.

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot } from "@/components/shared/status-dot";
import { FilterBar } from "@/components/field/filter-bar";
import { formatDate } from "@/lib/utils";
import { DOC_TYPES, DOC_TYPE_LABELS } from "@/lib/field/constants";
import type { FieldDocumentWithExpiry } from "@/lib/field/queries";
import type { FieldTechnician, FieldVehicle, DocType } from "@/lib/field/types";

const BUCKET = "field-docs";
const PAGE_SIZES = [10, 20, 50, 100];

interface DocumentsTableProps {
  initialDocuments: FieldDocumentWithExpiry[];
  technicians: FieldTechnician[];
  vehicles: FieldVehicle[];
}

const addSchema = z.object({
  entity_type: z.string().min(1, "Requerido"),
  technician_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  doc_type: z.string().optional(),
  doc_number: z.string().optional(),
  issued_at: z.string().optional(),
  expires_at: z.string().optional(),
  notes: z.string().optional(),
});
type AddData = z.infer<typeof addSchema>;

function daysLabel(d: number | null): string {
  if (d == null) return "Sin vencimiento";
  if (d < 0) return `Vencido hace ${Math.abs(d)} días`;
  if (d === 0) return "Vence hoy";
  return `Vence en ${d} días`;
}

export function DocumentsTable({ initialDocuments, technicians, vehicles }: DocumentsTableProps) {
  const [documents, setDocuments] = useState<FieldDocumentWithExpiry[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [expiryFilter, setExpiryFilter] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AddData>({
    resolver: zodResolver(addSchema),
    defaultValues: { entity_type: "technician" },
  });

  const supabase = createClient();

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return documents.filter((d) => {
      if (typeFilter && d.doc_type !== typeFilter) return false;
      if (entityFilter.length && !entityFilter.includes(d.entity_type ?? "")) return false;
      if (expiryFilter.length) {
        const dd = d.days_until_expiry;
        const ok = expiryFilter.some((f) =>
          (f === "vencido" && dd != null && dd < 0) ||
          (f === "7" && dd != null && dd >= 0 && dd <= 7) ||
          (f === "30" && dd != null && dd > 7 && dd <= 30) ||
          (f === "vigente" && (dd == null || dd > 30))
        );
        if (!ok) return false;
      }
      if (s) {
        const hay = `${d.technician?.full_name ?? ""} ${d.vehicle?.plate ?? ""} ${d.doc_number ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [documents, search, typeFilter, entityFilter, expiryFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => { setPage(0); set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]); };

  function entityName(d: FieldDocumentWithExpiry): string {
    if (d.entity_type === "technician") return d.technician?.full_name ?? "—";
    if (d.entity_type === "vehicle") return [d.vehicle?.plate, d.vehicle?.brand].filter(Boolean).join(" ") || "—";
    return "—";
  }

  async function openFile(path: string | null) {
    if (!path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    window.open(data.signedUrl, "_blank");
  }

  function openAdd() {
    reset({ entity_type: "technician" });
    setFile(null);
    setAddOpen(true);
  }

  const entityType = watch("entity_type");
  const techId = watch("technician_id") ?? "";
  const vehId = watch("vehicle_id") ?? "";
  const docType = watch("doc_type") ?? "";

  async function onAdd(data: AddData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    let filePath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "pdf";
      filePath = `${data.entity_type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false });
      if (upErr) { toast.error("Error al subir el archivo"); return; }
    }
    const payload = {
      entity_type: data.entity_type,
      technician_id: data.entity_type === "technician" ? data.technician_id || null : null,
      vehicle_id: data.entity_type === "vehicle" ? data.vehicle_id || null : null,
      doc_type: data.doc_type || null,
      doc_number: data.doc_number || null,
      issued_at: data.issued_at || null,
      expires_at: data.expires_at || null,
      file_path: filePath,
      notes: data.notes || null,
    };
    const { data: created, error } = await sb
      .from("field_documents")
      .insert(payload)
      .select("id, entity_type, technician_id, vehicle_id, doc_type, doc_number, issued_at, expires_at, file_path, notes, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name), vehicle:field_vehicles(id, plate, brand, model)")
      .single();
    if (error) { toast.error("Error al crear el documento"); return; }

    const dd = created.expires_at ? Math.ceil((new Date(created.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const light = dd == null ? "green" : dd <= 7 ? "red" : dd <= 30 ? "yellow" : "green";
    setDocuments((prev) => [{ ...(created as FieldDocumentWithExpiry), days_until_expiry: dd, expiry_light: light }, ...prev]);
    setAddOpen(false);
    toast.success("Documento cargado");
  }

  return (
    <div className="zaire-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-(--zaire-border) bg-white px-2 text-sm">
            <option value="">Todos los tipos</option>
            {DOC_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
        <Button onClick={openAdd} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Documento
        </Button>
      </div>

      <FilterBar
        groups={[
          { key: "entidad", label: "Entidad", options: [{ value: "technician", label: "Técnico" }, { value: "vehicle", label: "Vehículo" }], selected: entityFilter, onToggle: (v) => toggle(entityFilter, setEntityFilter, v) },
          { key: "venc", label: "Vencimiento", options: [{ value: "vencido", label: "Vencidos" }, { value: "7", label: "≤7 días" }, { value: "30", label: "≤30 días" }, { value: "vigente", label: "Vigentes" }], selected: expiryFilter, onToggle: (v) => toggle(expiryFilter, setExpiryFilter, v) },
        ]}
        onClear={() => { setEntityFilter([]); setExpiryFilter([]); setPage(0); }}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Entidad</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Número</th>
              <th className="text-left px-4 py-3">Emisión</th>
              <th className="text-left px-4 py-3">Vencimiento</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {pageRows.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <span className="font-medium text-(--zaire-text)">{entityName(d)}</span>
                  <span className="text-xs text-(--zaire-text-muted) ml-1">({d.entity_type === "technician" ? "Técnico" : "Vehículo"})</span>
                </td>
                <td className="px-4 py-3">{d.doc_type ? DOC_TYPE_LABELS[d.doc_type as DocType] : "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.doc_number ?? "—"}</td>
                <td className="px-4 py-3">{formatDate(d.issued_at)}</td>
                <td className="px-4 py-3">{formatDate(d.expires_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={d.expiry_light} size="sm" pulse={d.expiry_light === "red"} />
                    <span className="text-xs text-(--zaire-text-muted)">{daysLabel(d.days_until_expiry)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {d.file_path && (
                    <Button variant="ghost" size="sm" onClick={() => openFile(d.file_path)} title="Ver archivo">
                      <FileText className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!pageRows.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-(--zaire-text-muted)">No se encontraron documentos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
        <div className="flex items-center gap-2">
          <span>{filtered.length} registros</span>
          <span className="text-(--zaire-border)">·</span>
          <label className="flex items-center gap-1.5">Mostrar
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-8 rounded-lg border border-(--zaire-border) bg-white px-2 text-sm text-(--zaire-text)">
              {PAGE_SIZES.map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>Anterior</Button>
          <span className="text-xs">Página {safePage + 1} de {pageCount}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>Siguiente</Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo documento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Entidad</Label>
                <Select value={entityType} onValueChange={(v) => { setValue("entity_type", v ?? "technician"); }}>
                  <SelectTrigger><SelectValue>{entityType === "vehicle" ? "Vehículo" : "Técnico"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Técnico</SelectItem>
                    <SelectItem value="vehicle">Vehículo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{entityType === "vehicle" ? "Vehículo" : "Técnico"}</Label>
                {entityType === "vehicle" ? (
                  <Select value={vehId} onValueChange={(v) => setValue("vehicle_id", v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar...">{vehId ? vehicles.find((x) => x.id === vehId)?.plate : null}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((x) => (<SelectItem key={x.id} value={x.id}>{[x.plate, x.brand].filter(Boolean).join(" ")}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={techId} onValueChange={(v) => setValue("technician_id", v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar...">{techId ? technicians.find((x) => x.id === techId)?.full_name : null}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {technicians.map((x) => (<SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {errors.entity_type && <p className="text-xs text-red-600">{errors.entity_type.message}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <Select value={docType} onValueChange={(v) => setValue("doc_type", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar...">{docType ? DOC_TYPE_LABELS[docType as DocType] : null}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc_number">Número</Label>
                <Input id="doc_number" {...register("doc_number")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="issued_at">Emisión</Label>
                <Input id="issued_at" type="date" {...register("issued_at")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expires_at">Vencimiento</Label>
                <Input id="expires_at" type="date" {...register("expires_at")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc_file">Archivo (imagen o PDF)</Label>
              <Input id="doc_file" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" {...register("notes")} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Cargar documento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
