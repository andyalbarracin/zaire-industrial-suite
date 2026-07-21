// page.tsx — src/app/(dashboard)/assets/reportes/page.tsx — 2026-07-20
// Zaire Assets — Reportes: flota, costo/TCO, confiabilidad y riesgo. Export XLS/CSV/PDF.

import { getAssets, getAllAssetEvents } from "@/lib/assets/queries";
import { AssetReportsView } from "@/components/assets/asset-reports-view";

export const dynamic = "force-dynamic";

export default async function AssetsReportsPage() {
  const [assets, events] = await Promise.all([getAssets(), getAllAssetEvents()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reportes Assets</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Flota, costo de ciclo de vida (TCO), confiabilidad y riesgo · export XLS/CSV/PDF</p>
      </div>
      <AssetReportsView assets={assets} events={events} />
    </div>
  );
}
