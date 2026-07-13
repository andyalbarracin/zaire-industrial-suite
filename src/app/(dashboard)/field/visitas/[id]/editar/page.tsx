// page.tsx — src/app/(dashboard)/field/visitas/[id]/editar/page.tsx — 2026-07-13
// Zaire Field — edición de visita.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getVisit, getVisitFormData, getCurrentUserProfile } from "@/lib/field/queries";
import { VisitForm } from "@/components/field/visit-form";

export const dynamic = "force-dynamic";

export default async function EditarVisitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [visit, formData, currentUser] = await Promise.all([
    getVisit(id),
    getVisitFormData(),
    getCurrentUserProfile(),
  ]);

  if (!visit) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/field/visitas/${id}`} className="inline-flex items-center gap-1 text-sm text-(--sas-text-muted) hover:text-sas-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver al detalle
        </Link>
        <h1 className="text-2xl font-bold text-(--sas-text)">Editar {visit.visit_number ?? "Visita"}</h1>
      </div>
      <VisitForm
        visit={visit}
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
