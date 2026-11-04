// reliability-map.test.ts — src/lib/assets/reliability-map.test.ts — 2026-10-22
// El Mapa de confiabilidad (§7.4): ubicar cada equipo en uno de cuatro cuadrantes.

import { describe, it, expect } from "vitest";
import { buildReliabilityMap, QUADRANTS, type MapSubject } from "@/lib/assets/reliability-map";

/** Un equipo ubicable: MTBF observado, su referencia y el índice reactivo. */
const S = (o: Partial<MapSubject> & { id: string }): MapSubject => ({
  name: o.id, tag: null, criticidad: 3,
  mtbfHours: 1000, referenceHours: 1000, reactiveIndex: 0.5, outOfService: false,
  ...o,
});

const porId = (r: ReturnType<typeof buildReliabilityMap>, id: string) => r.points.find((p) => p.id === id)!;

describe("los cuatro cuadrantes", () => {
  it("falla poco + planificado = bajo control", () => {
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: 2000, referenceHours: 1000, reactiveIndex: 0.1 })]);
    expect(porId(r, "a").quadrant).toBe("bajo_control");
  });

  it("falla mucho + planificado = el plan no alcanza", () => {
    // Se le hace el preventivo y aun así se rompe: el plan existe pero no es suficiente.
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: 400, referenceHours: 1000, reactiveIndex: 0.1 })]);
    expect(porId(r, "a").quadrant).toBe("plan_insuficiente");
  });

  it("falla poco + reactivo = estable, sin plan", () => {
    // No se rompe seguido, pero cuando se lo toca es porque ya falló. Hoy zafa.
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: 2000, referenceHours: 1000, reactiveIndex: 0.9 })]);
    expect(porId(r, "a").quadrant).toBe("sin_plan");
  });

  it("falla mucho + reactivo = apagando incendios", () => {
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: 300, referenceHours: 1000, reactiveIndex: 0.9 })]);
    expect(porId(r, "a").quadrant).toBe("apagando_incendios");
  });

  it("los cuatro cuadrantes tienen nombre y explicación en lenguaje de planta", () => {
    for (const q of Object.values(QUADRANTS)) {
      expect(q.label.length).toBeGreaterThan(0);
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.label).not.toMatch(/MTBF|índice|eje/i);
    }
  });
});

describe("el eje X es RELATIVO a la referencia, no el MTBF crudo", () => {
  it("dos equipos con el mismo MTBF caen en lados distintos si su referencia difiere", () => {
    // 40 días entre fallas es excelente para una bomba exigida y pésimo para un motor nuevo.
    const r = buildReliabilityMap([
      S({ id: "exigida", mtbfHours: 1000, referenceHours: 500, reactiveIndex: 0.1 }),
      S({ id: "nueva", mtbfHours: 1000, referenceHours: 4000, reactiveIndex: 0.1 }),
    ]);
    expect(porId(r, "exigida").quadrant).toBe("bajo_control");
    expect(porId(r, "nueva").quadrant).toBe("plan_insuficiente");
  });

  it("justo en la referencia cuenta como que cumple", () => {
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: 1000, referenceHours: 1000, reactiveIndex: 0.1 })]);
    expect(porId(r, "a").quadrant).toBe("bajo_control");
  });

  it("el ratio se topea para que un equipo buenísimo no aplaste la escala", () => {
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: 999_999, referenceHours: 100 })]);
    expect(porId(r, "a").x).toBeLessThanOrEqual(3);
  });
});

describe("quién NO entra al mapa — y se dice, no se esconde", () => {
  it("sin MTBF observado no se puede ubicar", () => {
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: null })]);
    expect(r.points).toHaveLength(0);
    expect(r.excluded).toHaveLength(1);
    expect(r.excluded[0].reason).toBe("sin_fallas");
  });

  it("sin referencia no hay con qué comparar", () => {
    const r = buildReliabilityMap([S({ id: "a", referenceHours: null })]);
    expect(r.excluded[0].reason).toBe("sin_referencia");
  });

  it("sin índice reactivo tampoco", () => {
    const r = buildReliabilityMap([S({ id: "a", reactiveIndex: null })]);
    expect(r.excluded[0].reason).toBe("sin_intervenciones");
  });

  it("un equipo fuera de servicio no describe cómo se comporta la flota", () => {
    const r = buildReliabilityMap([S({ id: "a", outOfService: true })]);
    expect(r.excluded[0].reason).toBe("fuera_de_servicio");
  });

  it("cada motivo de exclusión trae su explicación para mostrar", () => {
    const r = buildReliabilityMap([
      S({ id: "a", mtbfHours: null }), S({ id: "b", referenceHours: null }),
      S({ id: "c", reactiveIndex: null }), S({ id: "d", outOfService: true }),
    ]);
    expect(r.excluded).toHaveLength(4);
    for (const e of r.excluded) expect(e.text.length).toBeGreaterThan(0);
  });

  it("una flota entera sin datos devuelve mapa vacío, no puntos en el origen", () => {
    const r = buildReliabilityMap([S({ id: "a", mtbfHours: null }), S({ id: "b", mtbfHours: null })]);
    expect(r.points).toEqual([]);
    expect(r.excluded).toHaveLength(2);
  });
});

describe("el punto", () => {
  it("el tamaño sale de la criticidad: lo crítico se ve más grande", () => {
    const r = buildReliabilityMap([S({ id: "baja", criticidad: 1 }), S({ id: "alta", criticidad: 5 })]);
    expect(porId(r, "alta").size).toBeGreaterThan(porId(r, "baja").size);
  });

  it("usa el TAG cuando existe", () => {
    const r = buildReliabilityMap([S({ id: "a", name: "Bomba 1", tag: "BBA-01" })]);
    expect(porId(r, "a").label).toBe("BBA-01 · Bomba 1");
  });

  it("el eje Y es el índice reactivo tal cual, de 0 a 1", () => {
    const r = buildReliabilityMap([S({ id: "a", reactiveIndex: 0.73 })]);
    expect(porId(r, "a").y).toBeCloseTo(0.73);
  });
});
