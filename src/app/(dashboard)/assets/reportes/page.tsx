// page.tsx — src/app/(dashboard)/assets/reportes/page.tsx — 2026-07-20
// Zaire Assets — Reportes: flota, costo/TCO, confiabilidad y riesgo. Export XLS/CSV/PDF.

import { getAssets, getAllAssetEvents } from "@/lib/assets/queries";
import { ASSET_EVENTS_LIMIT } from "@/lib/assets/constants";
import { AssetReportsView } from "@/components/assets/asset-reports-view";
import { LimitNotice } from "@/components/shared/limit-notice";

export const dynamic = "force-dynamic";

export default async function AssetsReportsPage() {
  const [assets, events] = await Promise.all([getAssets(), getAllAssetEvents()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reportes Assets</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Flota, costo de ciclo de vida (TCO), confiabilidad y riesgo · export XLS/CSV/PDF</p>
      </div>
      {/* El TCO y el top de fallas se calculan sobre los eventos cargados: si se alcanzó el
          tope, hay que decirlo en lugar de mostrar números incompletos como si fueran todos. */}
      <LimitNotice count={events.length} limit={ASSET_EVENTS_LIMIT} />
      <AssetReportsView assets={assets} events={events} />
    </div>
  );
}
