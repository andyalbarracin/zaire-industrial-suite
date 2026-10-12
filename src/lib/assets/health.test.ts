// health.test.ts — src/lib/assets/health.test.ts — 2026-07-20
// Tests del health score del activo (condición 0-100), semáforo y riesgo.

import { describe, it, expect } from "vitest";
import { computeAssetHealth, healthLight, assetRisk } from "@/lib/assets/health";

const NOW = Date.parse("2026-07-20T00:00:00Z");
const base = { installedAt: null, expectedLifeYears: null, recentFailures: 0 };

describe("computeAssetHealth", () => {
  it("un equipo dado de baja tiene salud 0", () => {
    expect(computeAssetHealth({ ...base, status: "baja" }, NOW)).toBe(0);
  });
  it("operativo sin señales negativas = 100", () => {
    expect(computeAssetHealth({ ...base, status: "operativo" }, NOW)).toBe(100);
  });
  it("en reparación resta 30; standby resta 10", () => {
    expect(computeAssetHealth({ ...base, status: "en_reparacion" }, NOW)).toBe(70);
    expect(computeAssetHealth({ ...base, status: "standby" }, NOW)).toBe(90);
  });
  it("cada falla reciente resta 15 (tope 45)", () => {
    expect(computeAssetHealth({ ...base, status: "operativo", recentFailures: 2 }, NOW)).toBe(70);
    expect(computeAssetHealth({ ...base, status: "operativo", recentFailures: 5 }, NOW)).toBe(55);
  });
  it("antigüedad > vida útil esperada resta 20", () => {
    expect(computeAssetHealth({ status: "operativo", installedAt: "2014-07-20", expectedLifeYears: 10, recentFailures: 0 }, NOW)).toBe(80);
  });
});

describe("healthLight y riesgo", () => {
  it("semáforo por umbrales 70/40", () => {
    expect(healthLight(70)).toBe("green");
    expect(healthLight(40)).toBe("yellow");
    expect(healthLight(39)).toBe("red");
  });
  it("riesgo = criticidad × (100 - salud)", () => {
    expect(assetRisk(40, 5)).toBe(300);
    expect(assetRisk(100, 5)).toBe(0);
  });
});
