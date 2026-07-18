// page.tsx — src/app/(dashboard)/preferencias/page.tsx — 2026-07-18
// Preferencias del usuario: apariencia (tema + modo claro/oscuro). Accesible a todos los roles.

import { ThemePreferences } from "@/components/settings/theme-preferences";

export default function PreferenciasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Preferencias</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Apariencia de la interfaz · se guarda en este dispositivo</p>
      </div>

      <div className="zaire-card p-6 max-w-2xl">
        <ThemePreferences />
      </div>
    </div>
  );
}
