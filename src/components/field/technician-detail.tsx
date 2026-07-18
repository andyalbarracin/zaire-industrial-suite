"use client";
// technician-detail.tsx — src/components/field/technician-detail.tsx — 2026-07-13
// Ficha de técnico (página): foto, datos, contactos, archivos/certificados, documentos y log.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  ChevronLeft, Pencil, Upload, Trash2, FileText, Loader2, Plus, UserRound, Phone, IdCard, History,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusDot } from "@/components/shared/status-dot";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import {
  CONTACT_KINDS, CONTACT_KIND_LABELS, TECHNICIAN_FILE_CATEGORIES, TECHNICIAN_FILE_CATEGORY_LABELS,
  DOC_TYPE_LABELS,
} from "@/lib/field/constants";
import type {
  FieldTechnician, FieldTechnicianContact, FieldTechnicianFile, DocType,
} from "@/lib/field/types";
import type { FieldDocumentWithExpiry } from "@/lib/field/queries";

const BUCKET = "field-technicians";

interface LogRow { id: string; action: string; description: string | null; user_name: string | null; created_at: string }

interface TechnicianDetailProps {
  technician: FieldTechnician;
  contacts: FieldTechnicianContact[];
  files: FieldTechnicianFile[];
  documents: FieldDocumentWithExpiry[];
  log: LogRow[];
  currentUser: { id: string; full_name: string } | null;
}

