// utils.test.ts — src/lib/utils.test.ts — 2026-07-17
// Unit tests de helpers puros (formato de moneda, semáforo, vencimientos).

import { describe, it, expect } from "vitest";
import { formatCurrency, calculateTrafficLight, isOverdue, daysUntilExpiry, expiryLight } from "@/lib/utils";

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

describe("vencimientos — semáforo unificado de la suite (4 niveles)", () => {
  // Medianoche local del 2026-10-12, misma convención que isOverdue / getDueDaysLabel.
  const HOY = new Date(2026, 9, 12, 14, 30).getTime(); // 12/10/2026 14:30 local

  describe("daysUntilExpiry", () => {
    it("sin fecha no hay días", () => {
      expect(daysUntilExpiry(null, HOY)).toBeNull();
      expect(daysUntilExpiry("", HOY)).toBeNull();
    });
    it("compara contra la medianoche local: lo que vence HOY da exactamente 0", () => {
      expect(daysUntilExpiry("2026-10-12", HOY)).toBe(0);
    });
    it("una fecha futura da positivo", () => {
      expect(daysUntilExpiry("2026-10-19", HOY)).toBe(7);
    });
    it("una fecha pasada da negativo", () => {
      expect(daysUntilExpiry("2026-10-11", HOY)).toBe(-1);
    });
    it("nunca devuelve -0 (se mostraría como '0' siendo que ya venció)", () => {
      const d = daysUntilExpiry("2026-10-12", HOY);
      expect(Object.is(d, -0)).toBe(false);
    });
  });

  describe("expiryLight", () => {
    it("sin días no hay semáforo", () => {
      expect(expiryLight(null)).toBeNull();
    });
    it("vencido es rojo", () => {
      expect(expiryLight(-1)).toBe("red");
      expect(expiryLight(-90)).toBe("red");
    });
    it("lo que vence hoy NO es rojo todavía: es naranja", () => {
      expect(expiryLight(0)).toBe("orange");
    });
    it("hasta 7 días es naranja", () => {
      expect(expiryLight(1)).toBe("orange");
      expect(expiryLight(7)).toBe("orange");
    });
    it("de 8 a 30 días es amarillo", () => {
      expect(expiryLight(8)).toBe("yellow");
      expect(expiryLight(30)).toBe("yellow");
    });
    it("más de 30 días es verde", () => {
      expect(expiryLight(31)).toBe("green");
      expect(expiryLight(999)).toBe("green");
    });
    it("usa los 4 niveles: Assets y Field comparten exactamente esta escala", () => {
      const escala = [-1, 0, 8, 31].map(expiryLight);
      expect(escala).toEqual(["red", "orange", "yellow", "green"]);
    });
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
