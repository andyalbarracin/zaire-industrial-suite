// reports.ts — src/lib/crm/reports.ts — 2026-07-18
// Cálculo puro de métricas de ventas del CRM (analítica). Sin UI, testeable.

import type { CrmOpportunity, CrmLead, CrmPipelineStage } from "@/lib/crm/types";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/crm/constants";
import type { LeadStatus, LeadSource } from "@/lib/crm/types";

export interface NameValue { name: string; value: number }
export interface OwnerRow { name: string; abiertas: number; ganadas: number; montoGanadoArs: number }

export interface CrmReports {
  // KPIs
  conversionRate: number;   // leads convertidos / total leads (%)
  winRate: number;          // ganadas / (ganadas + perdidas) (%)
  wonCount: number;
  wonAmountArs: number;
  avgWonAmountArs: number;
  avgSalesCycleDays: number | null;
  // Series para gráficos
  byStageCount: NameValue[];      // oportunidades abiertas por etapa (count)
  pipelineByStageArs: NameValue[];// monto ARS por etapa abierta
  wonByMonth: NameValue[];        // monto ganado ARS por mes (últimos 6)
  byOwner: OwnerRow[];            // rendimiento por responsable
  leadsByStatus: NameValue[];
  leadsBySource: NameValue[];
}

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function computeCrmReports(
  opps: CrmOpportunity[],
  leads: CrmLead[],
  stages: CrmPipelineStage[],
  profiles: { id: string; full_name: string }[],
): CrmReports {
  const stageByKey = new Map(stages.map((s) => [s.key, s]));
  const openStages = stages.filter((s) => !s.is_won && !s.is_lost);
  const isWon = (o: CrmOpportunity) => stageByKey.get(o.stage)?.is_won;
  const isLost = (o: CrmOpportunity) => stageByKey.get(o.stage)?.is_lost;
  const isOpen = (o: CrmOpportunity) => { const s = stageByKey.get(o.stage); return s ? !s.is_won && !s.is_lost : true; };

  const won = opps.filter(isWon);
  const lost = opps.filter(isLost);
  const wonArs = won.filter((o) => o.currency === "ARS");
  const wonAmountArs = wonArs.reduce((s, o) => s + (Number(o.amount) || 0), 0);

  // Ciclo de venta promedio (días) de las ganadas con closed_at.
  const cycles = won
    .filter((o) => o.closed_at)
    .map((o) => (new Date(o.closed_at as string).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24))
    .filter((d) => d >= 0);
  const avgSalesCycleDays = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null;

  // Por etapa (abiertas)
  const byStageCount: NameValue[] = openStages.map((s) => ({ name: s.name, value: opps.filter((o) => o.stage === s.key).length }));
  const pipelineByStageArs: NameValue[] = openStages.map((s) => ({
    name: s.name,
    value: opps.filter((o) => o.stage === s.key && o.currency === "ARS").reduce((a, o) => a + (Number(o.amount) || 0), 0),
  }));

  // Ganado por mes (últimos 6 meses, ARS)
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
  }
  const wonByMonth: NameValue[] = months.map((m) => ({
    name: m.label,
    value: wonArs.filter((o) => o.closed_at && monthKey(new Date(o.closed_at as string)) === m.key).reduce((a, o) => a + (Number(o.amount) || 0), 0),
  }));

  // Por responsable
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const ownerIds = Array.from(new Set(opps.map((o) => o.owner_id).filter((x): x is string => !!x)));
  const byOwner: OwnerRow[] = ownerIds.map((id) => {
    const mine = opps.filter((o) => o.owner_id === id);
    return {
      name: nameById.get(id) ?? "—",
      abiertas: mine.filter(isOpen).length,
      ganadas: mine.filter(isWon).length,
      montoGanadoArs: mine.filter((o) => isWon(o) && o.currency === "ARS").reduce((a, o) => a + (Number(o.amount) || 0), 0),
    };
  }).sort((a, b) => b.montoGanadoArs - a.montoGanadoArs);

  // Leads
  const statuses: LeadStatus[] = ["nuevo", "contactado", "calificado", "convertido", "descartado"];
  const leadsByStatus: NameValue[] = statuses.map((st) => ({ name: LEAD_STATUS_LABELS[st], value: leads.filter((l) => l.status === st).length }));
  const sources: LeadSource[] = ["web", "referido", "visita_comercial", "llamada", "email", "evento", "otro"];
  const leadsBySource: NameValue[] = sources
    .map((sr) => ({ name: LEAD_SOURCE_LABELS[sr], value: leads.filter((l) => l.source === sr).length }))
    .filter((r) => r.value > 0);

  const convertedLeads = leads.filter((l) => l.status === "convertido").length;

  return {
    conversionRate: leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0,
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    wonCount: won.length,
    wonAmountArs,
    avgWonAmountArs: wonArs.length ? Math.round(wonAmountArs / wonArs.length) : 0,
    avgSalesCycleDays,
    byStageCount,
    pipelineByStageArs,
    wonByMonth,
    byOwner,
    leadsByStatus,
    leadsBySource,
  };
}
