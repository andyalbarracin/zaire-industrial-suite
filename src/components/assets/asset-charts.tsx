"use client";
// asset-charts.tsx — src/components/assets/asset-charts.tsx — 2026-07-20
// Gráficos del dashboard de Assets: equipos por estado (barra) + por criticidad (pie tonal).

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ASSET_STATUS_LABELS, CRITICIDAD_LABELS } from "@/lib/assets/constants";
import { DonutWithLegend } from "@/components/assets/donut-legend";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ROUTES } from "@/lib/routes";
import type { AssetStatus } from "@/lib/assets/types";

// Rampa tonal de menor a mayor criticidad. La criticidad es una escala ORDENADA, así que el color
// tiene que ir de suave a fuerte; usar colores sueltos haría pensar en categorías sin orden.
// Tampoco se usa el verde/amarillo/rojo del semáforo: eso significa SALUD, y criticidad no es
// salud (una bomba crítica puede estar perfecta). Dos escalas distintas, dos lenguajes distintos.
const CRIT_COLOR: Record<number, string> = {
  1: "var(--chart-6)", 2: "var(--chart-5)", 3: "var(--chart-4)", 4: "var(--chart-2)", 5: "var(--chart-1)",
};

interface Props {
  byStatus: { operativo: number; en_reparacion: number; standby: number; baja: number };
  byCriticidad: { criticidad: number; value: number }[];
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
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-(--zaire-text)">Equipos por criticidad</h3>
          <InfoTooltip text="Criticidad es cuánto duele que este equipo se pare: 5 es un equipo sin respaldo que frena la línea; 1 es uno que puede esperar. La carga el usuario al dar de alta el equipo y no cambia sola." />
        </div>
        {/* La etiqueta lleva el número Y la palabra ("4 · Alta"). "Crit. 4" sola obliga a
            acordarse de una escala que nadie memoriza. */}
        <DonutWithLegend
          items={byCriticidad.map((c) => ({
            key: String(c.criticidad),
            label: `${c.criticidad} · ${CRITICIDAD_LABELS[c.criticidad] ?? ""}`.trim(),
            value: c.value,
            color: CRIT_COLOR[c.criticidad] ?? "var(--chart-3)",
            href: `${ROUTES.assets.equipos}?criticidad=${c.criticidad}`,
          }))}
          centerValue={byCriticidad.reduce((s, c) => s + c.value, 0)}
          centerLabel="equipos"
          height={200}
        />
      </div>
    </div>
  );
}