export function TechnicianDetail({ technician: initial, contacts: initialContacts, files: initialFiles, documents, log, currentUser }: TechnicianDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tech, setTech] = useState(initial);
  const [contacts, setContacts] = useState(initialContacts);
  const [files, setFiles] = useState(initialFiles);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [fileCategory, setFileCategory] = useState("apto_medico");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ kind: "telefono", label: "", value: "" });

  const branch = BRANCHES.find((b) => b.id === tech.branch_id);
  const isImage = (f: FieldTechnicianFile) => f.file_type?.startsWith("image") || f.category === "foto";

  useEffect(() => {
    (async () => {
      if (!tech.photo_path) { setPhotoUrl(null); return; }
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(tech.photo_path, 3600);
      setPhotoUrl(data?.signedUrl ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tech.photo_path]);

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

  async function uploadPhoto(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const ext = file.name.split(".").pop() ?? "jpg";
    // eslint-disable-next-line react-hooks/purity
    const path = `${tech.id}/foto-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) { toast.error("Error al subir la foto"); setUploading(false); return; }
    await sb.from("field_technicians").update({ photo_path: path }).eq("id", tech.id);
    setTech((t) => ({ ...t, photo_path: path }));
    setUploading(false);
    toast.success("Foto actualizada");
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop() ?? "bin";
      // eslint-disable-next-line react-hooks/purity
      const path = `${tech.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) { toast.error(`Error al subir ${file.name}`); continue; }
      const { data: created, error } = await sb.from("field_technician_files")
        .insert({ technician_id: tech.id, category: fileCategory, title: file.name, storage_path: path, file_type: file.type, uploaded_by: currentUser?.id ?? null })
        .select().single();
      if (error) { toast.error("Error al registrar el archivo"); continue; }
      setFiles((prev) => [created as FieldTechnicianFile, ...prev]);
    }
    setUploading(false);
    toast.success("Archivos subidos");
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function deleteFile(f: FieldTechnicianFile) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await supabase.storage.from(BUCKET).remove([f.storage_path]);
    await sb.from("field_technician_files").update({ deleted_at: new Date().toISOString() }).eq("id", f.id);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    toast.success("Archivo eliminado");
  }

  async function addContact() {
    if (!contactForm.value.trim()) { toast.error("Ingresá un valor"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: created, error } = await sb.from("field_technician_contacts")
      .insert({ technician_id: tech.id, kind: contactForm.kind, label: contactForm.label || null, value: contactForm.value.trim() })
      .select().single();
    if (error) { toast.error("Error al agregar contacto"); return; }
    setContacts((prev) => [...prev, created as FieldTechnicianContact]);
    setContactOpen(false);
    setContactForm({ kind: "telefono", label: "", value: "" });
    toast.success("Contacto agregado");
  }

  async function deleteContact(c: FieldTechnicianContact) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from("field_technician_contacts").update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
    setContacts((prev) => prev.filter((x) => x.id !== c.id));
    toast.success("Contacto eliminado");
  }

  const photos = files.filter(isImage);
  const docs = files.filter((f) => !isImage(f));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.field.tecnicos} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a técnicos
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--zaire-text)">{tech.full_name}</h1>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", tech.is_active ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30" : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30")}>
              {tech.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
        <Button asChild variant="outline"><Link href={ROUTES.field.tecnicoEditar(tech.id)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Link></Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Foto + datos */}
        <div className="zaire-card p-5 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-subtle-2 flex items-center justify-center border border-(--zaire-border)">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={tech.full_name} className="w-full h-full object-cover" />
              ) : <UserRound className="w-12 h-12 text-slate-300" />}
            </div>
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files)} />
              <span className={cn("inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium cursor-pointer border border-(--zaire-border) hover:bg-subtle", uploading && "opacity-60 pointer-events-none")}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Foto
              </span>
            </label>
          </div>
          <div className="space-y-2.5 text-sm pt-2 border-t border-(--zaire-border)">
            <Row icon={IdCard} label="DNI" value={tech.document_id ?? "—"} />
            <Row icon={IdCard} label="Licencia" value={tech.license_number ?? "—"} />
            <Row icon={Phone} label="Teléfono" value={tech.phone ?? "—"} />
            <Row icon={Phone} label="Email" value={tech.email ?? "—"} />
            <Row icon={UserRound} label="Sucursal" value={branch?.name ?? "—"} />
            {tech.notes && <p className="text-(--zaire-text-muted) pt-1">{tech.notes}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contactos">
            <TabsList>
              <TabsTrigger value="contactos">Contactos</TabsTrigger>
              <TabsTrigger value="archivos">Archivos</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            {/* CONTACTOS */}
            <TabsContent value="contactos" className="mt-4">
              <div className="zaire-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-(--zaire-text)">Contactos y teléfonos</h3>
                  <Button size="sm" onClick={() => setContactOpen(true)} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-8"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {contacts.length === 0 ? (
                  <p className="text-sm text-(--zaire-text-muted) py-2">Sin contactos adicionales.</p>
                ) : (
                  <ul className="divide-y divide-(--zaire-border)">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-2.5">
                        <span className="text-xs font-medium text-(--zaire-text-muted) w-32 shrink-0">{c.kind ? CONTACT_KIND_LABELS[c.kind] : "Otro"}{c.label ? ` · ${c.label}` : ""}</span>
                        <span className="flex-1 text-sm text-(--zaire-text)">{c.value}</span>
                        <button onClick={() => deleteContact(c)} className="text-red-600 dark:text-red-300 hover:text-red-700 dark:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* ARCHIVOS */}
            <TabsContent value="archivos" className="mt-4 space-y-4">
              <div className="zaire-card p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={fileCategory} onValueChange={(v) => setFileCategory(v ?? "apto_medico")}>
                    <SelectTrigger className="h-9"><SelectValue>{TECHNICIAN_FILE_CATEGORY_LABELS[fileCategory]}</SelectValue></SelectTrigger>
                    <SelectContent>{TECHNICIAN_FILE_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <label className="inline-flex">
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <span className={cn("inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium cursor-pointer bg-zaire-navy-mid hover:bg-zaire-navy text-white", uploading && "opacity-60 pointer-events-none")}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />} Subir
                  </span>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="zaire-card p-4">
                  <h3 className="text-sm font-semibold text-(--zaire-text) mb-3">Imágenes</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photos.map((f) => (
                      <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden border border-(--zaire-border) bg-subtle-2">
                        {urls[f.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={urls[f.id]} alt={f.title ?? "img"} className="w-full h-full object-cover" />
                        ) : <div className="w-full h-full animate-pulse" />}
                        <button onClick={() => deleteFile(f)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 rounded p-1 text-red-600 dark:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="zaire-card p-4">
                <h3 className="text-sm font-semibold text-(--zaire-text) mb-3">Certificados y archivos ({docs.length})</h3>
                {docs.length === 0 ? (
                  <p className="text-sm text-(--zaire-text-muted) py-2">Sin certificados (apto médico, seguridad, cursos…).</p>
                ) : (
                  <ul className="divide-y divide-(--zaire-border)">
                    {docs.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 py-2.5">
                        <FileText className="w-4 h-4 text-zaire-blue shrink-0" />
                        <button onClick={() => openFile(f.storage_path)} className="flex-1 text-left text-sm text-zaire-blue hover:underline truncate">{f.title ?? f.storage_path}</button>
                        <span className="text-xs text-(--zaire-text-muted)">{TECHNICIAN_FILE_CATEGORY_LABELS[f.category ?? "otro"]}</span>
                        <button onClick={() => deleteFile(f)} className="text-red-600 dark:text-red-300 hover:text-red-700 dark:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* DOCUMENTOS (con vencimiento) */}
            <TabsContent value="documentos" className="mt-4">
              <div className="zaire-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-(--zaire-text)">Documentos con vencimiento</h3>
                  <Link href={ROUTES.field.documentos} className="text-xs text-zaire-blue hover:underline">Gestionar en Documentos →</Link>
                </div>
                {documents.length === 0 ? (
                  <p className="text-sm text-(--zaire-text-muted) py-2">Sin documentos cargados. Cargalos desde la sección Documentos.</p>
                ) : (
                  <ul className="divide-y divide-(--zaire-border)">
                    {documents.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 py-2.5">
                        <StatusDot status={d.expiry_light} size="sm" pulse={d.expiry_light === "red"} />
                        <span className="flex-1 text-sm text-(--zaire-text)">{d.doc_type ? DOC_TYPE_LABELS[d.doc_type as DocType] : "Documento"}</span>
                        <span className="text-xs text-(--zaire-text-muted)">{formatDate(d.expires_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* HISTORIAL */}
            <TabsContent value="historial" className="mt-4">
              <div className="zaire-card p-5">
                <h3 className="text-sm font-semibold text-(--zaire-text) mb-3 flex items-center gap-2"><History className="w-4 h-4 text-zaire-blue" /> Historial</h3>
                {log.length === 0 ? (
                  <p className="text-sm text-(--zaire-text-muted) py-2">Sin eventos registrados.</p>
                ) : (
                  <ul className="space-y-2">
                    {log.map((l) => (
                      <li key={l.id} className="text-sm">
                        <span className="text-(--zaire-text)">{l.description ?? l.action}</span>
                        <span className="text-xs text-(--zaire-text-muted)"> · {l.user_name ?? "Sistema"} · {formatDateTime(l.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Alta de contacto */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo contacto</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={contactForm.kind} onValueChange={(v) => setContactForm((f) => ({ ...f, kind: v ?? "telefono" }))}>
                  <SelectTrigger><SelectValue>{CONTACT_KIND_LABELS[contactForm.kind]}</SelectValue></SelectTrigger>
                  <SelectContent>{CONTACT_KINDS.map((k) => (<SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Etiqueta</Label><Input value={contactForm.label} onChange={(e) => setContactForm((f) => ({ ...f, label: e.target.value }))} placeholder="Personal, familiar..." /></div>
            </div>
            <div className="space-y-1.5"><Label>Valor *</Label><Input value={contactForm.value} onChange={(e) => setContactForm((f) => ({ ...f, value: e.target.value }))} placeholder="Teléfono / email / dirección" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setContactOpen(false)}>Cancelar</Button>
              <Button onClick={addContact} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
      <span className="text-(--zaire-text-muted) w-20 shrink-0">{label}</span>
      <span className="text-(--zaire-text) font-medium truncate">{value}</span>
    </div>
  );
}
