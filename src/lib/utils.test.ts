// utils.test.ts — src/lib/utils.test.ts — 2026-07-17
// Unit tests de helpers puros (formato de moneda, semáforo, vencimientos).

import { describe, it, expect } from "vitest";
import { formatCurrency, calculateTrafficLight, isOverdue } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formatea USD con símbolo y 2 decimales", () => {
    const s = formatCurrency(1000, "USD");
    expect(s).toContain("$");
    expect(s).toContain("1,000.00");
  });
  it("formatea ARS con agrupación es-AR", () => {
    expect(formatCurrency(1000, "ARS")).toContain("1.000,00");
  });
  it("maneja el cero", () => {
    expect(formatCurrency(0, "USD")).toContain("0.00");
  });
});

describe("calculateTrafficLight", () => {
  it("rojo cuando la lista está vacía", () => expect(calculateTrafficLight([], "done")).toBe("red"));
  it("verde cuando están todos completos", () => expect(calculateTrafficLight([{ done: true }, { done: true }], "done")).toBe("green"));
  it("amarillo cuando hay algunos", () => expect(calculateTrafficLight([{ done: true }, { done: false }], "done")).toBe("yellow"));
  it("rojo cuando no hay ninguno", () => expect(calculateTrafficLight([{ done: false }], "done")).toBe("red"));
});

describe("isOverdue", () => {
  it("false para null", () => expect(isOverdue(null)).toBe(false));
  it("true para fecha pasada", () => expect(isOverdue("2000-01-01")).toBe(true));
  it("false para fecha lejana futura", () => expect(isOverdue("2999-01-01")).toBe(false));
});
