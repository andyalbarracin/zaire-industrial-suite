// reliability.test.ts — src/lib/assets/reliability.test.ts — 2026-07-20
// Tests de confiabilidad/costo desde la hoja de vida: TCO por moneda, MTBF, MTTR, disponibilidad.

import { describe, it, expect } from "vitest";
import { computeReliability } from "@/lib/assets/reliability";

const NOW = Date.parse("2026-07-20T00:00:00Z");
const events = [
  { type: "alta",     event_date: "2020-07-20", cost: null,   currency: "ARS", downtime_hours: null },
  { type: "servicio", event_date: "2021-01-01", cost: 180000, currency: "ARS", downtime_hours: 6 },
  { type: "falla",    event_date: "2025-07-20", cost: 90000,  currency: "ARS", downtime_hours: 12 },
  { type: "falla",    event_date: "2026-01-20", cost: 60000,  currency: "ARS", downtime_hours: 8 },
];

describe("computeReliability", () => {
  const r = computeReliability(events, "2020-07-20", NOW);

  it("TCO por moneda = suma de costos (sin mezclar monedas)", () => {
    expect(r.costByCurrency).toEqual([{ name: "ARS", value: 330000 }]);
  });
  it("cuenta las fallas", () => {
    expect(r.failureCount).toBe(2);
  });
  it("MTBF = días entre la primera y última falla / (n-1)", () => {
    expect(r.mtbfDays).toBe(184);
  });
  it("MTTR = horas de parada promedio por falla", () => {
    expect(r.mttrHours).toBe(10); // (12 + 8) / 2
  });
  it("suma la parada total", () => {
    expect(r.totalDowntimeHours).toBe(26); // 6 + 12 + 8
  });
  it("disponibilidad alta (poca parada sobre un período largo)", () => {
    expect(r.availability).toBeGreaterThan(0.99);
  });
});
