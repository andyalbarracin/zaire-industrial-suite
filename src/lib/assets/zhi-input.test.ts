// zhi-input.test.ts — src/lib/assets/zhi-input.test.ts — 2026-10-13
// Tests del ensamblador de insumos del ZHI: traduce asset + eventos + documentos + referencias
// a un ZhiInput. Es la capa donde se decide qué señal existe de verdad y qué no.

import { describe, it, expect } from "vitest";
import { buildZhiInput, computeFleetZhi, type FleetZhiMember } from "@/lib/assets/zhi-input";
import { computeReliability } from "@/lib/assets/reliability";
import type { ResolvedReference } from "@/lib/assets/references";
import type { Asset, AssetDocument, AssetEvent } from "@/lib/assets/types";

const NOW = Date.parse("2026-10-13T12:00:00Z");

const ASSET: Asset = {
  id: "a1", tag: "P-101", name: "Bomba 1", type: "bomba", brand: null, model: null,
  serial: "SN-001", client_id: null, site_id: "s1", parent_asset_id: null,
  status: "operativo", criticidad: 3, installed_at: "2020-01-01", warranty_until: null,
  expected_life_years: 10, latitude: null, longitude: null, address: null, specs: null,
  notes: null, deleted_at: null, created_by: null, created_at: "2020-01-01", updated_at: "2020-01-01",
  valor_reposicion: 100_000, mtbf_referencia: null, mtbr_referencia: null,
};

function doc(p: Partial<AssetDocument>): AssetDocument {
  return {
    id: "d1", asset_id: "a1", doc_type: "manual", name: "x", file_path: "p",
    expires_at: null, notes: null, deleted_at: null, created_by: null,
    created_at: "2026-01-01", updated_at: "2026-01-01", ...p,
  };
}

function ev(p: Partial<AssetEvent> & { event_date: string }): AssetEvent {
  return {
    id: "e1", asset_id: "a1", type: "servicio", description: null, ref_type: null, ref_id: null,
    cost: null, currency: "ARS", downtime_hours: null, created_by: null, created_at: p.event_date, ...p,
  };
}

type RefPair = { mtbf: ResolvedReference; mtbr: ResolvedReference };
const SIN_REFERENCIA: RefPair = {
  mtbf: { hours: null, source: "sin_referencia" },
  mtbr: { hours: null, source: "sin_referencia" },
};

function build(p: { asset?: Partial<Asset>; events?: AssetEvent[]; documents?: AssetDocument[]; references?: RefPair } = {}) {
  const asset = { ...ASSET, ...p.asset };
  const events = p.events ?? [];
  const reliability = computeReliability({ events, installedAt: asset.installed_at, now: NOW });
  return buildZhiInput({
    asset, reliability, events, documents: p.documents ?? [],
    references: p.references ?? SIN_REFERENCIA, now: NOW,
  });
}

describe("lo que viene del motor de confiabilidad se pasa tal cual", () => {
  it("propaga U, F, R, índice reactivo, tendencia y confianza", () => {
    const events = [ev({ event_date: "2026-03-01", type: "falla" }), ev({ event_date: "2026-06-01", type: "servicio" })];
    const rel = computeReliability({ events, installedAt: ASSET.installed_at, now: NOW });
    const i = build({ events });
    expect(i.operatingHours).toBe(rel.operatingHours);
    expect(i.failures).toBe(rel.failures);
    expect(i.interventions).toBe(rel.interventions);
    expect(i.reactiveIndex).toBe(rel.reactiveIndex);
    expect(i.trend).toBe(rel.trend);
    expect(i.confidence).toBe(rel.confidence);
  });
});

describe("días desde la última falla — alimenta el tope de 14 días", () => {
  it("sin fallas es null", () => {
    expect(build({ events: [ev({ event_date: "2026-10-01", type: "servicio" })] }).daysSinceLastFailure).toBeNull();
  });
  it("cuenta desde la falla MÁS RECIENTE", () => {
    const events = [ev({ event_date: "2026-01-01", type: "falla" }), ev({ event_date: "2026-10-10", type: "falla" })];
    expect(build({ events }).daysSinceLastFailure).toBe(3);
  });
  it("usa la misma regla de taxonomía que el motor: es_falla le gana a type", () => {
    const events = [ev({ event_date: "2026-10-10", type: "servicio", es_falla: true })];
    expect(build({ events }).daysSinceLastFailure).toBe(3);
  });
  it("un preventivo marcado como no-falla no cuenta", () => {
    const events = [ev({ event_date: "2026-10-10", type: "falla", es_falla: false })];
    expect(build({ events }).daysSinceLastFailure).toBeNull();
  });
  it("ignora fallas con fecha imposible", () => {
    const events = [ev({ event_date: "0006-01-08", type: "falla" })];
    expect(build({ events }).daysSinceLastFailure).toBeNull();
  });
});

