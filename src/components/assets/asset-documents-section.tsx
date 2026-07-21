"use client";
// asset-documents-section.tsx — src/components/assets/asset-documents-section.tsx — 2026-07-20
// Documentos/garantías del equipo: bucket privado 'asset-docs' (signed URLs), tabla asset_documents
// (soft-delete) con vencimiento (semáforo). Espeja crm-attachments.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/shared/status-dot";
import { logAssetAudit } from "@/lib/assets/audit";
import { formatDate, cn } from "@/lib/utils";
import type { AssetDocument } from "@/lib/assets/types";

const BUCKET = "asset-docs";
const DOC_TYPES = [
  { value: "manual", label: "Manual" }, { value: "certificado", label: "Certificado" },
  { value: "plano", label: "Plano" }, { value: "garantia", label: "Garantía" }, { value: "otro", label: "Otro" },
];

export function AssetDocumentsSection({ assetId, documents }: { assetId: string; documents: AssetDocument[] }) {
  const router = useRouter();
  const [docType, setDocType] = useState("manual");
  const [expiresAt, setExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "dat";
    const path = `assets/${assetId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (upErr) { toast.error("Error al subir el archivo"); setUploading(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await sb.from("asset_documents").insert({
      asset_id: assetId, doc_type: docType, name: file.name, file_path: path,
      expires_at: expiresAt || null, created_by: user?.id ?? null,
    });
    if (error) { toast.error("Error al registrar el documento"); await supabase.storage.from(BUCKET).remove([path]); setUploading(false); return; }
    logAssetAudit("asset", assetId, "document", `Documento ${file.name} subido`);
    toast.success("Documento subido");
    setExpiresAt(""); setUploading(false);
    router.refresh();
  }

  async function download(d: AssetDocument) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 60);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(d: AssetDocument) {
    setBusyId(d.id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from("asset_documents").update({ deleted_at: new Date().toISOString() }).eq("id", d.id);
    await supabase.storage.from(BUCKET).remove([d.file_path]);
    setBusyId(null);
    toast.success("Documento eliminado");
    router.refresh();
  }

  return (
    <div className="zaire-card p-5">
      <h3 className="text-sm font-semibold text-(--zaire-text) mb-3">Documentos / Garantías</h3>

      {documents.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {documents.map((d) => {
            const days = d.expires_at ? Math.round((new Date(d.expires_at).getTime() - Date.now()) / 86_400_000) : null;
            const light = days == null ? null : days < 0 ? "red" : days <= 30 ? "yellow" : "green";
            return (
              <li key={d.id} className="flex items-center gap-2 rounded-lg border border-(--zaire-border) bg-panel px-2.5 py-1.5">
                <FileText className="w-3.5 h-3.5 text-(--zaire-text-muted) shrink-0" />
                <button type="button" onClick={() => download(d)} className="text-sm text-zaire-blue hover:underline truncate text-left flex-1" title={d.name ?? ""}>{d.name ?? "Documento"}</button>
                <span className="text-[10px] font-medium text-(--zaire-text-muted) bg-subtle-2 border border-(--zaire-border) rounded px-1.5 py-0.5 shrink-0">{d.doc_type ?? "otro"}</span>
                {d.expires_at && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-(--zaire-text-muted) shrink-0">
                    {light && <StatusDot status={light} size="sm" pulse={light === "red"} />}{formatDate(d.expires_at)}
                  </span>
                )}
                <button type="button" onClick={() => download(d)} title="Descargar" className="text-(--zaire-text-muted) hover:text-zaire-blue"><Download className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => remove(d)} disabled={busyId === d.id} title="Eliminar" className="text-(--zaire-text-muted) hover:text-red-600 dark:hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-9 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring">
          {DOC_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9 w-40" title="Vencimiento (opcional)" />
        <label className={cn("inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors", uploading ? "bg-subtle-2 text-(--zaire-text-muted)" : "bg-zaire-navy-mid text-white hover:bg-zaire-navy")}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Subir
          <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}
