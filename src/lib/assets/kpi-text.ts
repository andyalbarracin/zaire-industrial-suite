// kpi-text.ts — src/lib/assets/kpi-text.ts — 2026-10-15
// Traduce los KPI de confiabilidad a lenguaje de taller (§7.1 del análisis).
//
// La regla de la §7.1 es que **la sigla va chica y la frase es la protagonista**: nadie tiene que
// saber qué es un MTBR para entender "lo intervenimos cada ~21 días". La sigla queda como etiqueta
// secundaria con tooltip, para el que sí la conoce y la busca.
//
// PURO: solo transforma el resultado del motor en texto. Dos razones para que esté acá y no en el
// componente: se puede testear sin render, y el mismo texto puede reusarse en un PDF o en mobile.
//
// UNIDAD: días por defecto. El análisis §7.1 lo pide así —más intuitivo en equipos de baja
// frecuencia— y horas solo cuando hay horómetro. Hoy ningún equipo tiene horómetro cargado.

import type { DowntimeSource, OperatingSource, Reliability } from "@/lib/assets/reliability";

export interface ReliabilityKpi {
  /** La frase protagonista, en lenguaje de taller. */
  value: string;
  /** La sigla, va chica. */
  sigla: string;
  /** Qué significa la sigla. Va en el tooltip, para quien la busque. */
  tooltip: string;
  /** De dónde salió el número. `null` si para este KPI no aplica. */
  source: string | null;
  /** Invitación a completar, cuando no hay datos suficientes (§7.6). */
  hint?: string;
}

/** Días en plural natural: "1 día" / "2 días". */
const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

/** De dónde salió el tiempo operativo. Se muestra para que el número sea discutible. */
export function operatingSourceText(source: OperatingSource, regimeHoursPerDay: number | null): string {
  switch (source) {
    case "horometro":
      return "medido con horómetro";
    case "regimen":
      return `estimado con régimen de ${regimeHoursPerDay ?? 24} h/día`;
    case "calendario":
      return "sobre días de calendario, no horas de operación";
  }
}

/** De dónde salieron las horas de parada. `null` cuando no hay parada registrada. */
export function downtimeSourceText(source: DowntimeSource): string | null {
  switch (source) {
    case "fechas":
      return "calculado con fechas de ingreso y entrega";
    case "manual":
      return "con horas de parada cargadas a mano";
    case "mixto":
      return "parte con fechas y parte con horas cargadas a mano";
    case "sin_dato":
      return null;
  }
}

/**
 * Los 5 KPI de confiabilidad, listos para pintar.
 *
 * Cuando un KPI no se puede calcular **no devuelve un guion**: devuelve la razón en palabras
 * ("Sin fallas en el período", "Datos insuficientes"). Un guion deja al usuario sin saber si el
 * sistema no sabe o si el equipo está perfecto, y son cosas muy distintas.
 */
export function buildReliabilityKpis(r: Reliability, regimeHoursPerDay: number | null = null): ReliabilityKpi[] {
  const fuenteTiempo = operatingSourceText(r.operatingSource, regimeHoursPerDay);
  const fuenteParada = downtimeSourceText(r.downtimeSource);

  const sinFallas = "Sin fallas en el período";
  const insuficiente = "Datos insuficientes";
  const invitacion = "Con una intervención más ya se puede calcular.";

  return [
    {
      sigla: "MTBF",
      tooltip: "Tiempo medio entre fallas: cada cuánto, en promedio, el equipo falla.",
      value: r.noFailuresInPeriod ? sinFallas
        : r.mtbfDays !== null ? `Falla cada ~${dias(r.mtbfDays)}`
        : insuficiente,
      source: r.mtbfDays !== null ? fuenteTiempo : null,
      ...(r.mtbfDays === null && !r.noFailuresInPeriod ? { hint: invitacion } : {}),
    },
    {
      sigla: "MTBR",
      tooltip: "Tiempo medio entre intervenciones: cada cuánto hay que trabajar sobre el equipo, falle o no.",
      value: r.mtbrDays !== null ? `Lo intervenimos cada ~${dias(r.mtbrDays)}` : insuficiente,
      source: r.mtbrDays !== null ? fuenteTiempo : null,
      ...(r.mtbrDays === null ? { hint: invitacion } : {}),
    },
    {
      sigla: "MTTR",
      tooltip: "Tiempo medio de reparación: cuánto tarda en volver a operar después de una falla.",
      value: r.mttrHours !== null ? `Vuelve a operar en ~${dias(Math.max(1, Math.round(r.mttrHours / 24)))}` : sinFallas,
      source: r.mttrHours !== null ? fuenteParada : null,
    },
    {
      sigla: "Disponibilidad",
      tooltip: "Qué proporción del tiempo el equipo estuvo operativo, considerando cuánto tarda en volver cuando falla.",
      value: r.availability !== null ? `Operativo el ${Math.round(r.availability * 100)}% del tiempo` : sinFallas,
      source: r.availability !== null ? fuenteTiempo : null,
    },
    {
      sigla: "Índice reactivo",
      tooltip: "Qué proporción de las intervenciones fue por una falla, en lugar de planificada.",
      value: r.reactiveIndex !== null
        ? `${Math.round(r.reactiveIndex * 10)} de cada 10 intervenciones fueron por falla`
        : "Sin intervenciones en el período",
      // No depende del tiempo operativo ni de la parada: es un cociente de conteos.
      source: null,
    },
  ];
}
