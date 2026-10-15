// kpi-text.test.ts — src/lib/assets/kpi-text.test.ts — 2026-10-15
// Tests de la traducción de los KPI de confiabilidad a lenguaje de taller (§7.1 del análisis).
// La sigla va chica con tooltip; el protagonista es la frase.

import { describe, it, expect } from "vitest";
import { buildReliabilityKpis, operatingSourceText, downtimeSourceText } from "@/lib/assets/kpi-text";
import { computeReliability, type ReliabilityEvent } from "@/lib/assets/reliability";

function ev(p: Partial<ReliabilityEvent> & { event_date: string }): ReliabilityEvent {
  return { type: "servicio", cost: null, currency: "ARS", downtime_hours: null, ...p };
}

const VENTANA = { periodStart: "2025-01-01", periodEnd: "2026-01-01" } as const;

/** Un equipo con 2 fallas y 2 preventivos: todos los KPI calculables. */
function conHistoria() {
  return computeReliability({
    ...VENTANA,
    regimeHoursPerDay: 24,
    events: [
      ev({ event_date: "2025-03-01", type: "falla", downtime_hours: 48 }),
      ev({ event_date: "2025-06-01", type: "servicio", downtime_hours: 8 }),
      ev({ event_date: "2025-09-01", type: "falla", downtime_hours: 48 }),
      ev({ event_date: "2025-11-01", type: "servicio", downtime_hours: 8 }),
    ],
  });
}

const porSigla = (r: ReturnType<typeof conHistoria>, sigla: string) =>
  buildReliabilityKpis(r).find((k) => k.sigla === sigla)!;

describe("buildReliabilityKpis — la frase es la protagonista", () => {
  const rel = conHistoria();
  const kpis = buildReliabilityKpis(rel);

  it("devuelve los 5 KPI de confiabilidad", () => {
    expect(kpis.map((k) => k.sigla)).toEqual(["MTBF", "MTBR", "MTTR", "Disponibilidad", "Índice reactivo"]);
  });

  it("cada KPI trae frase, sigla y tooltip", () => {
    for (const k of kpis) {
      expect(k.value.length).toBeGreaterThan(0);
      expect(k.sigla.length).toBeGreaterThan(0);
      expect(k.tooltip.length).toBeGreaterThan(0);
    }
  });

  it("MTBF se cuenta en DÍAS y en lenguaje de taller", () => {
    const k = porSigla(rel, "MTBF");
    expect(k.value).toMatch(/^Falla cada ~\d+ días$/);
  });

  it("MTBR habla de intervenir, no de reparar", () => {
    expect(porSigla(rel, "MTBR").value).toMatch(/^Lo intervenimos cada ~\d+ días$/);
  });

  it("MTTR dice cuánto tarda en VOLVER, que es lo que le importa al taller", () => {
    // 48 h de parada por falla → 2 días
    expect(porSigla(rel, "MTTR").value).toBe("Vuelve a operar en ~2 días");
  });

  it("la disponibilidad se dice como porcentaje de tiempo operativo", () => {
    expect(porSigla(rel, "Disponibilidad").value).toMatch(/^Operativo el \d+% del tiempo$/);
  });

  it("el índice reactivo se dice como 'X de cada 10'", () => {
    // 2 fallas de 4 intervenciones = 0,5 → 5 de cada 10
    expect(porSigla(rel, "Índice reactivo").value).toBe("5 de cada 10 intervenciones fueron por falla");
  });

  it("ninguna frase filtra la fórmula ni el nombre del sub-índice (D6)", () => {
    for (const k of kpis) {
      expect(k.value).not.toMatch(/[×*/]|peso|sub-índice|MTBF_|coldStart/);
    }
  });
});

describe("casos borde — nunca un 0 ni un infinito inventado", () => {
  it("sin fallas lo dice con palabras, no con un guion", () => {
    const rel = computeReliability({
      ...VENTANA, regimeHoursPerDay: 24,
      events: [ev({ event_date: "2025-03-01" }), ev({ event_date: "2025-09-01" })],
    });
    expect(porSigla(rel, "MTBF").value).toBe("Sin fallas en el período");
    expect(porSigla(rel, "MTTR").value).toBe("Sin fallas en el período");
  });

  it("con menos de 2 intervenciones avisa que faltan datos, e invita", () => {
    const rel = computeReliability({
      ...VENTANA, regimeHoursPerDay: 24,
      events: [ev({ event_date: "2025-03-01", type: "falla" })],
    });
    const k = porSigla(rel, "MTBR");
    expect(k.value).toContain("Datos insuficientes");
    expect(k.hint).toBeTruthy();
  });

  it("sin intervenciones el índice reactivo no se inventa", () => {
    const rel = computeReliability({ ...VENTANA, events: [] });
    expect(porSigla(rel, "Índice reactivo").value).toBe("Sin intervenciones en el período");
  });

  it("la disponibilidad sin fallas no se puede calcular y lo dice", () => {
    const rel = computeReliability({
      ...VENTANA, regimeHoursPerDay: 24,
      events: [ev({ event_date: "2025-03-01" }), ev({ event_date: "2025-09-01" })],
    });
    expect(porSigla(rel, "Disponibilidad").value).toBe("Sin fallas en el período");
  });

  it("redondea a días enteros: nunca 20,83", () => {
    const rel = conHistoria();
    for (const k of buildReliabilityKpis(rel)) {
      expect(k.value).not.toMatch(/\d+[.,]\d/);
    }
  });
});

describe("la fuente del dato — honestidad del número", () => {
  it("dice cuando el tiempo operativo salió del horómetro", () => {
    expect(operatingSourceText("horometro", null)).toContain("horómetro");
  });
  it("dice el régimen cuando se estimó con él", () => {
    expect(operatingSourceText("regimen", 16)).toContain("16");
  });
  it("sin régimen declarado avisa que es calendario, no horas de operación", () => {
    expect(operatingSourceText("calendario", null).toLowerCase()).toContain("calendario");
  });

  it("dice si la parada salió de fechas o de horas cargadas a mano", () => {
    expect(downtimeSourceText("fechas")!.toLowerCase()).toContain("fecha");
    expect(downtimeSourceText("manual")!.toLowerCase()).toContain("mano");
    expect(downtimeSourceText("mixto")).toBeTruthy();
  });
  it("sin dato de parada no inventa una fuente", () => {
    expect(downtimeSourceText("sin_dato")).toBeNull();
  });

  it("los KPI que dependen de la parada llevan la fuente; los que no, no", () => {
    const rel = conHistoria();
    expect(porSigla(rel, "MTTR").source).toBeTruthy();
    expect(porSigla(rel, "Índice reactivo").source).toBeNull();
  });
});
