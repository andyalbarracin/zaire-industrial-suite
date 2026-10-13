// zhi.test.ts — src/lib/assets/zhi.test.ts — 2026-10-12
// Tests del Zaire Health Index: los 5 sub-índices, arranque en frío, renormalización de pesos,
// topes, bandas, confianza, motivos y prioridad de atención.

import { describe, it, expect } from "vitest";
import { computeZhi, ZHI_VERSION, ZHI_WEIGHTS, type ZhiInput } from "@/lib/assets/zhi";

/** Equipo "perfecto": con estos valores los 4 sub-índices calculables dan 100 → salud 100. */
const BASE: ZhiInput = {
  status: "operativo",
  criticidad: 3,
  operatingHours: 8000,
  failures: 0,
  interventions: 0,
  reactiveIndex: null,
  trend: null,
  confidence: "baja",
  daysSinceLastFailure: null,
  mtbfReferenceHours: 1000,
  mtbrReferenceHours: 500,
  expiredInspections: 0,
  expiredCriticalDocs: 0,
  docsExpiringSoon: 0,
  camposFichaFaltantes: [],
  maintenanceCost12m: 0,
  replacementValue: 100_000,
  ageYears: 1,
  expectedLifeYears: 10,
};

const zhi = (p: Partial<ZhiInput> = {}) => computeZhi({ ...BASE, ...p });

