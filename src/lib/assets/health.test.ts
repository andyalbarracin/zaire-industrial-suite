// health.test.ts — src/lib/assets/health.test.ts — 2026-07-20
// Tests del health score del activo (condición 0-100), semáforo y riesgo.

import { describe, it, expect } from "vitest";
import { computeAssetHealth, healthLight, assetRisk, daysUntilExpiry, expiryLight } from "@/lib/assets/health";

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

describe("vencimiento de documentos y garantías", () => {
  const NOW_EXP = Date.parse("2026-10-12T00:00:00Z");

  describe("daysUntilExpiry", () => {
    it("sin fecha no hay días", () => {
      expect(daysUntilExpiry(null, NOW_EXP)).toBeNull();
    });
    it("una fecha futura da días positivos", () => {
      expect(daysUntilExpiry("2026-10-22", NOW_EXP)).toBe(10);
    });
    it("una fecha pasada da días negativos (vencido)", () => {
      expect(daysUntilExpiry("2026-10-02", NOW_EXP)).toBe(-10);
    });
    it("el mismo día da 0", () => {
      expect(daysUntilExpiry("2026-10-12", NOW_EXP)).toBe(0);
    });
  });

  describe("expiryLight", () => {
    it("sin fecha no hay semáforo", () => {
      expect(expiryLight(null)).toBeNull();
    });
    it("vencido es rojo", () => {
      expect(expiryLight(-1)).toBe("red");
    });
    it("por vencer dentro de 30 días es amarillo, incluido el día 0 y el 30", () => {
      expect(expiryLight(0)).toBe("yellow");
      expect(expiryLight(30)).toBe("yellow");
    });
    it("más de 30 días es verde", () => {
      expect(expiryLight(31)).toBe("green");
    });
    it("mantiene los 3 niveles de Assets: nunca devuelve 'orange' (eso es de Field)", () => {
      for (const d of [-100, -1, 0, 1, 7, 8, 30, 31, 999]) {
        expect(expiryLight(d)).not.toBe("orange");
      }
    });
  });
});
