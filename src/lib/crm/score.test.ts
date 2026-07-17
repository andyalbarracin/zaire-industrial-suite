// score.test.ts — src/lib/crm/score.test.ts — 2026-07-18
// Unit tests del score de salud de cuenta.

import { describe, it, expect } from "vitest";
import { computeAccountScore } from "@/lib/crm/score";

const NOW = new Date("2026-07-18T00:00:00Z").getTime();

describe("computeAccountScore", () => {
  it("cuenta sin datos → 0", () => {
    expect(computeAccountScore({ openOpportunities: 0, pipelineArs: 0, pipelineUsd: 0, contactsCount: 0, lastActivityAt: null }, NOW)).toBe(0);
  });

  it("cuenta caliente (opps + pipeline + actividad reciente + contactos) → 100 (cap)", () => {
    const s = computeAccountScore({
      openOpportunities: 5, pipelineArs: 1_000_000, pipelineUsd: 0, contactsCount: 5,
      lastActivityAt: new Date(NOW - 5 * 86_400_000).toISOString(),
    }, NOW);
    expect(s).toBe(100); // 30 + 20 + 30 + 20 = 100
  });

  it("penaliza la inactividad prolongada", () => {
    const reciente = computeAccountScore({ openOpportunities: 1, pipelineArs: 100, pipelineUsd: 0, contactsCount: 0, lastActivityAt: new Date(NOW - 10 * 86_400_000).toISOString() }, NOW);
    const vieja = computeAccountScore({ openOpportunities: 1, pipelineArs: 100, pipelineUsd: 0, contactsCount: 0, lastActivityAt: new Date(NOW - 200 * 86_400_000).toISOString() }, NOW);
    expect(reciente).toBeGreaterThan(vieja);
  });
});
