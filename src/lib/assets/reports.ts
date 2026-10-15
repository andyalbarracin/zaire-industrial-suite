// reports.ts — src/lib/assets/reports.ts — 2026-07-20
// Cálculo PURO de los reportes de Zaire Assets (flota, costo/TCO, confiabilidad, riesgo). Testable.

import type { Asset, AssetEvent } from "@/lib/assets/types";
import type { ZhiBand } from "@/lib/assets/zhi";
import { ASSET_STATUS_LABELS, ASSET_TYPE_LABELS, CRITICIDAD_LABELS } from "@/lib/assets/constants";

export interface NameValue { name: string; value: number }

export interface AssetReport {
  total: number;
  operativos: number;
  criticalCount: number;               // criticidad ≥ 4
  atRiskCount: number;                 // salud < 60
  avgHealth: number;                   // salud promedio de la flota
  costByCurrency: NameValue[];         // TCO de la flota POR moneda (nunca se suman monedas)
  primaryCurrency: string;             // moneda dominante (el costo por equipo se calcula en ésta)
  byStatus: NameValue[];
  byType: NameValue[];
  byCriticidad: NameValue[];
  costByAsset: NameValue[];            // top equipos por costo acumulado (en primaryCurrency)
  topFailures: NameValue[];           // top equipos por # de fallas
  riskRanking: { name: string; status: string; criticidad: number; health: number; risk: number }[];
}

function group(rows: { key: string; value: number }[]): NameValue[] {
  const acc: Record<string, number> = {};
  for (const r of rows) acc[r.key] = (acc[r.key] ?? 0) + r.value;
  return Object.entries(acc).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
}

export function computeAssetReports(assets: Asset[], events: AssetEvent[]): AssetReport {
  const total = assets.length;
  const operativos = assets.filter((a) => a.status === "operativo").length;
  const criticalCount = assets.filter((a) => a.criticidad >= 4).length;
  const withHealth = assets.filter((a) => a.health != null);
  const atRiskCount = withHealth.filter((a) => (a.health ?? 100) < 60).length;
  const avgHealth = withHealth.length ? Math.round(withHealth.reduce((s, a) => s + (a.health ?? 0), 0) / withHealth.length) : 0;

  // TCO de la flota por moneda (nunca se suman monedas distintas; el costo por equipo usa la dominante).
  const costByCurrency = group(events.filter((e) => e.cost).map((e) => ({ key: e.currency || "ARS", value: e.cost as number })));
  const primaryCurrency = costByCurrency[0]?.name ?? "ARS";

  const nameOf: Record<string, string> = {};
  for (const a of assets) nameOf[a.id] = a.tag ? `${a.tag} · ${a.name}` : a.name;

  const costByAsset = group(events
    .filter((e) => e.cost && (e.currency || "ARS") === primaryCurrency && nameOf[e.asset_id])
    .map((e) => ({ key: nameOf[e.asset_id], value: e.cost as number }))).slice(0, 8);

  const topFailures = group(events
    .filter((e) => e.type === "falla" && nameOf[e.asset_id])
    .map((e) => ({ key: nameOf[e.asset_id], value: 1 }))).slice(0, 8);

  const riskRanking = withHealth
    .map((a) => ({
      name: nameOf[a.id] ?? a.name,
      status: ASSET_STATUS_LABELS[a.status],
      criticidad: a.criticidad,
      health: a.health ?? 100,
      // Prioridad del §6.6: (100 − salud) × factor de criticidad. Reemplaza al `assetRisk`
      // viejo, que multiplicaba por la criticidad cruda (1-5) en lugar de por el factor.
      risk: a.zhi?.priority ?? 0,
    }))
    .filter((r) => r.risk > 0)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 10);

  return {
    total,
    operativos,
    criticalCount,
    atRiskCount,
    avgHealth,
    costByCurrency,
    primaryCurrency,
    byStatus: group(assets.map((a) => ({ key: ASSET_STATUS_LABELS[a.status], value: 1 }))),
    byType: group(assets.map((a) => ({ key: a.type ? ASSET_TYPE_LABELS[a.type] : "Otro", value: 1 }))),
    byCriticidad: group(assets.map((a) => ({ key: `${a.criticidad} · ${CRITICIDAD_LABELS[a.criticidad] ?? ""}`.trim(), value: 1 }))),
    costByAsset,
    topFailures,
    riskRanking,
  };
}

// ------------------------------------------------------- confiabilidad de la flota (§7.2)

/**
 * Confiabilidad a nivel flota: **medianas, nunca promedios**.
 *
 * El promedio lo arruina un solo equipo raro. Siete bombas que fallan cada 40-90 días más una
 * recién instalada que todavía no falló dan un promedio de ~600 días: el tablero diría que la
 * planta está impecable mientras seis bombas se paran cada dos meses. La mediana toma el valor
 * del medio y un extremo no la mueve.
 *
 * Los equipos sin dato no entran (no cuentan como 0) y los fuera de servicio tampoco: su número
 * no describe cómo se comporta la flota. `conDato` dice sobre cuántos equipos se calculó, para
 * que el tablero pueda ser honesto sobre su propia muestra.
 */
export interface FleetReliability {
  mtbfDays: number | null;
  mttrDays: number | null;
  availability: number | null;
  /** Cuántos equipos aportaron al menos un dato. */
  conDato: number;
}

/** La mediana de lo observado. Lista vacía ⇒ `null`: no se inventa un cero. */
function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function fleetReliability(assets: readonly Asset[]): FleetReliability {
  const vivos = assets.filter((a) => a.reliability && !a.zhi?.outOfService);
  const pick = <T,>(f: (r: NonNullable<Asset["reliability"]>) => T | null | undefined): T[] =>
    vivos.map((a) => f(a.reliability!)).filter((v): v is T => v !== null && v !== undefined);

  const mtbf = pick((r) => r.mtbfDays);
  const mttr = pick((r) => r.mttrHours);
  const avail = pick((r) => r.availability);

  const mttrMediana = median(mttr);

  return {
    mtbfDays: median(mtbf),
    // El MTTR se guarda en horas y se muestra en días, como el resto de la suite.
    mttrDays: mttrMediana === null ? null : Math.round(mttrMediana / 24),
    availability: median(avail),
    conDato: vivos.filter((a) => a.reliability!.mtbfDays !== null || a.reliability!.mttrHours !== null || a.reliability!.availability !== null).length,
  };
}

// ------------------------------------------------------- distribución por banda (para el donut)

/** Las bandas más los fuera de servicio, que NO son una banda sino un estado (§6.4). */
export type BandSlice = { band: ZhiBand | "fuera_de_servicio"; value: number };

/** Orden de gravedad: así se leen la leyenda y el donut de arriba hacia abajo. */
const BAND_ORDER: BandSlice["band"][] = ["sano", "atencion", "en_riesgo", "critico", "fuera_de_servicio"];

export function bandDistribution(assets: readonly Asset[]): BandSlice[] {
  const acc = new Map<BandSlice["band"], number>();
  for (const a of assets) {
    const k: BandSlice["band"] | null = a.zhi?.outOfService ? "fuera_de_servicio" : a.zhi?.band ?? null;
    if (k) acc.set(k, (acc.get(k) ?? 0) + 1);
  }
  // Las bandas vacías quedan afuera: un gajo de 0 no aporta nada y ensucia la leyenda.
  return BAND_ORDER.filter((b) => acc.has(b)).map((band) => ({ band, value: acc.get(band)! }));
}
