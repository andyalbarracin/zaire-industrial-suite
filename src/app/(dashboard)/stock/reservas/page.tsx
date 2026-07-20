// page.tsx — src/app/(dashboard)/stock/reservas/page.tsx — 2026-07-18
// Reservas de stock: activas/consumidas/liberadas; crear, liberar, consumir.

import { createClient } from "@/lib/supabase/server";
import { getReservations, getWarehouses, getStockLevels } from "@/lib/stock/queries";
import { ReservationsView } from "@/components/stock/reservations-view";
import type { Product } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const supabase = await createClient();
  const [{ data: products }, reservations, warehouses, levels] = await Promise.all([
    supabase.from("products").select("id, code, name, description, category, brand, model, unit, default_currency, default_unit_price, is_active, notes, created_at, updated_at").eq("is_active", true).order("name"),
    getReservations(),
    getWarehouses(),
    getStockLevels(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Reservas</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Stock reservado para OT/cotizaciones/visitas</p>
      </div>
      <ReservationsView reservations={reservations} products={(products ?? []) as Product[]} warehouses={warehouses} levels={levels} />
    </div>
  );
}
