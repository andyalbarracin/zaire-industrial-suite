// page.tsx — src/app/(dashboard)/field/visitas/page.tsx — 2026-07-13
// Zaire Field — lista de visitas.

import { getVisits, VISITS_LIMIT } from "@/lib/field/queries";
import { VisitsTable } from "@/components/field/visits-table";
import { LimitNotice } from "@/components/shared/limit-notice";

export const dynamic = "force-dynamic";

export default async function VisitasPage() {
  const visits = await getVisits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Visitas</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{visits.length} visitas registradas</p>
      </div>
      <LimitNotice count={visits.length} limit={VISITS_LIMIT} />
      <VisitsTable initialVisits={visits} />
    </div>
  );
}
