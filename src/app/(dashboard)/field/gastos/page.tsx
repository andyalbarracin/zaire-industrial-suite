// page.tsx — src/app/(dashboard)/field/gastos/page.tsx — 2026-07-13
// Zaire Field — gastos/viáticos global con aprobación y totales.

import { getExpenses, getVisits, getCurrentUserProfile } from "@/lib/field/queries";
import { ExpensesTable } from "@/components/field/expenses-table";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const [expenses, visits, currentUser] = await Promise.all([
    getExpenses(),
    getVisits(),
    getCurrentUserProfile(),
  ]);

  const visitOptions = visits.map((v) => ({ id: v.id, visit_number: v.visit_number, technician_id: v.technician_id }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--sas-text)">Gastos</h1>
        <p className="text-sm text-(--sas-text-muted) mt-0.5">{expenses.length} gastos registrados</p>
      </div>
      <ExpensesTable initialExpenses={expenses} visits={visitOptions} currentUser={currentUser} />
    </div>
  );
}
