// reports.test.ts — src/lib/crm/reports.test.ts — 2026-07-18
// Unit tests del cálculo de métricas de ventas del CRM.

import { describe, it, expect } from "vitest";
import { computeCrmReports } from "@/lib/crm/reports";
import type { CrmOpportunity, CrmLead, CrmPipelineStage } from "@/lib/crm/types";

const stages = [
  { key: "prospecto", name: "Prospecto", position: 1, color: "slate", is_won: false, is_lost: false, created_at: "", updated_at: "" },
  { key: "ganada", name: "Ganada", position: 2, color: "green", is_won: true, is_lost: false, created_at: "", updated_at: "" },
  { key: "perdida", name: "Perdida", position: 3, color: "red", is_won: false, is_lost: true, created_at: "", updated_at: "" },
] as CrmPipelineStage[];

function opp(stage: string, amount: number, currency: "ARS" | "USD" = "ARS"): CrmOpportunity {
  return { id: Math.random().toString(), stage, amount, currency, created_at: "2026-01-01", closed_at: "2026-01-11" } as unknown as CrmOpportunity;
}
function lead(status: string): CrmLead {
  return { id: Math.random().toString(), status } as unknown as CrmLead;
}

describe("computeCrmReports", () => {
  it("win rate = ganadas / (ganadas + perdidas)", () => {
    const opps = [opp("ganada", 1000), opp("ganada", 2000), opp("perdida", 500), opp("prospecto", 300)];
    const r = computeCrmReports(opps, [], stages, []);
    expect(r.winRate).toBe(67); // 2 / 3
    expect(r.wonCount).toBe(2);
    expect(r.wonAmountArs).toBe(3000);
    expect(r.avgWonAmountArs).toBe(1500);
  });

  it("tasa de conversión = convertidos / total leads", () => {
    const leads = [lead("nuevo"), lead("nuevo"), lead("contactado"), lead("convertido")];
    const r = computeCrmReports([], leads, stages, []);
    expect(r.conversionRate).toBe(25);
  });

  it("sin datos no rompe (0%)", () => {
    const r = computeCrmReports([], [], stages, []);
    expect(r.winRate).toBe(0);
    expect(r.conversionRate).toBe(0);
    expect(r.avgSalesCycleDays).toBeNull();
  });
});
