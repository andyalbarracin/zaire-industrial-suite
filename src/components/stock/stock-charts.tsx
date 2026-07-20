"use client";
// stock-charts.tsx — src/components/stock/stock-charts.tsx — 2026-07-18
// Gráficos del dashboard de Stock (recharts): valor por depósito + top productos por valor.
// Usa el sistema de temas (degradé --chart-from/to y rampa tonal --chart-1..6).

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import type { Currency } from "@/lib/stock/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

interface NameValue { name: string; value: number }

export function StockCharts({ valueByWarehouse, topProducts, currency }: { valueByWarehouse: NameValue[]; topProducts: NameValue[]; currency: Currency }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up-2">
      <div className="zaire-card p-5">
        <h3 className="text-sm font-semibold text-(--zaire-text) mb-4">Valor de inventario por depósito ({currency})</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={valueByWarehouse}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(Number(v), currency)} width={64} />
            <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="zaire-card p-5">
        <h3 className="text-sm font-semibold text-(--zaire-text) mb-4">Top productos por valor ({currency})</h3>
        <ResponsiveContainer width="100%" height={260}>
          {topProducts.length > 0 ? (
            <PieChart>
              <Pie data={topProducts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                {topProducts.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} /><Legend />
            </PieChart>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin datos</div>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
