// page.tsx — src/app/(dashboard)/field/unidades/page.tsx — 2026-07-13
// Zaire Field — ABM de unidades/vehículos.

import { getVehicles, getTechnicians } from "@/lib/field/queries";
import { VehiclesTable } from "@/components/field/vehicles-table";

export const dynamic = "force-dynamic";

export default async function UnidadesPage() {
  const [vehicles, technicians] = await Promise.all([getVehicles(true), getTechnicians(true)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--sas-text)">Unidades</h1>
        <p className="text-sm text-(--sas-text-muted) mt-0.5">
          {vehicles.length} unidades registradas
        </p>
      </div>
      <VehiclesTable initialVehicles={vehicles} technicians={technicians} />
    </div>
  );
}
