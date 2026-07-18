"use client";
// company-settings-form.tsx — Formulario editable de datos de empresa + logo
// Solo accesible para administradores

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CompanySettings } from "@/lib/types/database";

interface CompanySettingsFormProps {
  settings: CompanySettings;
}

export function CompanySettingsForm({ settings }: CompanySettingsFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: settings.nombre,
    cuit: settings.cuit ?? "",
    direccion: settings.direccion ?? "",
    ciudad: settings.ciudad ?? "",
    telefono: settings.telefono ?? "",
    email: settings.email ?? "",
    web: settings.web ?? "",
    logo_use_in_pdfs: settings.logo_use_in_pdfs,
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 30 MB");
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no soportado. Usá PNG, JPG, SVG o WEBP");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;

      const { error } = await sb.storage.from("logos").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      if (error) throw error;

      const { data: urlData } = sb.storage.from("logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      setLogoUrl(publicUrl);
      setLogoPreview(publicUrl);
      toast.success("Logo subido correctamente");
    } catch {
      toast.error("Error al subir el logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoUrl(null);
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logo_use_in_pdfs: false }));
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await sb.from("company_settings").update({
        nombre: form.nombre.trim(),
        cuit: form.cuit.trim() || null,
        direccion: form.direccion.trim() || null,
        ciudad: form.ciudad.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        web: form.web.trim() || null,
        logo_url: logoUrl,
        logo_use_in_pdfs: form.logo_use_in_pdfs,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }).eq("id", 1);

      if (error) throw error;

      toast.success("Configuración guardada");
      router.refresh();
    } catch {
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Datos de empresa */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label>Nombre de la empresa *</Label>
          <Input
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            placeholder="Empresa S.A."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>CUIT</Label>
            <Input
              value={form.cuit}
              onChange={(e) => handleChange("cuit", e.target.value)}
              placeholder="30-00000000-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input
              value={form.telefono}
              onChange={(e) => handleChange("telefono", e.target.value)}
              placeholder="+54 11 0000-0000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Dirección</Label>
          <Input
            value={form.direccion}
            onChange={(e) => handleChange("direccion", e.target.value)}
            placeholder="Av. Ejemplo 1234"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ciudad / País</Label>
            <Input
              value={form.ciudad}
              onChange={(e) => handleChange("ciudad", e.target.value)}
              placeholder="Buenos Aires, Argentina"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Web</Label>
            <Input
              value={form.web}
              onChange={(e) => handleChange("web", e.target.value)}
              placeholder="www.empresa.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Email de contacto</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="info@empresa.com"
          />
        </div>
      </div>

      {/* Separador */}
      <div className="border-t border-(--zaire-border) pt-5">
        <h3 className="font-medium text-(--zaire-text) mb-4">Logo para informes y PDFs</h3>

        {/* Preview del logo */}
        {logoPreview ? (
          <div className="relative w-fit mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreview}
              alt="Logo actual"
              className="h-20 max-w-60 object-contain border border-(--zaire-border) rounded-lg p-2 bg-panel"
            />
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Eliminar logo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-60 h-20 border-2 border-dashed border-(--zaire-border) rounded-lg flex items-center justify-center mb-4 bg-subtle">
            <div className="text-center">
              <ImageIcon className="w-6 h-6 text-(--zaire-text-muted) mx-auto mb-1" />
              <p className="text-xs text-(--zaire-text-muted)">Sin logo</p>
            </div>
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mb-3"
        >
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Subiendo...</>
          ) : (
            <><Upload className="w-3.5 h-3.5 mr-1.5" /> {logoPreview ? "Reemplazar logo" : "Subir logo"}</>
          )}
        </Button>
        <p className="text-xs text-(--zaire-text-muted) mb-4">
          Formatos: PNG, JPG, SVG, WEBP · Tamaño máximo: 30 MB · Recomendado: fondo transparente, mínimo 300px de ancho
        </p>

        {/* Switch logo en PDFs */}
        <div className="flex items-center gap-3">
          <Switch
            id="logo_use_in_pdfs"
            checked={form.logo_use_in_pdfs}
            disabled={!logoPreview}
            onCheckedChange={(v) => handleChange("logo_use_in_pdfs", v)}
          />
          <Label htmlFor="logo_use_in_pdfs" className={!logoPreview ? "text-(--zaire-text-muted)" : ""}>
            Usar este logo en informes y PDFs exportados
          </Label>
        </div>
        {!logoPreview && (
          <p className="text-xs text-(--zaire-text-muted) mt-1 ml-13">
            Subí un logo para habilitar esta opción
          </p>
        )}
      </div>

      {/* Guardar */}
      <div className="flex justify-end pt-2 border-t border-(--zaire-border)">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-zaire-navy-mid hover:bg-zaire-navy text-white"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
