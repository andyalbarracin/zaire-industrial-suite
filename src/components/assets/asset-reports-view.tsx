"use client";
// asset-reports-view.tsx — src/components/assets/asset-reports-view.tsx — 2026-07-20
// Reportes de Zaire Assets: KPIs + gráficos (recharts, degradé del tema) + ranking de riesgo + export XLS/CSV/PDF.

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { computeAssetReports } from "@/lib/assets/reports";
import type { Asset, AssetEvent, Currency } from "@/lib/assets/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

export function AssetReportsView({ assets, events }: { assets: Asset[]; events: AssetEvent[] }) {
  const rep = useMemo(() => computeAssetReports(assets, events), [assets, events]);
  const cur = rep.primaryCurrency as Currency;
  const today = new Date().toISOString().slice(0, 10);

  function exportXLS() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byStatus.map((r) => ({ Estado: r.name, Equipos: r.value }))), "Flota x Estado");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byType.map((r) => ({ Tipo: r.name, Equipos: r.value }))), "Flota x Tipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.costByAsset.map((r) => ({ Equipo: r.name, [`Costo ${rep.primaryCurrency}`]: Math.round(r.value) }))), "Costo x Equipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.riskRanking.map((r) => ({ Equipo: r.name, Estado: r.status, Criticidad: r.criticidad, Salud: r.health, Riesgo: r.risk }))), "Ranking de Riesgo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.topFailures.map((r) => ({ Equipo: r.name, Fallas: r.value }))), "Top Fallas");
    XLSX.writeFile(wb, `Zaire_Assets_Reportes_${today}.xlsx`);
  }
  function exportCSV() {
    downloadCSV(`Zaire_Assets_Reportes_${today}.csv`, rep.riskRanking.map((r) => ({ Equipo: r.name, Estado: r.status, Criticidad: r.criticidad, Salud: r.health, Riesgo: r.risk })));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportXLS} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9"><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
        <Button asChild variant="outline" size="sm" className="h-9"><a href="/api/assets/reportes-pdf" target="_blank" rel="noopener noreferrer"><FileText className="w-4 h-4 mr-1.5" /> PDF</a></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Equipos" value={String(rep.total)} />
        <Kpi label="Operativos" value={String(rep.operativos)} />
        <Kpi label="En riesgo" value={String(rep.atRiskCount)} />
        <Kpi label="Salud promedio" value={`${rep.avgHealth}%`} />
        <Kpi label="Costo de flota" value={rep.costByCurrency.length ? rep.costByCurrency.map((v) => formatCurrency(v.value, v.name as Currency)).join(" · ") : formatCurrency(0, "ARS")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Flota por estado">
          <BarChart data={rep.byStatus}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Equipos" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Flota por tipo">
          {rep.byType.length > 0 ? (
            <PieChart>
              <Pie data={rep.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                {rep.byType.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          ) : <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin datos</div>}
        </ChartCard>

        <ChartCard title={`Costo por equipo (${rep.primaryCurrency})`}>
          {rep.costByAsset.length > 0 ? (
            <BarChart data={rep.costByAsset}>
              <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(Number(v), cur)} width={64} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), cur)} />
              <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Costo" />
            </BarChart>
          ) : <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin costos registrados</div>}
        </ChartCard>

        <ChartCard title="Top equipos por fallas">
          {rep.topFailures.length > 0 ? (
            <BarChart data={rep.topFailures}>
              <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Fallas" />
            </BarChart>
          ) : <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin fallas registradas</div>}
        </ChartCard>
      </div>

      <RiskTable rows={rep.riskRanking} />
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

function healthColor(h: number): string {
  return h >= 70 ? "text-green-600 dark:text-green-400" : h >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
}

function RiskTable({ rows }: { rows: { name: string; status: string; criticidad: number; health: number; risk: number }[] }) {
  return (
    <div className="zaire-card overflow-hidden">
      <div className="px-5 py-3 border-b border-(--zaire-border)"><h3 className="text-sm font-semibold text-(--zaire-text)">Ranking de riesgo</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Equipo</th>
              <th className="text-left px-4 py-2.5">Estado</th>
              <th className="text-right px-4 py-2.5">Criticidad</th>
              <th className="text-right px-4 py-2.5">Salud</th>
              <th className="text-right px-4 py-2.5">Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="px-4 py-2.5 text-(--zaire-text)">{r.name}</td>
                <td className="px-4 py-2.5 text-(--zaire-text-muted)">{r.status}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.criticidad}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${healthColor(r.health)}`}>{r.health}%</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.risk}</td>
              </tr>
            ))}
            {rows.length === 0 && (<tr><td colSpan={5} className="px-4 py-8 text-center text-(--zaire-text-muted)">Sin equipos en riesgo</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
