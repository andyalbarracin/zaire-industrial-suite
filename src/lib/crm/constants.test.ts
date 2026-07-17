// constants.test.ts — src/lib/crm/constants.test.ts — 2026-07-17
// Unit tests de la lógica pura del CRM: transiciones de lead y paleta de colores de etapas.

import { describe, it, expect } from "vitest";
import { LEAD_STATUS_TRANSITIONS, STAGE_PALETTE, stageDot, stageBadge } from "@/lib/crm/constants";

describe("LEAD_STATUS_TRANSITIONS", () => {
  it("un lead nuevo puede pasar a contactado o descartado", () => {
    expect(LEAD_STATUS_TRANSITIONS.nuevo).toEqual(["contactado", "descartado"]);
  });
  it("calificado puede convertir o descartar", () => {
    expect(LEAD_STATUS_TRANSITIONS.calificado).toEqual(["convertido", "descartado"]);
  });
  it("convertido y descartado son terminales", () => {
    expect(LEAD_STATUS_TRANSITIONS.convertido).toEqual([]);
    expect(LEAD_STATUS_TRANSITIONS.descartado).toEqual([]);
  });
});

describe("colores de etapa", () => {
  it("un color conocido mapea a una clase de Tailwind", () => {
    expect(stageDot("blue")).toContain("blue");
    expect(stageBadge("green")).toContain("green");
  });
  it("un color desconocido cae a slate (fallback)", () => {
    expect(stageDot("noexiste")).toBe(stageDot("slate"));
    expect(stageBadge("noexiste")).toBe(stageBadge("slate"));
  });
  it("la paleta no tiene colores duplicados", () => {
    expect(new Set(STAGE_PALETTE).size).toBe(STAGE_PALETTE.length);
  });
});