describe("integridad — solo las señales que existen de verdad", () => {
  it("un certificado vencido cuenta como documento crítico vencido", () => {
    const i = build({ documents: [doc({ doc_type: "certificado", expires_at: "2026-09-01" })] });
    expect(i.expiredCriticalDocs).toBe(1);
  });

  it("una garantía vencida también", () => {
    const i = build({ documents: [doc({ doc_type: "garantia", expires_at: "2026-09-01" })] });
    expect(i.expiredCriticalDocs).toBe(1);
  });

  it("un manual vencido NO es crítico", () => {
    const i = build({ documents: [doc({ doc_type: "manual", expires_at: "2026-09-01" })] });
    expect(i.expiredCriticalDocs).toBe(0);
  });

  it("warranty_until del equipo vencida cuenta como garantía vencida", () => {
    // Hoy esa columna no dispara ninguna alerta en la campana (hallazgo de F0); acá sí pesa.
    const i = build({ asset: { warranty_until: "2026-01-01" } });
    expect(i.expiredCriticalDocs).toBe(1);
  });

  it("algo que vence dentro de 30 días cuenta como por vencer, no como vencido", () => {
    const i = build({ documents: [doc({ doc_type: "certificado", expires_at: "2026-10-20" })] });
    expect(i.docsExpiringSoon).toBe(1);
    expect(i.expiredCriticalDocs).toBe(0);
  });

  it("algo que vence en más de 30 días no pesa", () => {
    const i = build({ documents: [doc({ doc_type: "certificado", expires_at: "2027-01-01" })] });
    expect(i.docsExpiringSoon).toBe(0);
    expect(i.expiredCriticalDocs).toBe(0);
  });

  it("un documento sin vencimiento no pesa", () => {
    const i = build({ documents: [doc({ expires_at: null })] });
    expect(i.docsExpiringSoon).toBe(0);
    expect(i.expiredCriticalDocs).toBe(0);
  });

  it("cuenta inspecciones vencidas SI el documento está tipado como inspección", () => {
    // El catálogo de doc_type de la UI todavía no ofrece "inspeccion" (ver el comentario del
    // módulo). El código está listo: en cuanto exista la opción, la señal empieza a pesar.
    const i = build({ documents: [doc({ doc_type: "inspeccion", expires_at: "2026-09-01" })] });
    expect(i.expiredInspections).toBe(1);
  });
});

describe("completitud de la ficha (§5)", () => {
  it("una ficha completa no tiene campos faltantes", () => {
    expect(build().camposFichaFaltantes).toEqual([]);
  });
  it("detecta la serie faltante", () => {
    expect(build({ asset: { serial: null } }).camposFichaFaltantes).toContain("serie");
  });
  it("detecta la ubicación faltante: sin sitio y sin dirección", () => {
    expect(build({ asset: { site_id: null, address: null } }).camposFichaFaltantes).toContain("ubicación");
  });
  it("con dirección pero sin sitio, la ubicación está cargada", () => {
    expect(build({ asset: { site_id: null, address: "Planta 2" } }).camposFichaFaltantes).not.toContain("ubicación");
  });
  it("detecta la fecha de puesta en servicio faltante", () => {
    expect(build({ asset: { installed_at: null } }).camposFichaFaltantes).toContain("puesta en servicio");
  });
  it("detecta el valor de reposición faltante", () => {
    expect(build({ asset: { valor_reposicion: null } }).camposFichaFaltantes).toContain("valor de reposición");
  });
  it("no reporta la criticidad: la columna es NOT NULL con default, nunca falta", () => {
    expect(build().camposFichaFaltantes).not.toContain("criticidad");
  });
});

