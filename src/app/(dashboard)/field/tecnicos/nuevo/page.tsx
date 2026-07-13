// page.tsx — src/app/(dashboard)/field/tecnicos/nuevo/page.tsx — 2026-07-13
// Zaire Field — alta de técnico (página).

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/field/queries";
import { TechnicianFormPage } from "@/components/field/technician-form-page";

export const dynamic = "force-dynamic";

export default async function NuevoTecnicoPage() {
  const currentUser = await getCurrentUserProfile();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/field/tecnicos" className="inline-flex items-center gap-1 text-sm text-(--sas-text-muted) hover:text-sas-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver a técnicos
        </Link>
        <h1 className="text-2xl font-bold text-(--sas-text)">Nuevo Técnico</h1>
      </div>
      <TechnicianFormPage currentUser={currentUser} />
    </div>
  );
}
