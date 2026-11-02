// reports.test.ts — src/lib/assets/reports.test.ts — 2026-07-20
// Tests de los reportes de flota: TCO por moneda (sin mezclar), costo por equipo, top fallas, ranking de riesgo.

import { describe, it, expect } from "vitest";
import { computeAssetReports, fleetReliability, bandDistribution, topConsumers } from "@/lib/assets/reports";
import type { Asset, AssetEvent } from "@/lib/assets/types";

const A = (o: Partial<Asset>): Asset => o as Asset;
const E = (o: Partial<AssetEvent>): AssetEvent => o as AssetEvent;

/** El ranking usa `zhi.priority` (§6.6), así que el fixture lo trae calculado. */
const zhiDe = (score: number, factorCriticidad: number) => ({ priority: (100 - score) * factorCriticidad }) as Asset["zhi"];

const assets = [
  // criticidad 5 → factor 1,5 · (100−30) × 1,5 = 105
  A({ id: "a1", tag: "BBA-001", name: "Bomba 1", type: "bomba", status: "operativo", criticidad: 5, health: 30, zhi: zhiDe(30, 1.5) }),
  // criticidad 3 → factor 1,0 · (100−50) × 1,0 = 50
  A({ id: "a2", tag: "CMP-001", name: "Compresor 1", type: "compresor", status: "en_reparacion", criticidad: 3, health: 50, zhi: zhiDe(50, 1.0) }),
  // criticidad 2 → factor 0,6 · (100−90) × 0,6 = 6
  A({ id: "a3", tag: null, name: "Motor 1", type: "motor", status: "operativo", criticidad: 2, health: 90, zhi: zhiDe(90, 0.6) }),
];
const events = [
  E({ asset_id: "a1", type: "falla", cost: 90000, currency: "ARS" }),
  E({ asset_id: "a1", type: "servicio", cost: 100000, currency: "ARS" }),
  E({ asset_id: "a2", type: "falla", cost: 60000, currency: "ARS" }),
  E({ asset_id: "a2", type: "falla", cost: 500, currency: "USD" }),   // otra moneda: NO se mezcla
  E({ asset_id: "a3", type: "servicio", cost: 20000, currency: "ARS" }),
];

describe("computeAssetReports", () => {
  const rep = computeAssetReports(assets, events);

  it("KPIs de flota", () => {
    expect(rep.total).toBe(3);
    expect(rep.operativos).toBe(2);
    expect(rep.criticalCount).toBe(1);      // solo a1 (criticidad 5)
    expect(rep.atRiskCount).toBe(2);        // a1 (30) y a2 (50) < 60
    expect(rep.avgHealth).toBe(57);         // round((30+50+90)/3)
  });

  it("TCO por moneda, sin sumar monedas distintas", () => {
    expect(rep.costByCurrency).toEqual([{ name: "ARS", value: 270000 }, { name: "USD", value: 500 }]);
    expect(rep.primaryCurrency).toBe("ARS");
  });

  it("costo por equipo en la moneda dominante (excluye el evento en USD)", () => {
    expect(rep.costByAsset[0]).toEqual({ name: "BBA-001 · Bomba 1", value: 190000 });
    const a2 = rep.costByAsset.find((r) => r.name === "CMP-001 · Compresor 1");
    expect(a2?.value).toBe(60000);          // 60000 ARS, NO 60500
  });

  it("top equipos por fallas", () => {
    expect(rep.topFailures[0]).toEqual({ name: "CMP-001 · Compresor 1", value: 2 });
  });

  it("ranking por la prioridad del ZHI (§6.6), desc", () => {
    expect(rep.riskRanking.map((r) => r.name)).toEqual(["BBA-001 · Bomba 1", "CMP-001 · Compresor 1", "Motor 1"]);
    // Ahora usa el FACTOR de criticidad (1,5 / 1,0 / 0,6), no la criticidad cruda:
    // antes este caso daba 350 (5 × 70), ahora 105 (1,5 × 70).
    expect(rep.riskRanking[0].risk).toBe(105);
  });
});

