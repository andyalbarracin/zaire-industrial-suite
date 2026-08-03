"use client";
// app-identity-settings.tsx — src/components/settings/app-identity-settings.tsx — 2026-08-02
// Identidad de la app (logo/título/subtítulo del sidebar y login). Solo admin.
// Distinto del logo de PDF (company_settings.logo_url): se guarda en app_logo_url + app_title + app_subtitle.
// El logo se sube al bucket público "logos" con path propio (app-logo.*), sin pisar el logo de PDF.

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanySettings } from "@/lib/types/database";

interface AppIdentitySettingsProps {
  settings: Pick<CompanySettings, "app_logo_url" | "app_title" | "app_subtitle" | "nombre">;
}

export function AppIdentitySettings({ settings }: AppIdentitySettingsProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(settings.app_logo_url);
  const [title, setTitle] = useState(settings.app_title ?? "");
  const [subtitle, setSubtitle] = useState(settings.app_subtitle ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { toast.error("El archivo no puede superar los 30 MB"); return; }
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) { toast.error("Formato no soportado. Usá PNG, JPG, SVG o WEBP"); return; }

    setUploading(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const ext = file.name.split(".").pop();
      // Path propio para NO pisar el logo de PDF (logo.*)
      const path = `app-logo.${ext}`;
      const { error } = await sb.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = sb.storage.from("logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setLogoUrl(publicUrl);
      toast.success("Logo de la app subido correctamente");
    } catch {
      toast.error("Error al subir el logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await sb.from("company_settings").update({
        app_logo_url: logoUrl,
        app_title: title.trim() || null,
        app_subtitle: subtitle.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }).eq("id", 1);
      if (error) throw error;
      toast.success("Identidad de la app guardada");
      router.refresh();
    } catch {
      toast.error("Error al guardar la identidad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Logo de la app */}
      <div className="space-y-2">
        <Label>Logo de la app</Label>
        {logoUrl ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo de la app" className="h-16 max-w-52 object-contain border border-(--zaire-border) rounded-lg p-2 bg-panel" />
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Quitar logo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-52 h-16 border-2 border-dashed border-(--zaire-border) rounded-lg flex items-center justify-center bg-subtle">
            <div className="text-center">
              <ImageIcon className="w-5 h-5 text-(--zaire-text-muted) mx-auto mb-0.5" />
              <p className="text-xs text-(--zaire-text-muted)">Sin logo (usa el de Zaire)</p>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Subiendo...</>) : (<><Upload className="w-3.5 h-3.5 mr-1.5" /> {logoUrl ? "Reemplazar" : "Subir logo"}</>)}
        </Button>
        <p className="text-xs text-(--zaire-text-muted)">PNG, JPG, SVG o WEBP · máx. 30 MB · ideal fondo transparente. Es independiente del logo de los PDF (se configura en Gestión).</p>
      </div>

      {/* Título y subtítulo */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Zaire" />
        </div>
        <div className="space-y-1.5">
          <Label>Subtítulo</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={settings.nombre || "Suite Industrial"} />
        </div>
      </div>
      <p className="text-xs text-(--zaire-text-muted)">Si dejás estos campos vacíos, la app usa el logo e identidad de Zaire por defecto.</p>

      <div className="flex justify-end pt-2 border-t border-(--zaire-border)">
        <Button type="button" onClick={handleSave} disabled={saving} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar identidad
        </Button>
      </div>
    </div>
  );
}
