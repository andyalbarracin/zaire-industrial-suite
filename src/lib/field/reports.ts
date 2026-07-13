// reports.ts — src/lib/field/reports.ts — 2026-07-13
// Agregaciones de reportes de Field (puras). Reutilizadas por la vista y el PDF.

import { BRANCHES } from "@/lib/constants";
import {
  VISIT_STATUS_LABELS, EXPENSE_CATEGORY_LABELS, BILLING_STATUS_LABELS,
} from "@/lib/field/constants";
import type { FieldVisit, FieldExpense, VisitStatus, ExpenseCategory, BillingStatus } from "@/lib/field/types";

export interface NameValue { name: string; value: number }

export interface FieldReports {
  byStatus: NameValue[];
  byTechnician: NameValue[];
  byClient: NameValue[];
  byBranch: NameValue[];
  avgSiteMinutes: number | null;
  totalVisits: number;
  finalized: number;
  active: number;
  expByCategory: NameValue[];
  expByTechnician: NameValue[];
  byBilling: NameValue[];
  totalExpensesArs: number;
  billableExpensesArs: number;
  billableVisitsCount: number;
}

function countBy<T>(items: T[], key: (t: T) => string | null | undefined): NameValue[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it) ?? "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function sumByArs<T>(items: T[], key: (t: T) => string, amount: (t: T) => number, currency: (t: T) => string): NameValue[] {
  const map = new Map<string, number>();
  for (const it of items) {
    if (currency(it) !== "ARS") continue;
    map.set(key(it), (map.get(key(it)) ?? 0) + amount(it));
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function computeFieldReports(visits: FieldVisit[], expenses: FieldExpense[]): FieldReports {
  const durations = visits
    .filter((v) => v.arrived_at && v.departed_at)
    .map((v) => (new Date(v.departed_at!).getTime() - new Date(v.arrived_at!).getTime()) / 60000);
  const avgSiteMinutes = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const billableVisits = visits.filter((v) => v.is_billable);

  return {
    byStatus: countBy(visits, (v) => VISIT_STATUS_LABELS[v.status as VisitStatus]),
    byTechnician: countBy(visits, (v) => v.technician?.full_name).sort((a, b) => b.value - a.value).slice(0, 12),
    byClient: countBy(visits, (v) => v.client?.business_name).sort((a, b) => b.value - a.value).slice(0, 12),
    byBranch: countBy(visits, (v) => BRANCHES.find((b) => b.id === v.branch_id)?.name ?? v.branch_id),
    avgSiteMinutes,
    totalVisits: visits.length,
    finalized: visits.filter((v) => v.status === "finalizada").length,
    active: visits.filter((v) => v.status === "en_curso" || v.status === "en_sitio").length,
    expByCategory: sumByArs(expenses, (e) => (e.category ? EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] : "Otro"), (e) => Number(e.amount), (e) => e.currency),
    expByTechnician: sumByArs(expenses, (e) => e.technician?.full_name ?? "—", (e) => Number(e.amount), (e) => e.currency).slice(0, 12),
    byBilling: countBy(billableVisits, (v) => BILLING_STATUS_LABELS[v.billing_status as BillingStatus]),
    totalExpensesArs: expenses.filter((e) => e.currency === "ARS").reduce((s, e) => s + Number(e.amount), 0),
    billableExpensesArs: expenses.filter((e) => e.is_billable && e.currency === "ARS").reduce((s, e) => s + Number(e.amount), 0),
    billableVisitsCount: billableVisits.length,
  };
}
