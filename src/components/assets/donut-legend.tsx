"use client";
// donut-legend.tsx — src/components/assets/donut-legend.tsx — 2026-10-15
// Donut con la leyenda AL COSTADO, no abajo ni encima de los gajos.
//
// Por qué así y no con el `label` + `<Legend>` de recharts:
//  · El `label` de recharts dibuja el texto POR FUERA del radio. Con 4-5 categorías en una card
//    angosta los textos se pisan entre sí y se cortan contra el borde. No hay forma de arreglarlo
//    con props: el cálculo de posición no sabe nada del ancho disponible.
//  · El `<Legend>` por defecto apila los nombres en línea, sin separación ("Crit. 2Crit. 3…").
//  · Un gajo de torta comunica proporción, no cantidad. La leyenda al costado pone el número y el
//    porcentaje escritos, que es lo que la gente termina leyendo igual.
//
// Accesibilidad: el color nunca es el único portador de información. Cada fila de la leyenda lleva
// el nombre y el valor en texto, así que el gráfico se entiende sin distinguir colores.

import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface DonutItem {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Si viene, la fila de la leyenda navega al listado ya filtrado por esta categoría. */
  href?: string;
}

export function DonutWithLegend({
  items,
  centerValue,
  centerLabel,
  emptyText = "Sin datos",
  height = 180,
}: {
  items: DonutItem[];
  centerValue: number;
  centerLabel: string;
  emptyText?: string;
  height?: number;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);

  if (total === 0) {
    return (
      <div className="grid place-items-center text-sm text-(--zaire-text-muted)" style={{ height }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={items} dataKey="value" nameKey="label" cx="50%" cy="50%"
              innerRadius={height * 0.29} outerRadius={height * 0.43}
              paddingAngle={2} stroke="none" isAnimationActive={false}
            >
              {items.map((i) => (<Cell key={i.key} fill={i.color} />))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-(--zaire-text) tabular-nums leading-none">{centerValue}</p>
            <p className="text-[11px] text-(--zaire-text-muted) mt-0.5">{centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="space-y-0.5">
        {items.map((i) => {
          const fila = (
            <>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i.color }} />
              <span className="flex-1 truncate">{i.label}</span>
              <span className="font-medium tabular-nums">{i.value}</span>
              <span className="text-(--zaire-text-muted) text-xs tabular-nums w-9 text-right">
                {Math.round((i.value / total) * 100)}%
              </span>
            </>
          );
          return (
            <li key={i.key}>
              {i.href ? (
                <Link
                  href={i.href}
                  aria-label={`Ver los ${i.value} equipos en ${i.label}`}
                  className="flex items-center gap-2 text-sm text-(--zaire-text) rounded-md px-2 py-1.5 -mx-2 cursor-pointer transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaire-blue"
                >
                  {fila}
                </Link>
              ) : (
                <span className="flex items-center gap-2 text-sm text-(--zaire-text) px-2 py-1.5 -mx-2">{fila}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
