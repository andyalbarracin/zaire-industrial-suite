// page.tsx — src/app/(dashboard)/page.tsx — 2026-07-16
// Entrada de la suite: redirige al dashboard del primer módulo habilitado (Trace o Field).
// El dashboard unificado de la suite queda pendiente (ver roadmap).

import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getEnabledModules } from "@/lib/modules";

export default function Home() {
  const first = getEnabledModules()[0];
  redirect(
    first === "field"
      ? ROUTES.field.home
      : first === "crm"
        ? ROUTES.crm.dashboard
        : ROUTES.trace.dashboard
  );
}
