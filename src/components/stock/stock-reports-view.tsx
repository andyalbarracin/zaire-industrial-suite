"use client";
// stock-reports-view.tsx — src/components/stock/stock-reports-view.tsx — 2026-07-18
// Reportes de Stock: KPIs + gráficos (recharts, degradé del tema) + tablas + export XLS/CSV/PDF.

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { computeStockReports } from "@/lib/stock/reports";
import { MOVEMENT_TYPE_LABELS } from "@/lib/stock/constants";
import type { StockLevel, StockMovement, MovementType, Currency } from "@/lib/stock/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

export function StockReportsView({ levels, movements }: { levels: StockLevel[]; movements: StockMovement[] }) {
  const rep = useMemo(() => computeStockReports(levels, movements), [levels, movements]);

  function exportXLS() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.valuationByWarehouse.map((r) => ({ Depósito: r.name, "Valor ARS": Math.round(r.value) }))), "Valor x Depósito");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.valuationByCategory.map((r) => ({ Categoría: r.name, "Valor ARS": Math.round(r.value) }))), "Valor x Categoría");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.lowStock.map((r) => ({ Producto: r.product, Depósito: r.warehouse, Stock: r.on_hand, Mínimo: r.min_qty }))), "Bajo Mínimo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep.topConsumed.map((r) => ({ Producto: r.name, "Consumido (u.)": r.value }))), "Top Consumidos");
    XLSX.writeFile(wb, `Zaire_Stock_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function exportCSV() {
    downloadCSV(`Zaire_Stock_Reportes_${new Date().toISOString().slice(0, 10)}.csv`, rep.valuationByWarehouse.map((r) => ({ Depósito: r.name, "Valor ARS": Math.round(r.value) })));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportXLS} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9"><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
        <Button asChild variant="outline" size="sm" className="h-9"><a href="/api/stock/reportes-pdf" target="_blank" rel="noopener noreferrer"><FileText className="w-4 h-4 mr-1.5" /> PDF</a></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Valor de inventario" value={rep.valueByCurrency.length ? rep.valueByCurrency.map((v) => formatCurrency(v.value, v.name as Currency)).join(" · ") : formatCurrency(0, "ARS")} />
        <Kpi label="SKUs con stock" value={String(rep.skuCount)} />
        <Kpi label="Bajo mínimo" value={String(rep.lowStockCount)} />
        <Kpi label="Depósitos" value={String(rep.warehouseCount)} />
        <Kpi label="Unidades reservadas" value={String(rep.reservedUnits)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title={`Valor por depósito (${rep.primaryCurrency})`}>
          <BarChart data={rep.valuationByWarehouse}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(Number(v), rep.primaryCurrency as Currency)} width={64} />
            <Tooltip formatter={(v) => formatCurrency(Number(v), rep.primaryCurrency as Currency)} />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Valor" />
          </BarChart>
        </ChartCard>

        <ChartCard title={`Valor por categoría (${rep.primaryCurrency})`}>
          {rep.valuationByCategory.length > 0 ? (
            <PieChart>
              <Pie data={rep.valuationByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                {rep.valuationByCategory.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v), rep.primaryCurrency as Currency)} /><Legend />
            </PieChart>
          ) : <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin datos</div>}
        </ChartCard>

        <ChartCard title="Movimientos por tipo">
          <BarChart data={rep.movementsByType.map((r) => ({ ...r, name: MOVEMENT_TYPE_LABELS[r.name as MovementType] ?? r.name }))}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Movimientos" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Top productos consumidos (u.)">
          <BarChart data={rep.topConsumed}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Consumido" />
          </BarChart>
        </ChartCard>
      </div>

      <TableCard title="Bajo mínimo" rows={rep.lowStock.map((r) => ({ Producto: r.product, Depósito: r.warehouse, Stock: r.on_hand, Mínimo: r.min_qty }))} cols={["Producto", "Depósito", "Stock", "Mínimo"]} />
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

function TableCard({ title, rows, cols }: { title: string; rows: Record<string, string | number>[]; cols: string[] }) {
  return (
    <div className="zaire-card overflow-hidden">
      <div className="px-5 py-3 border-b border-(--zaire-border)"><h3 className="text-sm font-semibold text-(--zaire-text)">{title}</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr>{cols.map((c, i) => (<th key={c} className={i === 0 ? "text-left px-4 py-2.5" : "text-right px-4 py-2.5"}>{c}</th>))}</tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {rows.map((r, ri) => (
              <tr key={ri}>{cols.map((c, i) => (<td key={c} className={i === 0 ? "px-4 py-2.5 text-(--zaire-text)" : "px-4 py-2.5 text-right tabular-nums"}>{r[c]}</td>))}</tr>
            ))}
            {rows.length === 0 && (<tr><td colSpan={cols.length} className="px-4 py-8 text-center text-(--zaire-text-muted)">Sin faltantes</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
