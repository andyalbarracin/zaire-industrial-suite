// page.tsx — src/app/(dashboard)/configuracion/page.tsx
// Página de configuración (solo administradores)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import type { Profile, CompanySettings } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const profile = profileRaw as Pick<Profile, "role"> | null;
  if (profile?.role !== "admin") redirect("/");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: settingsRaw }, { data: usersRaw }] = await Promise.all([
    sb.from("company_settings").select("id, nombre, cuit, direccion, ciudad, telefono, email, web, logo_url, logo_use_in_pdfs, updated_at, updated_by").eq("id", 1).single(),
    supabase.from("profiles").select("id, full_name, email, role, created_at").order("full_name"),
  ]);

  const settings = settingsRaw as CompanySettings | null;
  const users = usersRaw as Pick<Profile, "id" | "full_name" | "email" | "role" | "created_at">[] | null;

  // Fallback si aún no existe la fila en company_settings
  const settingsFallback: CompanySettings = settings ?? {
    id: 1,
    nombre: "Empresa Demo S.A.",
    cuit: "30-00000000-0",
    direccion: "Dirección 1234",
    ciudad: "Buenos Aires, Argentina",
    telefono: "+54 11 0000-0000",
    email: "demo@empresa.com",
    web: "www.empresa.com",
    logo_url: null,
    logo_use_in_pdfs: false,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--sas-text)">Configuración</h1>
        <p className="text-sm text-(--sas-text-muted) mt-0.5">Solo visible para administradores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos editables de la empresa */}
        <div className="sas-card p-6">
          <h2 className="font-semibold text-(--sas-text) mb-5">Información de la empresa</h2>
          <CompanySettingsForm settings={settingsFallback} />
        </div>

        {/* Usuarios */}
        <div className="sas-card p-6">
          <h2 className="font-semibold text-(--sas-text) mb-4">Usuarios del sistema</h2>
          <div className="space-y-3">
            {users?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-(--sas-border) last:border-0">
                <div className="w-8 h-8 rounded-full bg-sas-blue flex items-center justify-center text-white text-xs font-bold">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{u.full_name}</p>
                  <p className="text-xs text-(--sas-text-muted)">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  u.role === "admin" ? "bg-sas-navy text-white" :
                  u.role === "operator" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {u.role === "admin" ? "Admin" : u.role === "operator" ? "Operador" : "Visualizador"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright footer — modificar texto aquí si es necesario */}
      <p className="text-xs text-slate-400 text-center pt-2 pb-1">
        Zaire Trace 2026 V1.0 &mdash; Desarrollado por Zaire Tech &mdash; Todos los derechos reservados
      </p>
    </div>
  );
}
