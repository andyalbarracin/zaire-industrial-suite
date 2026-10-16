// page.tsx — src/app/(dashboard)/assets/equipos/page.tsx — 2026-07-20
// Equipos: listado con salud/criticidad/estado. El alta y la edición viven en sus propias
// páginas, así que acá ya no hace falta traer clientes ni sitios para alimentar un modal.

import { getAssets } from "@/lib/assets/queries";
import { AssetsTable } from "@/components/assets/assets-table";

export const dynamic = "force-dynamic";

export default async function EquiposPage() {
  const assets = await getAssets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Equipos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{assets.length} equipo(s) · salud, criticidad y estado</p>
      </div>
      <AssetsTable initialAssets={assets} />
    </div>
  );
}
