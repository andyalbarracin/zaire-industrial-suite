// page.tsx — src/app/(dashboard)/stock/depositos/page.tsx — 2026-07-18
// ABM de depósitos (empresa + unidad móvil de Field). Los vehículos solo se ofrecen si Field está habilitado.

import { createClient } from "@/lib/supabase/server";
import { getWarehouses } from "@/lib/stock/queries";
import { isModuleEnabled } from "@/lib/modules";
import { WarehousesTable } from "@/components/stock/warehouses-table";

export const dynamic = "force-dynamic";

export default async function DepositosPage() {
  const warehouses = await getWarehouses(true); // incluye inactivos para el ABM

  let vehicles: { id: string; label: string }[] = [];
  if (isModuleEnabled("field")) {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb.from("field_vehicles").select("id, plate, brand, model").is("deleted_at", null).order("plate");
    vehicles = (data ?? []).map((v: { id: string; plate: string; brand: string | null; model: string | null }) => ({
      id: v.id,
      label: `${v.plate}${v.brand ? ` · ${v.brand}${v.model ? ` ${v.model}` : ""}` : ""}`,
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Depósitos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Depósitos de empresa y unidades móviles</p>
      </div>
      <WarehousesTable initialWarehouses={warehouses} vehicles={vehicles} />
    </div>
  );
}
