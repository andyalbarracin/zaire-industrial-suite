// page.tsx — src/app/(dashboard)/field/unidades/[id]/page.tsx — 2026-07-13
// Zaire Field — ficha de unidad (archivos, mantenimiento, combustible).

import { notFound } from "next/navigation";
import {
  getVehicle, getVehicleFiles, getVehicleMaintenance, getVehicleFuelLogs,
  getTechnicians, getCurrentUserProfile,
} from "@/lib/field/queries";
import { VehicleDetail } from "@/components/field/vehicle-detail";

export const dynamic = "force-dynamic";

export default async function UnidadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();

  const [files, maintenance, fuel, technicians, currentUser] = await Promise.all([
    getVehicleFiles(id),
    getVehicleMaintenance(id),
    getVehicleFuelLogs(id),
    getTechnicians(true),
    getCurrentUserProfile(),
  ]);

  return (
    <VehicleDetail
      vehicle={vehicle}
      technicians={technicians}
      files={files}
      maintenance={maintenance}
      fuel={fuel}
      currentUser={currentUser}
    />
  );
}
