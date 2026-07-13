"use client";
// reports-view.tsx — src/components/field/reports-view.tsx — 2026-07-13
// Reportes Field: tabs Operativos y Financieros con recharts + export Excel.

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import {
  VISIT_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
  BILLING_STATUS_LABELS,
} from "@/lib/field/constants";
import type { FieldVisit, FieldExpense, VisitStatus, ExpenseCategory, BillingStatus } from "@/lib/field/types";

const COLORS = ["#0B2447", "#19376D", "#576CBC", "#A5D7E8", "#16A34A", "#EAB308", "#DC2626", "#8B5CF6"];

interface ReportsViewProps {
  visits: FieldVisit[];
  expenses: FieldExpense[];
}

function countBy<T>(items: T[], key: (t: T) => string | null | undefined): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it) ?? "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function ReportsView({ visits, expenses }: ReportsViewProps) {
  // ----- Operativos -----
  const byStatus = useMemo(
    () => countBy(visits, (v) => VISIT_STATUS_LABELS[v.status as VisitStatus]),
    [visits]
  );
  const byTechnician = useMemo(
    () => countBy(visits, (v) => v.technician?.full_name).sort((a, b) => b.value - a.value).slice(0, 8),
    [visits]
  );
  const byClient = useMemo(
    () => countBy(visits, (v) => v.client?.business_name).sort((a, b) => b.value - a.value).slice(0, 8),
    [visits]
  );
  const byBranch = useMemo(
    () => countBy(visits, (v) => BRANCHES.find((b) => b.id === v.branch_id)?.name ?? v.branch_id),
    [visits]
  );

  const avgSiteMinutes = useMemo(() => {
    const durations = visits
      .filter((v) => v.arrived_at && v.departed_at)
      .map((v) => (new Date(v.departed_at!).getTime() - new Date(v.arrived_at!).getTime()) / 60000);
    if (durations.length === 0) return null;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }, [visits]);

  // ----- Financieros -----
  const expByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (e.currency !== "ARS") continue;
      const k = e.category ? EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] : "Otro";
      map.set(k, (map.get(k) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const expByTechnician = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (e.currency !== "ARS") continue;
      const k = e.technician?.full_name ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [expenses]);

  const billing = useMemo(() => {
    const billableVisits = visits.filter((v) => v.is_billable);
    const byBilling = countBy(billableVisits, (v) => BILLING_STATUS_LABELS[v.billing_status as BillingStatus]);
    const billableExpensesArs = expenses.filter((e) => e.is_billable && e.currency === "ARS").reduce((s, e) => s + Number(e.amount), 0);
    return { byBilling, billableExpensesArs, billableVisitsCount: billableVisits.length };
  }, [visits, expenses]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byStatus.map((r) => ({ Estado: r.name, Visitas: r.value }))), "Por Estado");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byTechnician.map((r) => ({ Técnico: r.name, Visitas: r.value }))), "Por Técnico");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byClient.map((r) => ({ Cliente: r.name, Visitas: r.value }))), "Por Cliente");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expByCategory.map((r) => ({ Categoría: r.name, "Monto ARS": r.value }))), "Gastos Categoría");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expByTechnician.map((r) => ({ Técnico: r.name, "Monto ARS": r.value }))), "Gastos Técnico");
    XLSX.writeFile(wb, `Zaire_Field_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-1.5" /> Exportar Excel</Button>
      </div>

      <Tabs defaultValue="operativos">
        <TabsList>
          <TabsTrigger value="operativos">Operativos</TabsTrigger>
          <TabsTrigger value="financieros">Financieros</TabsTrigger>
        </TabsList>

        <TabsContent value="operativos" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-4 gap-4">
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Total visitas</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{visits.length}</p>
            </div>
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Tiempo prom. en sitio</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{avgSiteMinutes != null ? `${avgSiteMinutes} min` : "—"}</p>
            </div>
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Finalizadas</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{visits.filter((v) => v.status === "finalizada").length}</p>
            </div>
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Activas</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{visits.filter((v) => v.status === "en_curso" || v.status === "en_sitio").length}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Visitas por estado">
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#576CBC" radius={[4, 4, 0, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Visitas por sucursal">
              <BarChart data={byBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#19376D" radius={[4, 4, 0, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Visitas por técnico">
              <BarChart data={byTechnician} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0B2447" radius={[0, 4, 4, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Visitas por cliente">
              <BarChart data={byClient} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#576CBC" radius={[0, 4, 4, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="financieros" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Total gastos (ARS)</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{formatCurrency(expenses.filter((e) => e.currency === "ARS").reduce((s, e) => s + Number(e.amount), 0), "ARS")}</p>
            </div>
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Gastos facturables (ARS)</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{formatCurrency(billing.billableExpensesArs, "ARS")}</p>
            </div>
            <div className="sas-card p-4">
              <p className="text-xs text-(--sas-text-muted)">Visitas facturables</p>
              <p className="text-2xl font-bold text-(--sas-text) mt-1">{billing.billableVisitsCount}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Gastos por categoría (ARS)">
              <PieChart>
                <Pie data={expByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {expByCategory.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), "ARS")} />
                <Legend />
              </PieChart>
            </ChartCard>
            <ChartCard title="Gastos por técnico (ARS)">
              <BarChart data={expByTechnician} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v), "ARS")} />
                <Bar dataKey="value" fill="#16A34A" radius={[0, 4, 4, 0]} name="Gastos ARS" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Control de cobranza (visitas facturables)">
              <BarChart data={billing.byBilling}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#EAB308" radius={[4, 4, 0, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="sas-card p-5">
      <h3 className="text-sm font-semibold text-(--sas-text) mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
