// page.tsx — src/app/(dashboard)/field/tecnicos/page.tsx — 2026-07-13
// Zaire Field — ABM de técnicos de campo.

import { getTechnicians } from "@/lib/field/queries";
import { TechniciansTable } from "@/components/field/technicians-table";

export const dynamic = "force-dynamic";

export default async function TecnicosPage() {
  const technicians = await getTechnicians(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Técnicos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {technicians.length} técnicos registrados
        </p>
      </div>
      <TechniciansTable initialTechnicians={technicians} />
    </div>
  );
}
