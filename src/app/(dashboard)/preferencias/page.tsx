// page.tsx — src/app/(dashboard)/preferencias/page.tsx — 2026-08-02
// Preferencias del usuario: apariencia (tema + modo). Además, "Identidad de la app" solo para admin.

import { createClient } from "@/lib/supabase/server";
import { ThemePreferences } from "@/components/settings/theme-preferences";
import { AppIdentitySettings } from "@/components/settings/app-identity-settings";
import type { CompanySettings, Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function PreferenciasPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profileRaw }, { data: settingsRaw }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").single(),
    sb.from("company_settings").select("app_logo_url, app_title, app_subtitle, nombre").eq("id", 1).single(),
  ]);

  const isAdmin = (profileRaw as Pick<Profile, "role"> | null)?.role === "admin";
  const identity = (settingsRaw as Pick<CompanySettings, "app_logo_url" | "app_title" | "app_subtitle" | "nombre"> | null)
    ?? { app_logo_url: null, app_title: null, app_subtitle: null, nombre: "Empresa" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Preferencias</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Apariencia de la interfaz · se guarda en este dispositivo</p>
      </div>

      {/* Cards responsivas: lado a lado cuando hay espacio (lg), apiladas en pantallas chicas. */}
      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="zaire-card p-6">
            <ThemePreferences />
          </div>
          {/* Identidad de la app — solo administradores (config de empresa, se guarda en la base) */}
          <div className="zaire-card p-6">
            <h2 className="font-semibold text-(--zaire-text)">Identidad de la app</h2>
            <p className="text-sm text-(--zaire-text-muted) mt-0.5 mb-5">Logo, título y subtítulo del sistema (sidebar de la app) · solo administradores</p>
            <AppIdentitySettings settings={identity} />
          </div>
        </div>
      ) : (
        <div className="zaire-card p-6 max-w-2xl">
          <ThemePreferences />
        </div>
      )}
    </div>
  );
}
