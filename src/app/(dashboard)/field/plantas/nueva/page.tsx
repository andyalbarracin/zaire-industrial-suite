// page.tsx — src/app/(dashboard)/field/plantas/nueva/page.tsx — 2026-07-22
// Zaire Field — alta de planta/sitio (página; reemplaza al modal para dar más espacio).

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteFormPage } from "@/components/field/site-form-page";
import { ROUTES } from "@/lib/routes";
import type { Client } from "@/lib/field/types";

export const dynamic = "force-dynamic";

export default async function NuevaPlantaPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at")
    .eq("is_active", true)
    .order("business_name");

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.field.plantas} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver a plantas
        </Link>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Nueva Planta</h1>
      </div>
      <SiteFormPage clients={(clients ?? []) as Client[]} />
    </div>
  );
}
