// page.tsx — src/app/(dashboard)/stock/reportes/page.tsx — 2026-07-18
// Reportes de Stock: valuación, bajo mínimo, movimientos, consumo. Export XLS/CSV/PDF.

import { getStockLevels, getStockMovements } from "@/lib/stock/queries";
import { StockReportsView } from "@/components/stock/stock-reports-view";

export const dynamic = "force-dynamic";

export default async function StockReportesPage() {
  const [levels, movements] = await Promise.all([getStockLevels(), getStockMovements(500)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reportes Stock</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Valuación (WAC), bajo mínimo, movimientos y consumo</p>
      </div>
      <StockReportsView levels={levels} movements={movements} />
    </div>
  );
}
