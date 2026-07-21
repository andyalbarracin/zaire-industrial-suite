// reports.test.ts — src/lib/assets/reports.test.ts — 2026-07-20
// Tests de los reportes de flota: TCO por moneda (sin mezclar), costo por equipo, top fallas, ranking de riesgo.

import { describe, it, expect } from "vitest";
import { computeAssetReports } from "@/lib/assets/reports";
import type { Asset, AssetEvent } from "@/lib/assets/types";

const A = (o: Partial<Asset>): Asset => o as Asset;
const E = (o: Partial<AssetEvent>): AssetEvent => o as AssetEvent;

const assets = [
  A({ id: "a1", tag: "BBA-001", name: "Bomba 1", type: "bomba", status: "operativo", criticidad: 5, health: 30 }),
  A({ id: "a2", tag: "CMP-001", name: "Compresor 1", type: "compresor", status: "en_reparacion", criticidad: 3, health: 50 }),
  A({ id: "a3", tag: null, name: "Motor 1", type: "motor", status: "operativo", criticidad: 2, health: 90 }),
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

  it("ranking de riesgo = criticidad × déficit de salud, desc", () => {
    expect(rep.riskRanking.map((r) => r.name)).toEqual(["BBA-001 · Bomba 1", "CMP-001 · Compresor 1", "Motor 1"]);
    expect(rep.riskRanking[0].risk).toBe(350);   // 5 × (100−30)
  });
});
