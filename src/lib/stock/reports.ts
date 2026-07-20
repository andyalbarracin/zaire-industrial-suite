// reports.ts — src/lib/stock/reports.ts — 2026-07-18
// Cálculo PURO de los reportes de Stock (valuación, bajo mínimo, movimientos, consumo). Testable.

import type { StockLevel, StockMovement } from "@/lib/stock/types";

export interface NameValue { name: string; value: number }

export interface StockReport {
  totalValue: number;                 // suma cruda (deprecada; puede mezclar monedas). Usar valueByCurrency.
  valueByCurrency: NameValue[];       // valor de inventario POR moneda (name = 'ARS'|'USD')
  primaryCurrency: string;            // moneda con mayor valor (las distribuciones se calculan en ésta)
  skuCount: number;
  lowStockCount: number;
  warehouseCount: number;
  reservedUnits: number;
  valuationByWarehouse: NameValue[];  // en primaryCurrency (evita mezclar monedas en un mismo eje)
  valuationByCategory: NameValue[];   // en primaryCurrency
  lowStock: { product: string; warehouse: string; on_hand: number; min_qty: number }[];
  movementsByType: NameValue[];
  topConsumed: NameValue[];
}

const curOf = (l: StockLevel): string => l.product?.default_currency ?? "ARS";

const CATEGORY_LABELS: Record<string, string> = {
  sello_mecanico: "Sello mecánico", bomba: "Bomba", empaquetadura: "Empaquetadura", spare_part: "Repuesto", otro: "Otro",
};

function group(rows: { key: string; value: number }[]): NameValue[] {
  const acc: Record<string, number> = {};
  for (const r of rows) acc[r.key] = (acc[r.key] ?? 0) + r.value;
  return Object.entries(acc).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
}

export function computeStockReports(levels: StockLevel[], movements: StockMovement[]): StockReport {
  const totalValue = levels.reduce((a, l) => a + l.on_hand * l.avg_cost, 0);
  const reservedUnits = levels.reduce((a, l) => a + l.reserved, 0);
  const skuCount = new Set(levels.filter((l) => l.on_hand > 0).map((l) => l.product_id)).size;
  const warehouseCount = new Set(levels.map((l) => l.warehouse_id)).size;

  const lowLevels = levels.filter((l) => l.min_qty > 0 && l.on_hand <= l.min_qty);

  // Valuación POR moneda (nunca se suman monedas distintas). Las distribuciones usan la moneda dominante.
  const valueByCurrency = group(levels.map((l) => ({ key: curOf(l), value: l.on_hand * l.avg_cost })));
  const primaryCurrency = valueByCurrency[0]?.name ?? "ARS";
  const primaryLevels = levels.filter((l) => curOf(l) === primaryCurrency);

  return {
    totalValue,
    valueByCurrency,
    primaryCurrency,
    skuCount,
    lowStockCount: lowLevels.length,
    warehouseCount,
    reservedUnits,
    valuationByWarehouse: group(primaryLevels.map((l) => ({ key: l.warehouse?.name ?? "—", value: l.on_hand * l.avg_cost }))),
    valuationByCategory: group(primaryLevels.map((l) => ({ key: l.product?.category ? (CATEGORY_LABELS[l.product.category] ?? l.product.category) : "Sin categoría", value: l.on_hand * l.avg_cost }))),
    lowStock: lowLevels.map((l) => ({ product: l.product?.name ?? "—", warehouse: l.warehouse?.name ?? "—", on_hand: l.on_hand, min_qty: l.min_qty }))
      .sort((a, b) => a.on_hand - b.on_hand),
    movementsByType: group(movements.map((m) => ({ key: m.type, value: 1 }))),
    topConsumed: group(movements.filter((m) => m.type === "consumo").map((m) => ({ key: m.product?.name ?? "—", value: Math.abs(m.qty) }))).slice(0, 8),
  };
}