describe("contrato y versión", () => {
  it("el algoritmo lleva versión: sin ella un número histórico no se puede explicar", () => {
    expect(ZHI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(zhi().version).toBe(ZHI_VERSION);
  });

  it("los pesos suman 1", () => {
    const suma = Object.values(ZHI_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(1, 10);
  });

  it("los pesos son los del análisis §6.2", () => {
    expect(ZHI_WEIGHTS).toEqual({
      confiabilidad: 0.30,
      cargaMantenimiento: 0.20,
      tendencia: 0.20,
      integridad: 0.20,
      costoVidaUtil: 0.10,
    });
  });
});

describe("el caso perfecto", () => {
  const r = zhi();
  it("da 100 y banda sano", () => {
    expect(r.score).toBe(100);
    expect(r.band).toBe("sano");
  });
  it("no aplica ningún tope", () => {
    expect(r.capApplied).toBeNull();
  });
  it("no tiene motivos que mostrar", () => {
    expect(r.motivos).toEqual([]);
  });
});

describe("sub-índice Confiabilidad — 100 × min(1, MTBF_est / MTBF_ref)", () => {
  it("arranque en frío: sin fallas el estimador parte de la referencia y sube con el uso", () => {
    // MTBF_est = (2×1000 + 8000) / (2+0) = 5000 → ratio 5 → tope 1 → 100
    expect(zhi().subIndices.confiabilidad).toBe(100);
  });

  it("con fallas reales la referencia pierde influencia y el sub-índice baja", () => {
    // MTBF_est = (2×1000 + 1000) / (2+4) = 500 → ratio 0,5 → 50
    expect(zhi({ operatingHours: 1000, failures: 4 }).subIndices.confiabilidad).toBe(50);
  });

  it("un equipo que falla mucho menos de lo esperado no pasa de 100", () => {
    expect(zhi({ operatingHours: 999_999 }).subIndices.confiabilidad).toBe(100);
  });

  it("sin referencia no se puede calcular: null, no un número inventado", () => {
    expect(zhi({ mtbfReferenceHours: null }).subIndices.confiabilidad).toBeNull();
  });
});

describe("sub-índice Carga de mantenimiento — 0,6 × ratio MTBR + 0,4 × (1 − índice reactivo)", () => {
  it("combina las dos partes con sus pesos", () => {
    // MTBR_est = (2×500 + 2000)/(2+4) = 500 → ratio 1 → 0,6
    // índice reactivo 0,5 → 0,4 × 0,5 = 0,2  ⇒  0,8 → 80
    const r = zhi({ operatingHours: 2000, interventions: 4, failures: 2, reactiveIndex: 0.5 });
    expect(r.subIndices.cargaMantenimiento).toBe(80);
  });

  it("sin intervenciones no hay nada reactivo: el término reactivo vale lo máximo", () => {
    expect(zhi().subIndices.cargaMantenimiento).toBe(100);
  });

  it("todo reactivo castiga el 40% del sub-índice", () => {
    // ratio MTBR tope 1 → 0,6 ; índice reactivo 1 → 0,4 × 0 = 0  ⇒  0,6 → 60
    const r = zhi({ operatingHours: 999_999, interventions: 3, failures: 3, reactiveIndex: 1 });
    expect(r.subIndices.cargaMantenimiento).toBe(60);
  });

  it("sin referencia de MTBR no se puede calcular", () => {
    expect(zhi({ mtbrReferenceHours: null }).subIndices.cargaMantenimiento).toBeNull();
  });
});

describe("sub-índice Tendencia — ≥1 → 100, ≤0,5 → 0, lineal en el medio", () => {
  it("intervalos estables o que se alargan dan 100", () => {
    expect(zhi({ trend: 1 }).subIndices.tendencia).toBe(100);
    expect(zhi({ trend: 1.8 }).subIndices.tendencia).toBe(100);
  });
  it("intervalos que se parten al medio dan 0", () => {
    expect(zhi({ trend: 0.5 }).subIndices.tendencia).toBe(0);
    expect(zhi({ trend: 0.2 }).subIndices.tendencia).toBe(0);
  });
  it("es lineal entre 0,5 y 1", () => {
    expect(zhi({ trend: 0.75 }).subIndices.tendencia).toBe(50);
  });
  it("sin suficientes intervalos la tendencia no existe: null", () => {
    expect(zhi({ trend: null }).subIndices.tendencia).toBeNull();
  });
});

describe("sub-índice Integridad — 100 menos penalizaciones", () => {
  it("sin nada vencido ni faltante vale 100", () => {
    expect(zhi().subIndices.integridad).toBe(100);
  });
  it("una inspección vencida resta 40", () => {
    expect(zhi({ expiredInspections: 1 }).subIndices.integridad).toBe(60);
  });
  it("un certificado o garantía crítica vencida resta 25", () => {
    expect(zhi({ expiredCriticalDocs: 1 }).subIndices.integridad).toBe(75);
  });
  it("algo por vencer dentro de 30 días resta 10", () => {
    expect(zhi({ docsExpiringSoon: 1 }).subIndices.integridad).toBe(90);
  });
  it("la ficha incompleta resta 10, sin importar cuántos campos falten", () => {
    expect(zhi({ camposFichaFaltantes: ["serie"] }).subIndices.integridad).toBe(90);
    expect(zhi({ camposFichaFaltantes: ["serie", "ubicacion", "criticidad"] }).subIndices.integridad).toBe(90);
  });
  it("la penalización es por CATEGORÍA, no por ítem: 3 inspecciones vencidas restan 40, no 120", () => {
    expect(zhi({ expiredInspections: 3 }).subIndices.integridad).toBe(60);
  });

  it("las penalizaciones de distintas categorías se acumulan", () => {
    // 40 (inspección) + 25 (doc crítico) + 10 (por vencer) + 10 (ficha) = 85 → 15
    const r = zhi({ expiredInspections: 3, expiredCriticalDocs: 3, docsExpiringSoon: 3, camposFichaFaltantes: ["x"] });
    expect(r.subIndices.integridad).toBe(15);
  });

  it("nunca sale del rango 0-100", () => {
    const peor = zhi({ expiredInspections: 1, expiredCriticalDocs: 1, docsExpiringSoon: 1, camposFichaFaltantes: ["x"] });
    expect(peor.subIndices.integridad).toBeGreaterThanOrEqual(0);
    expect(peor.subIndices.integridad).toBeLessThanOrEqual(100);
  });
  it("nunca es null: sin datos simplemente no hay penalizaciones", () => {
    expect(zhi().subIndices.integridad).not.toBeNull();
  });
});

describe("sub-índice Costo y vida útil", () => {
  it("sin costo acumulado vale 100", () => {
    expect(zhi().subIndices.costoVidaUtil).toBe(100);
  });
  it("gastar la mitad del umbral (50% del valor de reposición) lo deja en 50", () => {
    // 1 − 25.000 / (100.000 × 0,5) = 0,5 → 50
    expect(zhi({ maintenanceCost12m: 25_000 }).subIndices.costoVidaUtil).toBe(50);
  });
  it("gastar más que el umbral no baja de 0", () => {
    expect(zhi({ maintenanceCost12m: 999_999 }).subIndices.costoVidaUtil).toBe(0);
  });
  it("superar la vida útil esperada resta 15 puntos adicionales", () => {
    expect(zhi({ ageYears: 12, expectedLifeYears: 10 }).subIndices.costoVidaUtil).toBe(85);
  });
  it("sin valor de reposición no se puede calcular", () => {
    expect(zhi({ replacementValue: null }).subIndices.costoVidaUtil).toBeNull();
  });
});

describe("renormalización: un sub-índice que no se puede calcular NO cuenta como 0", () => {
  it("con tendencia null el score sigue siendo 100 (se reparte su peso)", () => {
    expect(zhi({ trend: null }).score).toBe(100);
  });

  it("si falta un sub-índice, los pesos de los que quedan se renormalizan a 1", () => {
    // Sin valor de reposición queda fuera Costo (.10). Quedan confiabilidad .30,
    // carga .20, tendencia .20, integridad .20 → suma 0,90.
    // Con una inspección vencida, integridad = 60.
    // score = (.30×100 + .20×100 + .20×100 + .20×60) / 0,90 = 82/0,9 = 91,1 → 91
    const r = zhi({ replacementValue: null, trend: 1, expiredInspections: 1, criticidad: 1 });
    expect(r.subIndices.costoVidaUtil).toBeNull();
    expect(r.subIndices.integridad).toBe(60);
    expect(r.score).toBe(91);
  });

  it("un sub-índice null NO arrastra el score como si fuera 0", () => {
    // Si Costo contara 0, el score sería (.30×100+.20×100+.20×100+.20×60+.10×0) = 82 → 82.
    // Renormalizando da 91. La diferencia es exactamente el daño que haría contarlo como 0.
    const conNull = zhi({ replacementValue: null, trend: 1, expiredInspections: 1, criticidad: 1 });
    const conCero = zhi({ replacementValue: 100_000, maintenanceCost12m: 999_999, trend: 1, expiredInspections: 1, criticidad: 1 });
    expect(conCero.subIndices.costoVidaUtil).toBe(0);
    expect(conNull.score!).toBeGreaterThan(conCero.score!);
  });

  it("si no se puede calcular ningún sub-índice ponderable, no se inventa un número", () => {
    const r = computeZhi({
      ...BASE, mtbfReferenceHours: null, mtbrReferenceHours: null, trend: null,
      replacementValue: null, expiredInspections: 0, camposFichaFaltantes: [],
    });
    // Integridad sigue siendo calculable, así que SÍ hay score: es el único que queda.
    expect(r.subIndices.integridad).toBe(100);
    expect(r.score).toBe(100);
  });
});

describe("topes: reglas duras que le ganan al promedio", () => {
  it("equipo en reparación: estado fuera de servicio, sin número", () => {
    const r = zhi({ status: "en_reparacion" });
    expect(r.outOfService).toBe(true);
    expect(r.score).toBeNull();
    expect(r.band).toBeNull();
  });

  it("equipo dado de baja: tampoco tiene sentido una salud", () => {
    const r = zhi({ status: "baja" });
    expect(r.outOfService).toBe(true);
    expect(r.score).toBeNull();
  });

  it("una falla en los últimos 14 días no puede figurar como sano: tope 79", () => {
    const r = zhi({ daysSinceLastFailure: 3 });
    expect(r.score).toBe(79);
    expect(r.band).toBe("atencion");
    expect(r.capApplied).toContain("14 días");
  });

  it("a los 15 días el tope ya no aplica", () => {
    expect(zhi({ daysSinceLastFailure: 15 }).score).toBe(100);
  });

  it("inspección vencida en equipo de criticidad alta: tope 59", () => {
    const r = zhi({ expiredInspections: 1, criticidad: 5, trend: 1 });
    expect(r.score).toBe(59);
    expect(r.band).toBe("en_riesgo");
    expect(r.capApplied).toContain("inspección");
  });

  it("la misma inspección vencida en criticidad baja NO aplica el tope", () => {
    const r = zhi({ expiredInspections: 1, criticidad: 2, trend: 1 });
    expect(r.score).toBeGreaterThan(59);
    expect(r.capApplied).toBeNull();
  });

  it("un tope solo baja: nunca sube una salud que ya estaba peor", () => {
    const r = zhi({ daysSinceLastFailure: 1, expiredInspections: 2, expiredCriticalDocs: 2, criticidad: 1, trend: 0.5 });
    expect(r.score).toBeLessThan(79);
  });
});

describe("bandas — cortes en 80 / 60 / 40", () => {
  // Para aislar los cortes se dejan todos los sub-índices en null menos Integridad,
  // así el score ES el valor de Integridad. Criticidad baja para que no entre ningún tope.
  const soloIntegridad = (p: Partial<ZhiInput>) =>
    zhi({ mtbfReferenceHours: null, mtbrReferenceHours: null, trend: null, replacementValue: null, criticidad: 1, ...p });

  it("100 → sano", () => {
    const r = soloIntegridad({});
    expect(r.score).toBe(100);
    expect(r.band).toBe("sano");
  });

  it("80 justo → sano (el corte es inclusivo)", () => {
    // 100 − 10 (por vencer) − 10 (ficha) = 80
    const r = soloIntegridad({ docsExpiringSoon: 1, camposFichaFaltantes: ["serie"] });
    expect(r.score).toBe(80);
    expect(r.band).toBe("sano");
  });

  it("60 justo → atención", () => {
    const r = soloIntegridad({ expiredInspections: 1 });
    expect(r.score).toBe(60);
    expect(r.band).toBe("atencion");
  });

  it("50 → en riesgo", () => {
    // 100 − 40 (inspección) − 10 (por vencer) = 50
    const r = soloIntegridad({ expiredInspections: 1, docsExpiringSoon: 1 });
    expect(r.score).toBe(50);
    expect(r.band).toBe("en_riesgo");
  });

  it("35 → crítico", () => {
    // 100 − 40 (inspección) − 25 (doc crítico) = 35
    const r = soloIntegridad({ expiredInspections: 1, expiredCriticalDocs: 1 });
    expect(r.score).toBe(35);
    expect(r.band).toBe("critico");
  });

  it("79 (el tope por falla reciente) cae en atención, no en sano", () => {
    const r = zhi({ daysSinceLastFailure: 1, trend: 1 });
    expect(r.score).toBe(79);
    expect(r.band).toBe("atencion");
  });
});

describe("confianza", () => {
  it("se propaga tal cual viene del motor de confiabilidad", () => {
    expect(zhi({ confidence: "alta" }).confidence).toBe("alta");
    expect(zhi({ confidence: "media" }).confidence).toBe("media");
    expect(zhi({ confidence: "baja" }).confidence).toBe("baja");
  });
});

describe("motivos — los 2 sub-índices que más puntos restan", () => {
  it("devuelve como máximo 2", () => {
    const r = zhi({ trend: 0.5, expiredInspections: 1, maintenanceCost12m: 50_000, operatingHours: 100, failures: 9, criticidad: 1 });
    expect(r.motivos.length).toBeLessThanOrEqual(2);
  });

  it("los ordena por puntos restados, de mayor a menor", () => {
    const r = zhi({ trend: 0.5, expiredInspections: 1, criticidad: 1 });
    expect(r.motivos.length).toBe(2);
    expect(r.motivos[0].puntosRestados).toBeGreaterThanOrEqual(r.motivos[1].puntosRestados);
  });

  it("los puntos restados son peso × (100 − sub-índice)", () => {
    // tendencia 0,5 → sub 0 → resta 0,20 × 100 = 20
    const r = zhi({ trend: 0.5, criticidad: 1 });
    const tend = r.motivos.find((m) => m.subIndice === "tendencia");
    expect(tend?.puntosRestados).toBe(20);
  });

  it("cada motivo trae un texto en lenguaje de planta, no una fórmula", () => {
    const r = zhi({ expiredInspections: 1, criticidad: 1, trend: 1 });
    const integ = r.motivos.find((m) => m.subIndice === "integridad");
    expect(integ?.texto).toBeTruthy();
    expect(integ!.texto.toLowerCase()).toContain("inspec");
    // D6: la UI nunca muestra el cálculo. El texto no puede filtrar la aritmética.
    expect(integ!.texto).not.toMatch(/[×*]|peso|sub-índice|0\.\d/);
  });

  it("un sub-índice que no se pudo calcular no genera motivo", () => {
    const r = zhi({ mtbfReferenceHours: null, trend: 1 });
    expect(r.motivos.some((m) => m.subIndice === "confiabilidad")).toBe(false);
  });

  it("un equipo fuera de servicio no tiene motivos de salud", () => {
    expect(zhi({ status: "en_reparacion", trend: 0.5 }).motivos).toEqual([]);
  });
});

describe("prioridad de atención — salud ≠ riesgo (§6.6)", () => {
  it("es (100 − salud) × factor de criticidad", () => {
    // salud 100 → prioridad 0, sea cual sea la criticidad
    expect(zhi({ criticidad: 5 }).priority).toBe(0);
  });

  it("a igual salud, mayor criticidad da mayor prioridad", () => {
    const baja = zhi({ trend: 0.5, criticidad: 1 });
    const alta = zhi({ trend: 0.5, criticidad: 5 });
    expect(alta.priority!).toBeGreaterThan(baja.priority!);
  });

  it("usa los factores del análisis: criticidad 4-5 → 1,5 · 3 → 1,0 · 1-2 → 0,6", () => {
    const deficit = (c: number) => {
      const r = zhi({ trend: 0.5, criticidad: c });
      return r.priority! / (100 - r.score!);
    };
    expect(deficit(5)).toBeCloseTo(1.5, 5);
    expect(deficit(4)).toBeCloseTo(1.5, 5);
    expect(deficit(3)).toBeCloseTo(1.0, 5);
    expect(deficit(2)).toBeCloseTo(0.6, 5);
    expect(deficit(1)).toBeCloseTo(0.6, 5);
  });

  it("un equipo fuera de servicio no tiene prioridad calculable por salud", () => {
    expect(zhi({ status: "en_reparacion" }).priority).toBeNull();
  });
});

describe("determinismo", () => {
  it("mismos datos, mismo número: el ZHI es auditable", () => {
    const input = { trend: 0.7, expiredInspections: 1, maintenanceCost12m: 10_000, criticidad: 4 };
    expect(zhi(input)).toEqual(zhi(input));
  });

  it("no depende del reloj: no recibe ni usa la hora actual", () => {
    const a = zhi({ trend: 0.7 });
    const b = zhi({ trend: 0.7 });
    expect(a.score).toBe(b.score);
  });
});
