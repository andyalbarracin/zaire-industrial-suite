// reliability.test.ts — src/lib/assets/reliability.test.ts — 2026-10-02
// Tests del motor de confiabilidad por período: tiempo operativo, MTBF, MTBR, MTTR,
// disponibilidad, índice reactivo, tendencia, casos borde y confianza.
// Incluye el caso de validación público (Tractian): 8.400 h / 6 = 1.400 h.

import { describe, it, expect } from "vitest";
import { computeReliability, type ReliabilityEvent } from "@/lib/assets/reliability";

/** Evento mínimo; cada test sobreescribe lo que le importa. */
function ev(partial: Partial<ReliabilityEvent> & { event_date: string }): ReliabilityEvent {
  return {
    type: "servicio",
    cost: null,
    currency: "ARS",
    downtime_hours: null,
    ...partial,
  };
}

/** n eventos de intervención repartidos en días distintos, con downtime parejo. */
function interventions(count: number, downtimeEach: number, startDay = 1): ReliabilityEvent[] {
  return Array.from({ length: count }, (_, i) =>
    ev({ event_date: `2025-02-${String(startDay + i).padStart(2, "0")}`, type: "servicio", downtime_hours: downtimeEach }),
  );
}

describe("caso de validación del motor (Tractian)", () => {
  // 8.760 h calendario, 360 h de parada, 6 intervenciones → U = 8.400 h, MTBR = 1.400 h.
  const r = computeReliability({
    events: interventions(6, 60),
    periodStart: "2025-01-01",
    periodEnd: "2026-01-01",
    regimeHoursPerDay: 24,
  });

  it("el período son 365 días", () => {
    expect(r.periodDays).toBe(365);
  });
  it("el tiempo operativo es 8.400 h (8.760 calendario − 360 de parada)", () => {
    expect(r.operatingHours).toBe(8400);
  });
  it("cuenta las 6 intervenciones", () => {
    expect(r.interventions).toBe(6);
  });
  it("MTBR = 1.400 h exactas", () => {
    expect(r.mtbrHours).toBe(1400);
  });
});

describe("fuentes de tiempo operativo", () => {
  const base = { events: [], periodStart: "2025-01-01", periodEnd: "2026-01-01" } as const;

  it("el horómetro gana sobre todo lo demás", () => {
    const r = computeReliability({ ...base, operatingHours: 5000, regimeHoursPerDay: 24 });
    expect(r.operatingSource).toBe("horometro");
    expect(r.operatingHours).toBe(5000);
  });

  it("con régimen declarado usa calendario × régimen", () => {
    const r = computeReliability({ ...base, regimeHoursPerDay: 8 });
    expect(r.operatingSource).toBe("regimen");
    expect(r.operatingHours).toBe(365 * 8);
  });

  it("sin nada declarado cae a calendario puro y lo dice", () => {
    const r = computeReliability(base);
    expect(r.operatingSource).toBe("calendario");
    expect(r.operatingHours).toBe(365 * 24);
  });

  it("el tiempo operativo nunca es negativo aunque la parada supere el calendario", () => {
    const r = computeReliability({
      ...base,
      regimeHoursPerDay: 1,
      events: [ev({ event_date: "2025-06-01", downtime_hours: 99_999 })],
    });
    expect(r.operatingHours).toBe(0);
  });
});

