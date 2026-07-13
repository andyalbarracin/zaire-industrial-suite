// page.tsx — src/app/(dashboard)/field/visitas/nueva/page.tsx — 2026-07-13
// Zaire Field — alta de visita.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getVisitFormData, getCurrentUserProfile } from "@/lib/field/queries";
import { VisitForm } from "@/components/field/visit-form";

export const dynamic = "force-dynamic";

export default async function NuevaVisitaPage() {
  const [formData, currentUser] = await Promise.all([getVisitFormData(), getCurrentUserProfile()]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/field/visitas" className="inline-flex items-center gap-1 text-sm text-(--sas-text-muted) hover:text-sas-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver a visitas
        </Link>
        <h1 className="text-2xl font-bold text-(--sas-text)">Nueva Visita</h1>
      </div>
      <VisitForm
        technicians={formData.technicians}
        vehicles={formData.vehicles}
        sites={formData.sites}
        clients={formData.clients}
        workOrders={formData.workOrders}
        currentUser={currentUser}
      />
    </div>
  );
}
