// score.ts — src/lib/crm/score.ts — 2026-07-18
// Score de salud/engagement de una cuenta (0-100). Puro y testeable.
// Señales: pipeline abierto, valor en pipeline, actividad reciente y profundidad de la relación.

export interface AccountScoreInput {
  openOpportunities: number;
  pipelineArs: number;
  pipelineUsd: number;
  contactsCount: number;
  lastActivityAt: string | null;
}

export function computeAccountScore(p: AccountScoreInput, now = Date.now()): number {
  let score = Math.min(p.openOpportunities * 10, 30);
  if (p.pipelineArs > 0 || p.pipelineUsd > 0) score += 20;
  if (p.lastActivityAt) {
    const days = (now - new Date(p.lastActivityAt).getTime()) / 86_400_000;
    score += days <= 30 ? 30 : days <= 90 ? 15 : 5;
  }
  score += Math.min(p.contactsCount * 5, 20);
  return Math.min(100, score);
}
