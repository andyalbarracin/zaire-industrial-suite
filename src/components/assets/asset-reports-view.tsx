"use client";
// asset-reports-view.tsx — src/components/assets/asset-reports-view.tsx — 2026-07-20
// Reportes de Zaire Assets: KPIs + gráficos (recharts, degradé del tema) + ranking de riesgo +
// "los que más te consumen" + export XLS/CSV/PDF.

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { computeAssetReports, topConsumers, type TopConsumers } from "@/lib/assets/reports";
import { buildReliabilityMap } from "@/lib/assets/reliability-map";
import { ReliabilityMapChart } from "@/components/assets/reliability-map";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import type { Asset, AssetEvent, Currency } from "@/lib/assets/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

export function AssetReportsView({ assets, events }: { assets: Asset[]; events: AssetEvent[] }) {
  const rep = useMemo(() => computeAssetReports(assets, events), [assets, events]);
  // El reloj lo lee `topConsumers` por su cuenta (tiene `now = Date.now()` por defecto), igual
  // que `computeReliability`. Ningún componente llama a Date.now() en su render: el compilador
  // de React lo marca como impuro, y con razón —dos renders del mismo dato darían distinto—.
  // La impureza vive en la capa pura, que es donde el resto del módulo ya la tiene.
  const consumo = useMemo(() => topConsumers(assets, events), [assets, events]);

  // El mapa se arma con lo que la pasada de flota YA calculó (confiabilidad + referencia): no
  // recalcula nada, solo ubica. Así no puede contradecir a la ficha de cada equipo.
  const mapa = useMemo(() => buildReliabilityMap(assets.map((a) => ({
    id: a.id, name: a.name, tag: a.tag, criticidad: a.criticidad,
    mtbfHours: a.reliability?.mtbfHours ?? null,
    referenceHours: a.mtbfReferenceHours ?? null,
    reactiveIndex: a.reliability?.reactiveIndex ?? null,
    outOfService: a.zhi?.outOfService ?? false,
  }))), [assets]);
  const cur = rep.primaryCurrency as Currency;
  const today = new Date().toISOString().slice(0, 10);

  function exportXLS() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byStatus.map((r) => ({ Estado: r.name, Equipos: r.value }))), "Flota x Estado");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.byType.map((r) => ({ Tipo: r.name, Equipos: r.value }))), "Flota x Tipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.costByAsset.map((r) => ({ Equipo: r.name, [`Costo ${rep.primaryCurrency}`]: Math.round(r.value) }))), "Costo x Equipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.riskRanking.map((r) => ({ Equipo: r.name, Estado: r.status, Criticidad: r.criticidad, Salud: r.health, Riesgo: r.risk }))), "Ranking de Riesgo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.topFailures.map((r) => ({ Equipo: r.name, Fallas: r.value }))), "Top Fallas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consumo.rows.map((r) => ({
      Equipo: r.name, Intervenciones: r.intervenciones, "Horas fuera de servicio": Math.round(r.horasFuera),
      [`Costo ${consumo.currency}`]: Math.round(r.costo),
    }))), "Mas Consumen");
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

      <ReliabilityMapChart map={mapa} />

      <ConsumersTable data={consumo} />

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

// Las bandas del ZHI (80/60/40), no los umbrales viejos de 70/40 que tenía esta vista: el mismo
// número tiene que pintarse igual en todo el módulo.
function healthColor(h: number): string {
  if (h >= 80) return "text-green-600 dark:text-green-400";
  if (h >= 60) return "text-amber-600 dark:text-amber-400";
  if (h >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
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

const horas = (h: number) => {
  // Más de dos días en horas deja de decir algo: "72 h" se entiende peor que "3 días".
  if (h <= 0) return "—";
  if (h < 48) return `${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "día" : "días"}`;
};

/**
 * "Los 10 equipos que más te consumen" (§7.5). En la industria, la lista de malos actores.
 *
 * No repite al ranking de riesgo que está debajo: ése ordena por "¿qué atiendo primero?" (salud ×
 * criticidad, mira hacia adelante). Éste ordena por lo que YA te costó. Un equipo puede estar
 * sano hoy y haber sido el que más plata y horas se llevó en el año.
 *
 * El criterio de orden se muestra en pantalla a propósito: un ranking cuyo criterio no se ve es
 * un ranking en el que no se puede confiar.
 */
function ConsumersTable({ data }: { data: TopConsumers }) {
  const porHoras = data.orderedBy === "horas";
  return (
    <div className="zaire-card overflow-hidden">
      <div className="px-5 py-3 border-b border-(--zaire-border)">
        <h3 className="text-sm font-semibold text-(--zaire-text)">Los equipos que más te consumen</h3>
        <p className="text-xs text-(--zaire-text-muted) mt-0.5">
          Últimos {data.periodMonths} meses · ordenado por {porHoras ? "tiempo fuera de servicio" : "cantidad de intervenciones"}
          {!porHoras && " (todavía no hay horas de parada cargadas)"}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Equipo</th>
              <th className="text-right px-4 py-2.5">Intervenciones</th>
              <th className="text-right px-4 py-2.5">Fuera de servicio</th>
              <th className="text-right px-4 py-2.5">Costo ({data.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-subtle transition-colors">
                <td className="px-4 py-2.5">
                  <Link href={ROUTES.assets.equipo(r.id)} className="text-(--zaire-text) hover:text-zaire-blue hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${!porHoras ? "font-semibold text-(--zaire-text)" : ""}`}>{r.intervenciones}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${porHoras ? "font-semibold text-(--zaire-text)" : "text-(--zaire-text-muted)"}`}>{horas(r.horasFuera)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">
                  {r.costo > 0 ? formatCurrency(r.costo, data.currency as Currency) : "—"}
                </td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-(--zaire-text-muted)">
                Ningún equipo tuvo intervenciones en los últimos {data.periodMonths} meses.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