describe("fleetReliability — la MEDIANA, no el promedio", () => {
  const A2 = (id: string, mtbf: number | null, mttr: number | null, avail: number | null, band: string | null) =>
    A({ id, name: id, status: "operativo", criticidad: 3,
        zhi: { band, outOfService: band === null } as Asset["zhi"],
        reliability: { mtbfDays: mtbf, mttrHours: mttr, availability: avail } } as Partial<Asset>);

  it("un outlier no mueve la mediana", () => {
    // Seis equipos entre 40 y 90 días, y uno absurdo de 4000.
    // El promedio daría ~620 días: diría que la flota es excelente. La mediana dice la verdad.
    const flota = [40, 50, 60, 70, 80, 90, 4000].map((d, i) => A2(`a${i}`, d, 24, 0.9, "sano"));
    const r = fleetReliability(flota);
    expect(r.mtbfDays).toBe(70);
  });

  it("con cantidad par promedia los dos del medio", () => {
    const flota = [40, 60, 80, 100].map((d, i) => A2(`a${i}`, d, 24, 0.9, "sano"));
    expect(fleetReliability(flota).mtbfDays).toBe(70);
  });

  it("los equipos sin dato no cuentan ni arrastran", () => {
    const flota = [A2("a1", 40, 24, 0.9, "sano"), A2("a2", null, null, null, "sano"), A2("a3", 60, 48, 0.8, "sano")];
    const r = fleetReliability(flota);
    expect(r.mtbfDays).toBe(50);
    expect(r.conDato).toBe(2);
  });

  it("una flota sin ningún dato no inventa ceros", () => {
    const r = fleetReliability([A2("a1", null, null, null, "sano")]);
    expect(r.mtbfDays).toBeNull();
    expect(r.mttrDays).toBeNull();
    expect(r.availability).toBeNull();
    expect(r.conDato).toBe(0);
  });

  it("el MTTR se devuelve en DÍAS, igual que el resto", () => {
    const r = fleetReliability([A2("a1", 40, 48, 0.9, "sano"), A2("a2", 60, 48, 0.9, "sano")]);
    expect(r.mttrDays).toBe(2);
  });

  it("los equipos fuera de servicio no entran en la mediana", () => {
    const flota = [A2("a1", 40, 24, 0.9, "sano"), A2("a2", 9999, 24, 0.9, null)];
    expect(fleetReliability(flota).mtbfDays).toBe(40);
  });
});

describe("bandDistribution — para el donut", () => {
  const AB = (id: string, band: string | null) =>
    A({ id, name: id, status: "operativo", criticidad: 3, zhi: { band, outOfService: band === null } as Asset["zhi"] } as Partial<Asset>);

  it("cuenta por banda y deja las vacías afuera", () => {
    const d = bandDistribution([AB("a", "sano"), AB("b", "sano"), AB("c", "critico")]);
    expect(d).toEqual([{ band: "sano", value: 2 }, { band: "critico", value: 1 }]);
  });

  it("los fuera de servicio van en su propia categoría, no como una banda", () => {
    const d = bandDistribution([AB("a", "sano"), AB("b", null)]);
    expect(d.find((x) => x.band === "fuera_de_servicio")?.value).toBe(1);
  });

  it("respeta el orden de gravedad: sano primero, fuera de servicio al final", () => {
    const d = bandDistribution([AB("a", "critico"), AB("b", "sano"), AB("c", null), AB("d", "atencion")]);
    expect(d.map((x) => x.band)).toEqual(["sano", "atencion", "critico", "fuera_de_servicio"]);
  });
});

