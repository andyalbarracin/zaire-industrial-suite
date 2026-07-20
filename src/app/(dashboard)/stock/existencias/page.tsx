// page.tsx — src/app/(dashboard)/stock/existencias/page.tsx — 2026-07-18
// Existencias: stock por producto y depósito (WAC, disponible, semáforo de mínimo).

import { getStockLevels, getWarehouses } from "@/lib/stock/queries";
import { StockLevelsTable } from "@/components/stock/stock-levels-table";

export const dynamic = "force-dynamic";

export default async function ExistenciasPage() {
  const [levels, warehouses] = await Promise.all([getStockLevels(), getWarehouses()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Existencias</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{levels.length} líneas de stock · valuación WAC</p>
      </div>
      <StockLevelsTable levels={levels} warehouses={warehouses} />
    </div>
  );
}
