// health.ts — src/lib/assets/health.ts — 2026-07-20
// Health score del activo (0-100, condición). PURO y testeable. Molde de lib/crm/score.ts.
// Señales: estado, fallas recientes (12m), antigüedad vs vida útil esperada.

export interface AssetHealthInput {
  status: string;                    // operativo | en_reparacion | standby | baja
  installedAt: string | null;
  expectedLifeYears: number | null;
  recentFailures: number;            // # de fallas en los últimos 12 meses
}

export function computeAssetHealth(p: AssetHealthInput, now = Date.now()): number {
  if (p.status === "baja") return 0;
  let h = 100;
  if (p.status === "en_reparacion") h -= 30;
  else if (p.status === "standby") h -= 10;

  h -= Math.min(p.recentFailures * 15, 45);

  if (p.installedAt && p.expectedLifeYears && p.expectedLifeYears > 0) {
    const ageYears = (now - new Date(p.installedAt).getTime()) / (365.25 * 86_400_000);
    const ratio = ageYears / p.expectedLifeYears;
    if (ratio >= 1) h -= 20;
    else if (ratio >= 0.8) h -= 10;
  }
  return Math.max(0, Math.min(100, Math.round(h)));
}

/** Semáforo de salud para StatusDot. */
export function healthLight(h: number): "green" | "yellow" | "red" {
  return h >= 70 ? "green" : h >= 40 ? "yellow" : "red";
}

/** Riesgo = criticidad × déficit de salud (para rankear "equipos en riesgo"). Mayor = peor. */
export function assetRisk(health: number, criticidad: number): number {
  return criticidad * (100 - health);
}
