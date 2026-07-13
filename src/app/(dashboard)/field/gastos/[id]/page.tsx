// page.tsx — src/app/(dashboard)/field/gastos/[id]/page.tsx — 2026-07-13
// Zaire Field — detalle de gasto con auditoría.

import { notFound } from "next/navigation";
import { getExpense, getExpenseEvents, getCurrentUserProfile } from "@/lib/field/queries";
import { ExpenseDetail } from "@/components/field/expense-detail";

export const dynamic = "force-dynamic";

export default async function GastoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  const [events, currentUser] = await Promise.all([
    getExpenseEvents(id),
    getCurrentUserProfile(),
  ]);

  return <ExpenseDetail expense={expense} events={events} currentUser={currentUser} />;
}
