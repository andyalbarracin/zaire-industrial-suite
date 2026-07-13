"use client";
// visit-photos-section.tsx — src/components/field/visit-photos-section.tsx — 2026-07-13
// Galería de fotos de la visita: sube a bucket field-photos y registra en field_visit_photos.

import { useRef, useState } from "react";
import { Loader2, Camera, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { FieldVisitPhoto } from "@/lib/field/types";

const BUCKET = "field-photos";

interface VisitPhotosSectionProps {
  visitId: string;
  initialPhotos: FieldVisitPhoto[];
}

export function VisitPhotosSection({ visitId, initialPhotos }: VisitPhotosSectionProps) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<FieldVisitPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function publicUrl(path: string): string {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      // eslint-disable-next-line react-hooks/purity
      const path = `${visitId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) { toast.error(`Error al subir ${file.name}`); continue; }
      const { data: created, error } = await sb
        .from("field_visit_photos")
        .insert({ visit_id: visitId, storage_path: path, caption: file.name })
        .select()
        .single();
      if (error) { toast.error("Error al registrar la foto"); continue; }
      setPhotos((prev) => [created as FieldVisitPhoto, ...prev]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    toast.success("Fotos subidas");
  }

  async function handleDelete(photo: FieldVisitPhoto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    const { error } = await sb.from("field_visit_photos").delete().eq("id", photo.id);
    if (error) { toast.error("Error al eliminar la foto"); return; }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    toast.success("Foto eliminada");
  }

  return (
    <div className="sas-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-(--sas-text) uppercase tracking-wide flex items-center gap-2">
          <Camera className="w-4 h-4 text-sas-blue" /> Fotos
        </h2>
        <>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Button size="sm" variant="outline" className="h-8" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Subir
          </Button>
        </>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-(--sas-text-muted) py-4 text-center">Sin fotos cargadas.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-(--sas-border)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl(p.storage_path)} alt={p.caption ?? "Foto"} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(p)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-md p-1 text-red-600 hover:bg-white"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
