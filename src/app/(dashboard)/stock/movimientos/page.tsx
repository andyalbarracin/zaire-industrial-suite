// page.tsx — src/app/(dashboard)/stock/movimientos/page.tsx — 2026-07-18
// Movimientos de stock: lista + alta (entrada/salida/ajuste/transferencia vía RPC).

import { createClient } from "@/lib/supabase/server";
import { getStockMovements, getWarehouses, getStockLevels } from "@/lib/stock/queries";
import { MovementsView } from "@/components/stock/movements-view";
import type { Product } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function MovimientosPage() {
  const supabase = await createClient();
  const [{ data: products }, movements, warehouses, levels] = await Promise.all([
    supabase.from("products").select("id, code, name, description, category, brand, model, unit, default_currency, default_unit_price, is_active, notes, created_at, updated_at").eq("is_active", true).order("name"),
    getStockMovements(200),
    getWarehouses(),
    getStockLevels(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Movimientos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Entradas, salidas, ajustes y transferencias (ledger auditable)</p>
      </div>
      <MovementsView movements={movements} products={(products ?? []) as Product[]} warehouses={warehouses} levels={levels} />
    </div>
  );
}
