// reports.ts — src/lib/assets/reports.ts — 2026-07-20
// Cálculo PURO de los reportes de Zaire Assets (flota, costo/TCO, confiabilidad, riesgo). Testable.

import type { Asset, AssetEvent } from "@/lib/assets/types";
import { assetRisk } from "@/lib/assets/health";
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
      risk: assetRisk(a.health ?? 100, a.criticidad),
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
