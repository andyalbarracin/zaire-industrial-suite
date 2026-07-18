"use client";
// crm-reports-view.tsx — src/components/crm/crm-reports-view.tsx — 2026-07-18
// Analítica de ventas del CRM: KPIs + gráficos (recharts) + export XLS/CSV.

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { computeCrmReports } from "@/lib/crm/reports";
import { downloadCSV } from "@/lib/export";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import type { CrmOpportunity, CrmLead, CrmPipelineStage } from "@/lib/crm/types";

// Rampa categórica TONAL por tema (var(--chart-1..6)); ver globals.css. Evita el arcoíris.
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

interface CrmReportsViewProps {
  opportunities: CrmOpportunity[];
  leads: CrmLead[];
  stages: CrmPipelineStage[];
  profiles: { id: string; full_name: string }[];
}

export function CrmReportsView({ opportunities, leads, stages, profiles }: CrmReportsViewProps) {
  const rep = useMemo(() => computeCrmReports(opportunities, leads, stages, profiles), [opportunities, leads, stages, profiles]);

  function exportXLS() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.wonByMonth.map((r) => ({ Mes: r.name, "Ganado ARS": r.value }))), "Ganado x Mes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byStageCount.map((r) => ({ Etapa: r.name, Oportunidades: r.value }))), "Pipeline x Etapa");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byOwner.map((r) => ({ Responsable: r.name, Abiertas: r.abiertas, Ganadas: r.ganadas, "Monto ganado ARS": r.montoGanadoArs }))), "Por Responsable");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.leadsByStatus.map((r) => ({ Estado: r.name, Leads: r.value }))), "Leads x Estado");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.leadsBySource.map((r) => ({ Origen: r.name, Leads: r.value }))), "Leads x Origen");
    XLSX.writeFile(wb, `Zaire_CRM_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCSV() {
    downloadCSV(
      `Zaire_CRM_Reportes_${new Date().toISOString().slice(0, 10)}.csv`,
      rep.byOwner.map((r) => ({ Responsable: r.name, Abiertas: r.abiertas, Ganadas: r.ganadas, "Monto ganado ARS": r.montoGanadoArs })),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportXLS} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9"><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Tasa de conversión" value={`${rep.conversionRate}%`} />
        <Kpi label="Win rate" value={`${rep.winRate}%`} />
        <Kpi label="Ganadas" value={String(rep.wonCount)} />
        <Kpi label="Ticket prom. (ARS)" value={formatCurrency(rep.avgWonAmountArs, "ARS")} />
        <Kpi label="Ciclo de venta" value={rep.avgSalesCycleDays != null ? `${rep.avgSalesCycleDays} días` : "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Ganado por mes (ARS)">
          <BarChart data={rep.wonByMonth}>
            <defs><linearGradient id="zbar-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity="1" /><stop offset="100%" stopColor="var(--success)" stopOpacity="0.14" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(Number(v), "ARS")} width={64} />
            <Tooltip formatter={(v) => formatCurrency(Number(v), "ARS")} />
            <Bar dataKey="value" fill="url(#zbar-green)" radius={[4, 4, 0, 0]} name="Ganado ARS" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Oportunidades por etapa">
          <BarChart data={rep.byStageCount}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Oportunidades" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Leads por estado">
          <BarChart data={rep.leadsByStatus}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Leads" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Leads por origen">
          {rep.leadsBySource.length > 0 ? (
            <PieChart>
              <Pie data={rep.leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                {rep.leadsBySource.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin datos de origen</div>
          )}
        </ChartCard>
      </div>

      {/* Rendimiento por responsable */}
      <div className="zaire-card overflow-hidden">
        <div className="px-5 py-3 border-b border-(--zaire-border)"><h3 className="text-sm font-semibold text-(--zaire-text)">Rendimiento por responsable</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Responsable</th>
                <th className="text-right px-4 py-2.5">Abiertas</th>
                <th className="text-right px-4 py-2.5">Ganadas</th>
                <th className="text-right px-4 py-2.5">Monto ganado (ARS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {rep.byOwner.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-2.5 font-medium text-(--zaire-text)">{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.abiertas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.ganadas}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(r.montoGanadoArs, "ARS")}</td>
                </tr>
              ))}
              {rep.byOwner.length === 0 && (<tr><td colSpan={4} className="px-4 py-8 text-center text-(--zaire-text-muted)">Sin datos por responsable</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="zaire-card p-4">
      <p className="text-xs text-(--zaire-text-muted)">{label}</p>
      <p className="text-2xl font-bold text-(--zaire-text) mt-1 tabular-nums truncate">{value}</p>
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