describe("topConsumers — los 10 equipos que más te consumen (§7.5)", () => {
  const NOW = Date.UTC(2026, 9, 15);
  const dia = 86_400_000;
  const hace = (d: number) => new Date(NOW - d * dia).toISOString().slice(0, 10);

  const EQ = (id: string, name: string, tag: string | null = null) =>
    A({ id, name, tag, status: "operativo", criticidad: 3 } as Partial<Asset>);

  const EV = (asset_id: string, o: Partial<AssetEvent> = {}) =>
    E({ asset_id, type: "falla", event_date: hace(30), cost: null, currency: "ARS", downtime_hours: null, ...o });

  it("ordena por horas fuera de servicio, que es lo que de verdad duele", () => {
    const assets = [EQ("a1", "Bomba 1"), EQ("a2", "Bomba 2")];
    const events = [
      EV("a1", { downtime_hours: 4 }),
      EV("a2", { downtime_hours: 40 }),   // menos intervenciones, mucho más parada
      EV("a1", { downtime_hours: 4 }),
      EV("a1", { downtime_hours: 4 }),
    ];
    const r = topConsumers(assets, events, NOW);
    expect(r.orderedBy).toBe("horas");
    expect(r.rows[0].name).toContain("Bomba 2");
    expect(r.rows[0].horasFuera).toBe(40);
    expect(r.rows[1].intervenciones).toBe(3);
  });

  it("sin NINGÚN dato de parada cae a cantidad de intervenciones, y lo declara", () => {
    // Es el caso normal al principio: nadie carga horas. Ordenar por un cero constante
    // daría un ranking arbitrario disfrazado de dato.
    const assets = [EQ("a1", "Bomba 1"), EQ("a2", "Bomba 2")];
    const events = [EV("a1"), EV("a2"), EV("a2"), EV("a2")];
    const r = topConsumers(assets, events, NOW);
    expect(r.orderedBy).toBe("intervenciones");
    expect(r.rows[0].name).toContain("Bomba 2");
    expect(r.rows[0].intervenciones).toBe(3);
  });

  it("la parada por fechas le gana a las horas cargadas a mano", () => {
    const assets = [EQ("a1", "Bomba 1")];
    const events = [EV("a1", {
      downtime_hours: 1,
      out_of_service_start: hace(10), out_of_service_end: hace(8),
    } as Partial<AssetEvent>)];
    expect(topConsumers(assets, events, NOW).rows[0].horasFuera).toBe(48);
  });

  it("cuenta TODA intervención, no solo las fallas: un preventivo también consume", () => {
    const assets = [EQ("a1", "Bomba 1")];
    const events = [EV("a1", { type: "servicio" }), EV("a1", { type: "falla" })];
    expect(topConsumers(assets, events, NOW).rows[0].intervenciones).toBe(2);
  });

  it("el costo no mezcla monedas: solo suma la dominante", () => {
    const assets = [EQ("a1", "Bomba 1")];
    const events = [
      EV("a1", { cost: 100000, currency: "ARS" }),
      EV("a1", { cost: 500, currency: "USD" }),
      EV("a1", { cost: 50000, currency: "ARS" }),
    ];
    const r = topConsumers(assets, events, NOW);
    expect(r.currency).toBe("ARS");
    expect(r.rows[0].costo).toBe(150000);
  });

  it("solo mira los últimos 12 meses: lo viejo no te consume hoy", () => {
    const assets = [EQ("a1", "Bomba 1")];
    const events = [EV("a1", { event_date: hace(400), downtime_hours: 99 }), EV("a1", { downtime_hours: 5 })];
    const r = topConsumers(assets, events, NOW);
    expect(r.rows[0].horasFuera).toBe(5);
    expect(r.rows[0].intervenciones).toBe(1);
  });

  it("los equipos sin ninguna intervención no entran: no consumieron nada", () => {
    const assets = [EQ("a1", "Bomba 1"), EQ("a2", "La que nunca se tocó")];
    const r = topConsumers(assets, [EV("a1", { downtime_hours: 3 })], NOW);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].name).toContain("Bomba 1");
  });

  it("devuelve como mucho 10, que es el nombre de la vista", () => {
    const assets = Array.from({ length: 15 }, (_, i) => EQ(`a${i}`, `Bomba ${i}`));
    const events = assets.map((a) => EV(a.id, { downtime_hours: 1 }));
    expect(topConsumers(assets, events, NOW).rows.length).toBe(10);
  });

  it("usa el TAG cuando existe, que es como lo llaman en planta", () => {
    const r = topConsumers([EQ("a1", "Bomba 1", "BBA-01")], [EV("a1", { downtime_hours: 1 })], NOW);
    expect(r.rows[0].name).toBe("BBA-01 · Bomba 1");
  });

  it("un evento de un equipo que no está en la lista no rompe nada", () => {
    const r = topConsumers([EQ("a1", "Bomba 1")], [EV("a1", { downtime_hours: 2 }), EV("fantasma", { downtime_hours: 99 })], NOW);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].horasFuera).toBe(2);
  });

  it("una flota sin eventos devuelve una lista vacía, no ceros inventados", () => {
    const r = topConsumers([EQ("a1", "Bomba 1")], [], NOW);
    expect(r.rows).toEqual([]);
  });
});
