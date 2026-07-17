// page.tsx — src/app/(dashboard)/field/tecnicos/[id]/editar/page.tsx — 2026-07-13
// Zaire Field — edición de técnico (página).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTechnician, getCurrentUserProfile } from "@/lib/field/queries";
import { TechnicianFormPage } from "@/components/field/technician-form-page";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function EditarTecnicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [technician, currentUser] = await Promise.all([getTechnician(id), getCurrentUserProfile()]);
  if (!technician) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.field.tecnico(id)} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver a la ficha
        </Link>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Editar {technician.full_name}</h1>
      </div>
      <TechnicianFormPage technician={technician} currentUser={currentUser} />
    </div>
  );
}
