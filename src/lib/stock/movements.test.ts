// movements.test.ts — src/lib/stock/movements.test.ts — 2026-07-18
// Tests de la lógica pura de Stock: WAC, disponibilidad, valuación y semáforo.

import { describe, it, expect } from "vitest";
import { computeWac, availableQty, hasAvailable, inventoryValue } from "@/lib/stock/movements";
import { stockLight } from "@/lib/stock/constants";

describe("computeWac (costo promedio ponderado)", () => {
  it("primera entrada fija el costo", () => {
    expect(computeWac(0, 0, 10, 100)).toBe(100);
  });
  it("promedia entrada nueva con el stock existente", () => {
    // (10*100 + 10*200) / 20 = 150
    expect(computeWac(10, 100, 10, 200)).toBe(150);
  });
  it("una salida (qty<=0) no cambia el WAC", () => {
    expect(computeWac(10, 150, -5, 0)).toBe(150);
  });
  it("si el nuevo stock queda <= 0, mantiene el costo previo", () => {
    expect(computeWac(0, 120, 0, 500)).toBe(120);
  });
});

describe("disponibilidad", () => {
  it("available = on_hand - reserved", () => {
    expect(availableQty(10, 3)).toBe(7);
  });
  it("hasAvailable respeta lo reservado", () => {
    expect(hasAvailable(10, 3, 7)).toBe(true);
    expect(hasAvailable(10, 3, 8)).toBe(false);
  });
  it("inventoryValue = on_hand * avg_cost", () => {
    expect(inventoryValue(10, 50)).toBe(500);
  });
});

describe("stockLight (semáforo de mínimo)", () => {
  it("rojo si está agotado", () => {
    expect(stockLight(0, 5)).toBe("red");
  });
  it("amarillo si está en o bajo el mínimo", () => {
    expect(stockLight(5, 5)).toBe("yellow");
    expect(stockLight(3, 5)).toBe("yellow");
  });
  it("verde si está por encima del mínimo", () => {
    expect(stockLight(10, 5)).toBe("green");
  });
  it("verde si no hay mínimo configurado (min=0)", () => {
    expect(stockLight(5, 0)).toBe("green");
  });
});