describe("costo de mantenimiento — nunca mezcla monedas", () => {
  it("sin costos cargados es 0", () => {
    expect(build().maintenanceCost12m).toBe(0);
  });

  it("con costos en UNA sola moneda los suma", () => {
    const events = [
      ev({ event_date: "2026-05-01", cost: 10_000, currency: "ARS" }),
      ev({ event_date: "2026-06-01", cost: 5_000, currency: "ARS" }),
    ];
    expect(build({ events }).maintenanceCost12m).toBe(15_000);
  });

  it("con costos en DOS monedas devuelve null: comparar sin tipo de cambio seria inventar", () => {
    const events = [
      ev({ event_date: "2026-05-01", cost: 10_000, currency: "ARS" }),
      ev({ event_date: "2026-06-01", cost: 500, currency: "USD" }),
    ];
    expect(build({ events }).maintenanceCost12m).toBeNull();
  });

  it("si el costo es ambiguo, tampoco se pasa el valor de reposición: el sub-índice sale null", () => {
    const events = [
      ev({ event_date: "2026-05-01", cost: 10_000, currency: "ARS" }),
      ev({ event_date: "2026-06-01", cost: 500, currency: "USD" }),
    ];
    expect(build({ events }).replacementValue).toBeNull();
  });
});

describe("edad y vida útil", () => {
  it("calcula la edad desde la puesta en servicio", () => {
    // 2020-01-01 → 2026-10-13 ≈ 6,78 años
    expect(build().ageYears).toBeCloseTo(6.8, 1);
  });
  it("sin puesta en servicio no hay edad", () => {
    expect(build({ asset: { installed_at: null } }).ageYears).toBeNull();
  });
  it("propaga la vida útil esperada", () => {
    expect(build().expectedLifeYears).toBe(10);
  });
});

describe("estado, criticidad y referencias", () => {
  it("propaga estado y criticidad tal cual", () => {
    const i = build({ asset: { status: "en_reparacion", criticidad: 5 } });
    expect(i.status).toBe("en_reparacion");
    expect(i.criticidad).toBe(5);
  });
  it("pasa las referencias ya resueltas", () => {
    const i = build({ references: { mtbf: { hours: 1000, source: "flota" }, mtbr: { hours: 500, source: "equipo" } } });
    expect(i.mtbfReferenceHours).toBe(1000);
    expect(i.mtbrReferenceHours).toBe(500);
  });
});

describe("computeFleetZhi — las dos pasadas: flota primero, equipo después", () => {
  /** n bombas con `fallas` fallas cada una, todas sin referencia propia. */
  function flota(n: number, fallas: number): FleetZhiMember[] {
    return Array.from({ length: n }, (_, i) => ({
      asset: { ...ASSET, id: `a${i}`, mtbf_referencia: null },
      events: Array.from({ length: fallas }, (_, k) => ev({ event_date: `2026-0${k + 1}-01`, type: "falla" })),
      documents: [],
    }));
  }

  it("con 5 equipos comparables, uno sin referencia propia SÍ obtiene confiabilidad", () => {
    const r = computeFleetZhi(flota(5, 2), NOW);
    expect(r.size).toBe(5);
    expect(r.get("a0")!.subIndices.confiabilidad).not.toBeNull();
  });

  it("con 4 equipos no alcanza para la mediana: la confiabilidad queda sin calcular", () => {
    const r = computeFleetZhi(flota(4, 2), NOW);
    expect(r.get("a0")!.subIndices.confiabilidad).toBeNull();
  });

  it("la referencia propia del equipo le gana a la mediana de la flota", () => {
    const miembros = flota(5, 2);
    miembros[0] = { ...miembros[0], asset: { ...miembros[0].asset, mtbf_referencia: 1 } };
    const r = computeFleetZhi(miembros, NOW);
    // Con una referencia propia absurdamente baja, el equipo se ve perfecto contra sí mismo.
    expect(r.get("a0")!.subIndices.confiabilidad).toBe(100);
  });

  it("devuelve un ZHI por equipo, indexado por id", () => {
    const r = computeFleetZhi(flota(3, 0), NOW);
    expect([...r.keys()].sort()).toEqual(["a0", "a1", "a2"]);
  });

  it("una flota vacía no rompe", () => {
    expect(computeFleetZhi([], NOW).size).toBe(0);
  });

  it("un equipo en reparación queda fuera de servicio, sin arrastrar a los demás", () => {
    const miembros = flota(5, 2);
    miembros[0] = { ...miembros[0], asset: { ...miembros[0].asset, status: "en_reparacion" } };
    const r = computeFleetZhi(miembros, NOW);
    expect(r.get("a0")!.outOfService).toBe(true);
    expect(r.get("a0")!.score).toBeNull();
    expect(r.get("a1")!.outOfService).toBe(false);
    expect(r.get("a1")!.score).not.toBeNull();
  });
});
