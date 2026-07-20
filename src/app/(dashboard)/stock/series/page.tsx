// page.tsx — src/app/(dashboard)/stock/series/page.tsx — 2026-07-18
// Series / Lotes: trazabilidad por unidad serializada.

import { getSerials } from "@/lib/stock/queries";
import { SeriesView } from "@/components/stock/series-view";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const serials = await getSerials();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Series / Lotes</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{serials.length} unidad(es) serializada(s)</p>
      </div>
      <SeriesView serials={serials} />
    </div>
  );
}
