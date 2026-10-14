// references.ts — src/lib/assets/references.ts — 2026-10-12
// De dónde salen MTBF_ref y MTBR_ref, las referencias que el ZHI usa para el arranque en frío.
// Implementa el §6.3 de .docs/assets-confiabilidad/assets-confiabilidad-salud-e-ia.md.
//
// PURO: no lee la base. La flota entra como parámetro, igual que en `reliability.ts` y `zhi.ts`.
//
// Jerarquía de 3 niveles, en orden:
//   1. El valor cargado para ESE equipo (`assets.mtbf_referencia`): dato del fabricante o
//      experiencia propia del cliente. Si está, gana.
//   2. La mediana de SU PROPIA FLOTA del mismo tipo, con un mínimo de equipos comparables.
//      Esta es una de las tres cosas que el §6.7 señala como realmente propietarias: la
//      referencia se arma sola con el uso, y no se puede copiar.
//   3. La tabla default de Zaire por tipo. Ver la advertencia de abajo.
//
// Cada referencia vuelve con su `source`, misma honestidad de dato que `operatingSource` y
// `downtimeSource` en el motor: el número se puede mostrar diciendo de dónde salió.

import type { AssetType } from "@/lib/assets/types";

/** Mínimo de equipos comparables (con dato observado) para que la mediana de flota valga. */
export const MIN_FLEET_FOR_REFERENCE = 5;

/**
 * ⚠️ TABLAS DEFAULT — VACÍAS A PROPÓSITO. NO LLENAR CON VALORES INVENTADOS.
 *
 * El §6.3 del análisis es explícito: la tabla default es "a construir y validar con clientes;
 * **no inventar valores de industria**". Poner acá números sacados de internet le daría a cada
 * equipo una referencia falsa, y como la referencia es el denominador del sub-índice de
 * Confiabilidad, el ZHI entero quedaría apoyado en un número que nadie validó.
 *
 * Mientras estén vacías, un equipo sin valor propio y sin flota comparable devuelve
 * `sin_referencia` → el sub-índice sale `null` → el ZHI renormaliza los pesos y la salud se
 * calcula con lo que sí se sabe. Eso es correcto: es no contestar lo que no se puede contestar.
 *
 * Para llenarlas hace falta dato validado con clientes reales, no una estimación.
 * Hay un test que verifica que sigan vacías.
 */
export const MTBF_DEFAULT_BY_TYPE: Partial<Record<AssetType, number>> = {};
export const MTBR_DEFAULT_BY_TYPE: Partial<Record<AssetType, number>> = {};

export type ReferenceSource = "equipo" | "flota" | "default" | "sin_referencia";

export interface ResolvedReference {
  hours: number | null;
  source: ReferenceSource;
}

/** Un equipo de la flota con su MTBF/MTBR **observado** (lo que devolvió el motor). */
export interface FleetMember {
  type: AssetType | null;
  mtbfHours: number | null;
  mtbrHours: number | null;
}

export interface FleetReferences {
  /** Mediana por tipo. Solo aparecen los tipos que llegaron al mínimo de comparables. */
  mtbfByType: Record<string, number>;
  mtbrByType: Record<string, number>;
}

/** Equipo del que se quieren resolver las referencias. Las columnas son opcionales: una base
 *  sin migrar no las devuelve (ver §G.1 del addendum) y eso no tiene que romper nada. */
export interface ReferenceSubject {
  type: AssetType | null;
  mtbf_referencia?: number | null;
  mtbr_referencia?: number | null;
}

// ---------------------------------------------------------------- utilidades

/** Un valor sirve como referencia solo si es un número positivo. 0 no es una referencia. */
function usable(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Mediana por tipo, solo para los tipos que llegan al mínimo de equipos con dato. */
function medianByType(fleet: readonly FleetMember[], pick: (m: FleetMember) => number | null): Record<string, number> {
  const acc: Record<string, number[]> = {};
  for (const m of fleet) {
    if (m.type === null) continue;        // sin tipo no hay con qué comparar
    const v = pick(m);
    if (!usable(v)) continue;             // sin dato observado no cuenta para el mínimo
    (acc[m.type] ??= []).push(v);
  }
  const out: Record<string, number> = {};
  for (const [type, values] of Object.entries(acc)) {
    if (values.length >= MIN_FLEET_FOR_REFERENCE) out[type] = median(values);
  }
  return out;
}

// -------------------------------------------------------------------- motor

/**
 * Medianas de la flota por tipo de equipo. Se calcula UNA vez para toda la flota y después se
 * reutiliza al resolver cada equipo (si no, se recalcularía N veces).
 */
export function computeFleetReferences(fleet: readonly FleetMember[]): FleetReferences {
  return {
    mtbfByType: medianByType(fleet, (m) => m.mtbfHours),
    mtbrByType: medianByType(fleet, (m) => m.mtbrHours),
  };
}

function resolveOne(
  assetValue: number | null | undefined,
  type: AssetType | null,
  fleetMedians: Record<string, number>,
  defaults: Partial<Record<AssetType, number>>,
): ResolvedReference {
  if (usable(assetValue)) return { hours: assetValue, source: "equipo" };

  if (type !== null) {
    const fromFleet = fleetMedians[type];
    if (usable(fromFleet)) return { hours: fromFleet, source: "flota" };

    const fromDefault = defaults[type];
    if (usable(fromDefault)) return { hours: fromDefault, source: "default" };
  }

  return { hours: null, source: "sin_referencia" };
}

/**
 * Resuelve las dos referencias de un equipo contra las medianas de flota ya calculadas.
 * Lo que devuelve es exactamente lo que `computeZhi` espera en `mtbfReferenceHours` /
 * `mtbrReferenceHours`: si no hay referencia, el sub-índice sale `null` y el ZHI renormaliza.
 */
export function resolveReferences(
  asset: ReferenceSubject,
  fleet: FleetReferences,
): { mtbf: ResolvedReference; mtbr: ResolvedReference } {
  return {
    mtbf: resolveOne(asset.mtbf_referencia, asset.type, fleet.mtbfByType, MTBF_DEFAULT_BY_TYPE),
    mtbr: resolveOne(asset.mtbr_referencia, asset.type, fleet.mtbrByType, MTBR_DEFAULT_BY_TYPE),
  };
}
