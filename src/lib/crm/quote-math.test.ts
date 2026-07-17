// quote-math.test.ts — src/lib/crm/quote-math.test.ts — 2026-07-17
// Unit tests del cálculo de totales/márgenes de cotizaciones.

import { describe, it, expect } from "vitest";
import { computeQuoteTotals } from "@/lib/crm/quote-math";

describe("computeQuoteTotals", () => {
  it("calcula subtotal, costo, margen e impuesto", () => {
    const t = computeQuoteTotals(
      [
        { quantity: 2, unit_cost: 100, unit_price: 150 }, // subtotal 300, costo 200
        { quantity: 1, unit_cost: 50, unit_price: 100 },  // subtotal 100, costo 50
      ],
      21,
    );
    expect(t.subtotal).toBe(400);
    expect(t.totalCost).toBe(250);
    expect(t.marginAmount).toBe(150);
    expect(t.marginPct).toBeCloseTo(37.5, 5);
    expect(t.taxAmount).toBeCloseTo(84, 5);
    expect(t.total).toBeCloseTo(484, 5);
  });

  it("margen 0% cuando no hay subtotal (evita dividir por cero)", () => {
    const t = computeQuoteTotals([], 21);
    expect(t.subtotal).toBe(0);
    expect(t.marginPct).toBe(0);
    expect(t.total).toBe(0);
  });

  it("margen negativo cuando el costo supera el precio", () => {
    const t = computeQuoteTotals([{ quantity: 1, unit_cost: 200, unit_price: 150 }], 0);
    expect(t.marginAmount).toBe(-50);
    expect(t.marginPct).toBeCloseTo(-33.333, 2);
  });
});
