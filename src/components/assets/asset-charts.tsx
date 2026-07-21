"use client";
// asset-charts.tsx — src/components/assets/asset-charts.tsx — 2026-07-20
// Gráficos del dashboard de Assets: equipos por estado (barra) + por criticidad (pie tonal).

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { ASSET_STATUS_LABELS } from "@/lib/assets/constants";
import type { AssetStatus } from "@/lib/assets/types";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

interface Props {
  byStatus: { operativo: number; en_reparacion: number; standby: number; baja: number };
  byCriticidad: { name: string; value: number }[];
}

export function AssetCharts({ byStatus, byCriticidad }: Props) {
  const statusData = (Object.keys(byStatus) as AssetStatus[])
    .map((k) => ({ name: ASSET_STATUS_LABELS[k], value: byStatus[k] }))
    .filter((x) => x.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up-2">
      <div className="zaire-card p-5">
        <h3 className="text-sm font-semibold text-(--zaire-text) mb-4">Equipos por estado</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={statusData}>
            <defs><linearGradient id="zbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-from)" /><stop offset="100%" stopColor="var(--chart-to)" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="value" fill="url(#zbar)" radius={[4, 4, 0, 0]} name="Equipos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="zaire-card p-5">
        <h3 className="text-sm font-semibold text-(--zaire-text) mb-4">Equipos por criticidad</h3>
        <ResponsiveContainer width="100%" height={240}>
          {byCriticidad.length > 0 ? (
            <PieChart>
              <Pie data={byCriticidad} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(e) => `${e.name}: ${e.value}`}>
                {byCriticidad.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          ) : <div className="flex items-center justify-center h-full text-sm text-(--zaire-text-muted)">Sin datos</div>}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
