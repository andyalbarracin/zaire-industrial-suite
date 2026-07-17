"use client";
// crm-attachments.tsx — src/components/crm/crm-attachments.tsx — 2026-07-17
// Adjuntos de una entidad CRM (lead/contact/client/opportunity). Bucket privado
// 'crm-adjuntos' (signed URLs para descargar), tabla crm_attachments (soft-delete).
// Espeja components/trace/order-attachments.tsx.

import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import type { CrmAttachment, CrmAttachmentEntity } from "@/lib/crm/types";

const BUCKET = "crm-adjuntos";

const CATEGORIES = [
  { value: "documento", label: "Documento" },
  { value: "foto", label: "Foto" },
  { value: "presupuesto", label: "Presupuesto" },
  { value: "contrato", label: "Contrato" },
  { value: "otro", label: "Otro" },
] as const;
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

interface CrmAttachmentsProps {
  entityType: CrmAttachmentEntity;
  entityId: string;
  initialAttachments: CrmAttachment[];
  currentProfile: { id: string } | null;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CrmAttachments({ entityType, entityId, initialAttachments, currentProfile }: CrmAttachmentsProps) {
  const [attachments, setAttachments] = useState<CrmAttachment[]>(initialAttachments);
  const [category, setCategory] = useState("documento");
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<CrmAttachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "dat";
    const path = `${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (upErr) { toast.error("Error al subir el archivo"); setUploading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from("crm_attachments")
      .insert({
        entity_type: entityType, entity_id: entityId, category,
        file_name: file.name, storage_path: path, file_type: file.type || null,
        size_bytes: file.size, uploaded_by: currentProfile?.id ?? null,
      })
      .select("id, entity_type, entity_id, category, file_name, storage_path, file_type, size_bytes, notes, uploaded_by, created_at, deleted_at")
      .single();

    if (error || !data) {
      toast.error("Error al registrar el adjunto");
      await supabase.storage.from(BUCKET).remove([path]);
      setUploading(false);
      return;
    }
    setAttachments((prev) => [data as CrmAttachment, ...prev]);
    toast.success("Adjunto subido");
    setUploading(false);
  }

  async function handleDownload(a: CrmAttachment) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 60);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from("crm_attachments").update({ deleted_at: new Date().toISOString() }).eq("id", toDelete.id);
    await supabase.storage.from(BUCKET).remove([toDelete.storage_path]);
    setAttachments((prev) => prev.filter((x) => x.id !== toDelete.id));
    toast.success("Adjunto eliminado");
    setDeleting(false);
    setToDelete(null);
  }

  return (
    <div className="zaire-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-4 h-4 text-zaire-blue shrink-0" />
        <h3 className="text-sm font-semibold text-(--zaire-text)">Archivos</h3>
        <span className="text-xs text-(--zaire-text-muted)">({attachments.length})</span>
      </div>

      {attachments.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-(--zaire-border) bg-white px-2.5 py-1.5">
              <FileText className="w-3.5 h-3.5 text-(--zaire-text-muted) shrink-0" />
              <button type="button" onClick={() => handleDownload(a)} className="text-sm text-zaire-blue hover:underline truncate text-left flex-1" title={a.file_name}>
                {a.file_name}
              </button>
              <span className="text-[10px] font-medium text-(--zaire-text-muted) bg-slate-100 border border-(--zaire-border) rounded px-1.5 py-0.5 shrink-0">{CAT_LABEL[a.category] ?? a.category}</span>
              <span className="text-[10px] text-(--zaire-text-muted) shrink-0 tabular-nums w-14 text-right">{fmtSize(a.size_bytes)}</span>
              <button type="button" onClick={() => handleDownload(a)} title="Descargar" className="text-(--zaire-text-muted) hover:text-zaire-blue"><Download className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => setToDelete(a)} title="Eliminar" className="text-(--zaire-text-muted) hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label className={cn("inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors", uploading ? "bg-slate-100 text-(--zaire-text-muted)" : "bg-zaire-navy-mid text-white hover:bg-zaire-navy")}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Subir archivo
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title="Eliminar adjunto"
        description={toDelete ? `Se eliminará "${toDelete.file_name}". El archivo se borra del almacenamiento y no puede recuperarse.` : ""}
        confirmLabel="Sí, eliminar"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
