"use client";
// reports-view.tsx — src/components/field/reports-view.tsx — 2026-07-13
// Reportes Field: gráficos + tablas, export CSV / XLS / PDF. Tabs Operativos y Financieros.

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { computeFieldReports, type NameValue } from "@/lib/field/reports";
import type { FieldVisit, FieldExpense } from "@/lib/field/types";

const COLORS = ["#0B2447", "#19376D", "#576CBC", "#A5D7E8", "#16A34A", "#EAB308", "#DC2626", "#8B5CF6"];

interface ReportsViewProps {
  visits: FieldVisit[];
  expenses: FieldExpense[];
}

export function ReportsView({ visits, expenses }: ReportsViewProps) {
  const rep = useMemo(() => computeFieldReports(visits, expenses), [visits, expenses]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byStatus.map((r) => ({ Estado: r.name, Visitas: r.value }))), "Por Estado");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byTechnician.map((r) => ({ Técnico: r.name, Visitas: r.value }))), "Visitas x Técnico");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byClient.map((r) => ({ Cliente: r.name, Visitas: r.value }))), "Visitas x Cliente");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.expByCategory.map((r) => ({ Categoría: r.name, "Monto ARS": r.value }))), "Gastos x Categoría");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.expByTechnician.map((r) => ({ Técnico: r.name, "Monto ARS": r.value }))), "Gastos x Técnico");
    XLSX.writeFile(wb, `Zaire_Field_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCSV() {
    const sec = (title: string, rows: NameValue[], valueLabel: string) =>
      [title, `Nombre;${valueLabel}`, ...rows.map((r) => `"${r.name}";${r.value}`), ""].join("\n");
    const csv = "﻿" + [
      sec("VISITAS POR ESTADO", rep.byStatus, "Visitas"),
      sec("VISITAS POR TÉCNICO", rep.byTechnician, "Visitas"),
      sec("VISITAS POR CLIENTE", rep.byClient, "Visitas"),
      sec("VISITAS POR SUCURSAL", rep.byBranch, "Visitas"),
      sec("GASTOS POR CATEGORÍA (ARS)", rep.expByCategory, "Monto"),
      sec("GASTOS POR TÉCNICO (ARS)", rep.expByTechnician, "Monto"),
      sec("COBRANZA (visitas facturables)", rep.byBilling, "Visitas"),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Zaire_Field_Reportes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
        <Button variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
        <Button asChild variant="outline"><a href="/api/field/reportes-pdf" target="_blank" rel="noopener noreferrer"><FileText className="w-4 h-4 mr-1.5" /> PDF</a></Button>
      </div>

      <Tabs defaultValue="operativos">
        <TabsList>
          <TabsTrigger value="operativos">Operativos</TabsTrigger>
          <TabsTrigger value="financieros">Financieros</TabsTrigger>
        </TabsList>

        <TabsContent value="operativos" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-4 gap-4">
            <Kpi label="Total visitas" value={String(rep.totalVisits)} />
            <Kpi label="Tiempo prom. en sitio" value={rep.avgSiteMinutes != null ? `${rep.avgSiteMinutes} min` : "—"} />
            <Kpi label="Finalizadas" value={String(rep.finalized)} />
            <Kpi label="Activas" value={String(rep.active)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Visitas por estado">
              <BarChart data={rep.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="value" fill="#576CBC" radius={[4, 4, 0, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Visitas por sucursal">
              <BarChart data={rep.byBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="value" fill="#19376D" radius={[4, 4, 0, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
          </div>

          <TableCard title="Visitas por técnico" rows={rep.byTechnician} col="Técnico" valueCol="Visitas" />
          <TableCard title="Visitas por cliente" rows={rep.byClient} col="Cliente" valueCol="Visitas" />
        </TabsContent>

        <TabsContent value="financieros" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Kpi label="Total gastos (ARS)" value={formatCurrency(rep.totalExpensesArs, "ARS")} />
            <Kpi label="Gastos facturables (ARS)" value={formatCurrency(rep.billableExpensesArs, "ARS")} />
            <Kpi label="Visitas facturables" value={String(rep.billableVisitsCount)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Gastos por categoría (ARS)">
              <PieChart>
                <Pie data={rep.expByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                  {rep.expByCategory.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), "ARS")} /><Legend />
              </PieChart>
            </ChartCard>
            <ChartCard title="Control de cobranza (visitas facturables)">
              <BarChart data={rep.byBilling}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="value" fill="#EAB308" radius={[4, 4, 0, 0]} name="Visitas" />
              </BarChart>
            </ChartCard>
          </div>

          <TableCard title="Gastos por categoría (ARS)" rows={rep.expByCategory} col="Categoría" valueCol="Monto" money />
          <TableCard title="Gastos por técnico (ARS)" rows={rep.expByTechnician} col="Técnico" valueCol="Monto" money />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="zaire-card p-4">
      <p className="text-xs text-(--zaire-text-muted)">{label}</p>
      <p className="text-2xl font-bold text-(--zaire-text) mt-1">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="zaire-card p-5">
      <h3 className="text-sm font-semibold text-(--zaire-text) mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>{children}</ResponsiveContainer>
    </div>
  );
}

function TableCard({ title, rows, col, valueCol, money }: { title: string; rows: NameValue[]; col: string; valueCol: string; money?: boolean }) {
  return (
    <div className="zaire-card p-5">
      <h3 className="text-sm font-semibold text-(--zaire-text) mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-(--zaire-text-muted) py-2">Sin datos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-(--zaire-text-muted) uppercase tracking-wide border-b border-(--zaire-border)">
            <tr><th className="text-left py-2">{col}</th><th className="text-right py-2">{valueCol}</th></tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-2">{r.name}</td>
                <td className="py-2 text-right font-medium">{money ? formatCurrency(r.value, "ARS") : r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
