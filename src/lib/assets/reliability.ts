// reliability.ts — src/lib/assets/reliability.ts — 2026-07-20
// Confiabilidad y costo de un equipo desde su hoja de vida (PURO, testeable):
// TCO por moneda, MTBF (tiempo medio entre fallas), MTTR y disponibilidad.

export interface ReliabilityEvent {
  type: string;
  event_date: string;
  cost: number | null;
  currency: string;
  downtime_hours: number | null;
}

export interface Reliability {
  costByCurrency: { name: string; value: number }[];  // TCO por moneda (sin sumar monedas)
  totalDowntimeHours: number;
  failureCount: number;
  mtbfDays: number | null;      // tiempo medio entre fallas
  mttrHours: number | null;     // tiempo medio de reparación (por falla)
  availability: number | null;  // 0..1 (uptime sobre el período observado)
}

export function computeReliability(events: ReliabilityEvent[], installedAt: string | null, now = Date.now()): Reliability {
  const failures = events.filter((e) => e.type === "falla");
  const failureCount = failures.length;
  const failureTs = failures.map((e) => new Date(e.event_date).getTime()).sort((a, b) => a - b);
  const totalDowntimeHours = events.reduce((a, e) => a + (e.downtime_hours ?? 0), 0);

  const byCur: Record<string, number> = {};
  for (const e of events) if (e.cost) byCur[e.currency || "ARS"] = (byCur[e.currency || "ARS"] ?? 0) + e.cost;
  const costByCurrency = Object.entries(byCur).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const mtbfDaysRaw = failureCount >= 2 ? ((failureTs[failureCount - 1] - failureTs[0]) / (failureCount - 1)) / 86_400_000 : null;
  const failureDowntime = failures.reduce((a, e) => a + (e.downtime_hours ?? 0), 0);
  const mttrHoursRaw = failureCount >= 1 ? failureDowntime / failureCount : null;

  const startTs = installedAt
    ? new Date(installedAt).getTime()
    : (events.length ? Math.min(...events.map((e) => new Date(e.event_date).getTime())) : now);
  const periodHours = Math.max((now - startTs) / 3_600_000, 1);
  const availability = 1 - Math.min(totalDowntimeHours / periodHours, 1);

  return {
    costByCurrency,
    totalDowntimeHours,
    failureCount,
    mtbfDays: mtbfDaysRaw != null ? Math.round(mtbfDaysRaw) : null,
    mttrHours: mttrHoursRaw != null ? Math.round(mttrHoursRaw * 10) / 10 : null,
    availability: Math.round(availability * 1000) / 1000,
  };
}
