// page.tsx — src/app/(dashboard)/crm/actividades/page.tsx — 2026-07-16
// Zaire CRM — Timeline de actividades comerciales.

import { getActivities, getOpportunities, getCrmClients } from "@/lib/crm/queries";
import { ActivitiesView } from "@/components/crm/activities-view";

export const dynamic = "force-dynamic";

export default async function ActividadesPage() {
  const [activities, opportunities, clients] = await Promise.all([
    getActivities(),
    getOpportunities(),
    getCrmClients(),
  ]);

  const oppOptions = opportunities.map((o) => ({ id: o.id, title: o.title, client_id: o.client_id }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Actividades</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {activities.length} actividades registradas
        </p>
      </div>
      <ActivitiesView initialActivities={activities} clients={clients} opportunities={oppOptions} />
    </div>
  );
}
