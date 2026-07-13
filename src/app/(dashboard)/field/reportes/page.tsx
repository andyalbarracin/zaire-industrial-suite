// page.tsx — src/app/(dashboard)/field/reportes/page.tsx — 2026-07-13
// Zaire Field — reportes operativos y financieros.

import { getVisits, getExpenses } from "@/lib/field/queries";
import { ReportsView } from "@/components/field/reports-view";

export const dynamic = "force-dynamic";

export default async function ReportesFieldPage() {
  const [visits, expenses] = await Promise.all([getVisits(), getExpenses()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--sas-text)">Reportes Field</h1>
        <p className="text-sm text-(--sas-text-muted) mt-0.5">Operativos y financieros</p>
      </div>
      <ReportsView visits={visits} expenses={expenses} />
    </div>
  );
}
