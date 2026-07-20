// reports.test.ts — src/lib/stock/reports.test.ts — 2026-07-18
// Tests del cálculo de reportes de Stock (valuación, SKUs, bajo mínimo, movimientos, consumo).

import { describe, it, expect } from "vitest";
import { computeStockReports } from "@/lib/stock/reports";
import type { StockLevel, StockMovement } from "@/lib/stock/types";

const levels = [
  { product_id: "p1", warehouse_id: "w1", on_hand: 10, reserved: 2, avg_cost: 100, min_qty: 5, product: { name: "Sello A", category: "sello_mecanico" }, warehouse: { name: "Central" } },
  { product_id: "p2", warehouse_id: "w1", on_hand: 3, reserved: 0, avg_cost: 50, min_qty: 5, product: { name: "Repuesto B", category: "spare_part" }, warehouse: { name: "Central" } },
  { product_id: "p1", warehouse_id: "w2", on_hand: 0, reserved: 0, avg_cost: 100, min_qty: 0, product: { name: "Sello A", category: "sello_mecanico" }, warehouse: { name: "NOA" } },
] as unknown as StockLevel[];

const movements = [
  { type: "entrada", qty: 10, product: { name: "Sello A" } },
  { type: "consumo", qty: -4, product: { name: "Sello A" } },
  { type: "consumo", qty: -1, product: { name: "Repuesto B" } },
] as unknown as StockMovement[];

describe("computeStockReports", () => {
  const rep = computeStockReports(levels, movements);

  it("valor total = suma de on_hand * WAC", () => {
    expect(rep.totalValue).toBe(1150); // 10*100 + 3*50 + 0
  });
  it("cuenta SKUs con stock (>0)", () => {
    expect(rep.skuCount).toBe(2);
  });
  it("cuenta líneas bajo mínimo", () => {
    expect(rep.lowStockCount).toBe(1); // p2: 3 <= 5
  });
  it("cuenta depósitos distintos", () => {
    expect(rep.warehouseCount).toBe(2);
  });
  it("suma unidades reservadas", () => {
    expect(rep.reservedUnits).toBe(2);
  });
  it("valuación por depósito filtra los de valor 0", () => {
    expect(rep.valuationByWarehouse).toEqual([{ name: "Central", value: 1150 }]);
  });
  it("agrupa movimientos por tipo", () => {
    expect(rep.movementsByType.find((m) => m.name === "consumo")?.value).toBe(2);
    expect(rep.movementsByType.find((m) => m.name === "entrada")?.value).toBe(1);
  });
  it("top consumidos ordenado por cantidad", () => {
    expect(rep.topConsumed[0]).toEqual({ name: "Sello A", value: 4 });
  });
});

describe("valuación multi-moneda", () => {
  const mixed = [
    { product_id: "p1", warehouse_id: "w1", on_hand: 2, reserved: 0, avg_cost: 100, min_qty: 0, product: { name: "A", default_currency: "USD" }, warehouse: { name: "W1" } },
    { product_id: "p2", warehouse_id: "w1", on_hand: 10, reserved: 0, avg_cost: 50, min_qty: 0, product: { name: "B", default_currency: "ARS" }, warehouse: { name: "W1" } },
  ] as unknown as StockLevel[];
  const rep = computeStockReports(mixed, []);

  it("agrupa el valor por moneda sin sumarlas", () => {
    expect(rep.valueByCurrency).toEqual([{ name: "ARS", value: 500 }, { name: "USD", value: 200 }]);
  });
  it("primaryCurrency = la de mayor valor", () => {
    expect(rep.primaryCurrency).toBe("ARS");
  });
  it("las distribuciones usan solo la moneda dominante", () => {
    expect(rep.valuationByWarehouse).toEqual([{ name: "W1", value: 500 }]);
  });
});