describe("taxonomía: derivación desde `type` cuando los booleanos no existen", () => {
  it("una falla cuenta como falla y como intervención física", () => {
    const r = computeReliability({
      events: [ev({ event_date: "2025-06-01", type: "falla" })],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.failures).toBe(1);
    expect(r.interventions).toBe(1);
  });

  it("un servicio es intervención pero no falla", () => {
    const r = computeReliability({
      events: [ev({ event_date: "2025-06-01", type: "servicio" })],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.failures).toBe(0);
    expect(r.interventions).toBe(1);
  });

  it("inspección, lectura y nota no cuentan para ningún KPI", () => {
    const r = computeReliability({
      events: [
        ev({ event_date: "2025-06-01", type: "inspeccion" }),
        ev({ event_date: "2025-06-02", type: "lectura" }),
        ev({ event_date: "2025-06-03", type: "nota" }),
        ev({ event_date: "2025-06-04", type: "alta" }),
        ev({ event_date: "2025-06-05", type: "traslado" }),
      ],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.failures).toBe(0);
    expect(r.interventions).toBe(0);
  });

  it("el booleano explícito le gana a la derivación por `type`", () => {
    const r = computeReliability({
      events: [ev({ event_date: "2025-06-01", type: "servicio", es_falla: true })],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.failures).toBe(1);
  });

  it("un preventivo marcado explícitamente como no-falla no ensucia el MTBF", () => {
    const r = computeReliability({
      events: [ev({ event_date: "2025-06-01", type: "falla", es_falla: false, es_intervencion_fisica: true })],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.failures).toBe(0);
    expect(r.interventions).toBe(1);
  });
});

describe("ventana del período", () => {
  const window = { periodStart: "2025-01-01", periodEnd: "2026-01-01" } as const;

  it("descarta eventos anteriores al período", () => {
    const r = computeReliability({ ...window, events: [ev({ event_date: "2024-12-31", type: "falla" })] });
    expect(r.failures).toBe(0);
  });

  it("descarta eventos posteriores al período", () => {
    const r = computeReliability({ ...window, events: [ev({ event_date: "2026-01-02", type: "falla" })] });
    expect(r.failures).toBe(0);
  });

  it("descarta fechas corruptas sin propagar NaN", () => {
    const r = computeReliability({
      ...window,
      events: [
        ev({ event_date: "0006-01-08", type: "falla" }),   // caso real en producción
        ev({ event_date: "no-es-fecha", type: "falla" }),
        ev({ event_date: "2025-06-01", type: "falla", downtime_hours: 10 }),
      ],
      regimeHoursPerDay: 24,
    });
    expect(r.failures).toBe(1);
    expect(Number.isFinite(r.operatingHours)).toBe(true);
    expect(r.downtimeHours).toBe(10);
  });

  it("el período arranca en la puesta en servicio si es posterior al inicio calculado", () => {
    const r = computeReliability({ ...window, events: [], installedAt: "2025-07-01", regimeHoursPerDay: 24 });
    expect(r.periodStart).toBe("2025-07-01");
    expect(r.periodDays).toBe(184);
  });

  it("por defecto el período son los últimos 12 meses móviles", () => {
    const now = Date.parse("2026-06-15T00:00:00Z");
    const r = computeReliability({ events: [], now });
    expect(r.periodEnd).toBe("2026-06-15");
    expect(r.periodStart).toBe("2025-06-15");
  });
});

describe("dedupe de OT + OTS del mismo día", () => {
  it("dos intervenciones el mismo día cuentan como una y lo informa", () => {
    const r = computeReliability({
      events: [
        ev({ event_date: "2025-08-10", type: "servicio" }),
        ev({ event_date: "2025-08-10", type: "falla" }),
        ev({ event_date: "2025-08-18", type: "servicio" }),
      ],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.interventions).toBe(2);
    expect(r.dedupedSameDay).toBe(1);
  });

  it("aplica la misma regla a las fallas, para que F nunca supere a R", () => {
    const r = computeReliability({
      events: [
        ev({ event_date: "2025-08-10", type: "falla" }),
        ev({ event_date: "2025-08-10", type: "falla" }),
        ev({ event_date: "2025-08-18", type: "falla" }),
      ],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.failures).toBe(2);
    expect(r.failures).toBeLessThanOrEqual(r.interventions);
  });
});

describe("casos borde: no inventar números", () => {
  const window = { periodStart: "2025-01-01", periodEnd: "2026-01-01", regimeHoursPerDay: 24 } as const;

  it("sin fallas no devuelve infinito: MTBF es null y lo marca", () => {
    const r = computeReliability({ ...window, events: interventions(3, 0) });
    expect(r.mtbfHours).toBeNull();
    expect(r.noFailuresInPeriod).toBe(true);
    expect(r.availability).toBeNull();
  });

  it("con menos de 2 intervenciones marca datos insuficientes y no publica tasas", () => {
    const r = computeReliability({ ...window, events: [ev({ event_date: "2025-06-01", type: "falla" })] });
    expect(r.insufficientData).toBe(true);
    expect(r.mtbfHours).toBeNull();
    expect(r.mtbrHours).toBeNull();
    expect(r.reactiveIndex).toBeNull();
  });

  it("sin eventos no hay datos y nada se inventa", () => {
    const r = computeReliability({ ...window, events: [] });
    expect(r.insufficientData).toBe(true);
    expect(r.failures).toBe(0);
    expect(r.interventions).toBe(0);
    expect(r.mtbrHours).toBeNull();
    expect(r.mttrHours).toBeNull();
  });

  it("MTBF en días viene redondeado a entero (sin falsa precisión)", () => {
    const r = computeReliability({
      ...window,
      events: [
        ev({ event_date: "2025-03-01", type: "falla" }),
        ev({ event_date: "2025-06-01", type: "falla" }),
        ev({ event_date: "2025-09-01", type: "falla" }),
      ],
    });
    expect(r.mtbfDays).toBe(Math.round(r.mtbfHours! / 24));
    expect(Number.isInteger(r.mtbfDays)).toBe(true);
  });
});

describe("MTTR y disponibilidad", () => {
  const r = computeReliability({
    events: [
      ev({ event_date: "2025-03-01", type: "falla", downtime_hours: 12 }),
      ev({ event_date: "2025-09-01", type: "falla", downtime_hours: 8 }),
      ev({ event_date: "2025-06-01", type: "servicio", downtime_hours: 100 }),
    ],
    periodStart: "2025-01-01", periodEnd: "2026-01-01", regimeHoursPerDay: 24,
  });

  it("MTTR usa solo la parada de las fallas", () => {
    expect(r.mttrHours).toBe(10); // (12 + 8) / 2
  });

  it("la parada total incluye todos los eventos", () => {
    expect(r.downtimeHours).toBe(120);
  });

  it("la disponibilidad es MTBF / (MTBF + MTTR)", () => {
    expect(r.availability).toBe(Math.round((r.mtbfHours! / (r.mtbfHours! + r.mttrHours!)) * 1000) / 1000);
  });
});

describe("índice reactivo", () => {
  it("todas las intervenciones por falla da 1", () => {
    const r = computeReliability({
      events: [
        ev({ event_date: "2025-03-01", type: "falla" }),
        ev({ event_date: "2025-06-01", type: "falla" }),
      ],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.reactiveIndex).toBe(1);
  });

  it("1 falla de 4 intervenciones da 0,25", () => {
    const r = computeReliability({
      events: [
        ev({ event_date: "2025-03-01", type: "falla" }),
        ...interventions(3, 0),
      ],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(r.reactiveIndex).toBe(0.25);
  });

  it("MTBR es siempre menor o igual que MTBF", () => {
    const r = computeReliability({
      events: [
        ev({ event_date: "2025-03-01", type: "falla" }),
        ...interventions(3, 0),
      ],
      periodStart: "2025-01-01", periodEnd: "2026-01-01", regimeHoursPerDay: 24,
    });
    expect(r.mtbrHours!).toBeLessThanOrEqual(r.mtbfHours!);
  });
});

describe("tendencia", () => {
  // Intervalos: 30, 30, 30, 10, 10, 10 → últimos 3 promedian 10; los 3 anteriores, 30.
  const degradando = [
    "2026-01-01", "2026-01-31", "2026-03-02", "2026-04-01", "2026-04-11", "2026-04-21", "2026-05-01",
  ].map((d) => ev({ event_date: d, type: "servicio" }));

  it("intervalos que se acortan dan una tendencia menor a 1", () => {
    const r = computeReliability({ events: degradando, periodStart: "2026-01-01", periodEnd: "2026-06-01" });
    expect(r.trend).toBe(0.33);
  });

  it("sin 6 intervalos la tendencia es null en lugar de un número frágil", () => {
    const r = computeReliability({
      events: degradando.slice(0, 4),
      periodStart: "2026-01-01", periodEnd: "2026-06-01",
    });
    expect(r.trend).toBeNull();
  });
});

describe("confianza", () => {
  const window = { periodStart: "2025-01-01", periodEnd: "2026-01-01", regimeHoursPerDay: 24 } as const;

  it("baja con menos de 3 intervalos", () => {
    const r = computeReliability({ ...window, events: interventions(2, 0), installedAt: "2020-01-01" });
    expect(r.confidence).toBe("baja");
  });

  it("media entre 3 y 5 intervalos", () => {
    const r = computeReliability({ ...window, events: interventions(5, 0), installedAt: "2020-01-01" });
    expect(r.confidence).toBe("media");
  });

  it("alta con 6 o más intervalos y al menos 12 meses de historia", () => {
    const r = computeReliability({ ...window, events: interventions(7, 0), installedAt: "2020-01-01" });
    expect(r.confidence).toBe("alta");
  });

  it("no es alta si el equipo tiene menos de 12 meses de historia", () => {
    const r = computeReliability({ ...window, events: interventions(7, 0), installedAt: "2025-10-01" });
    expect(r.confidence).not.toBe("alta");
  });
});

describe("TCO por moneda", () => {
  const events = [
    ev({ event_date: "2025-03-01", type: "servicio", cost: 180_000, currency: "ARS" }),
    ev({ event_date: "2025-06-01", type: "falla", cost: 90_000, currency: "ARS" }),
    ev({ event_date: "2025-09-01", type: "servicio", cost: 500, currency: "USD" }),
    ev({ event_date: "2024-06-01", type: "servicio", cost: 1_000_000, currency: "ARS" }), // fuera del período
  ];
  const r = computeReliability({ events, periodStart: "2025-01-01", periodEnd: "2026-01-01" });

  it("nunca suma monedas distintas", () => {
    expect(r.costByCurrency).toEqual([
      { name: "ARS", value: 270_000 },
      { name: "USD", value: 500 },
    ]);
  });

  it("el costo del período excluye lo anterior, pero el acumulado lo incluye", () => {
    expect(r.costByCurrencyAllTime.find((c) => c.name === "ARS")?.value).toBe(1_270_000);
  });

  it("cuenta el costo de cualquier tipo de evento, no solo de intervenciones", () => {
    const withNote = computeReliability({
      events: [ev({ event_date: "2025-05-01", type: "nota", cost: 7_000, currency: "ARS" })],
      periodStart: "2025-01-01", periodEnd: "2026-01-01",
    });
    expect(withNote.costByCurrency).toEqual([{ name: "ARS", value: 7_000 }]);
  });
});
