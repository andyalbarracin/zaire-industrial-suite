// page.tsx — src/app/(dashboard)/field/plantas/page.tsx — 2026-07-13
// Zaire Field — ABM de plantas/sitios con geocerca.

import { getSites } from "@/lib/field/queries";
import { SitesTable } from "@/components/field/sites-table";

export const dynamic = "force-dynamic";

export default async function PlantasPage() {
  const sites = await getSites(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Plantas</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {sites.length} plantas / sitios registrados
        </p>
      </div>
      <SitesTable initialSites={sites} />
    </div>
  );
}
