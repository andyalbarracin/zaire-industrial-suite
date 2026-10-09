// reliability.ts — src/lib/assets/reliability.ts — 2026-10-02
// Motor de confiabilidad POR PERÍODO (puro y testeable): tiempo operativo, MTBF, MTBR, MTTR,
// disponibilidad, índice reactivo, tendencia y TCO por moneda.
//
// Dos decisiones que definen el diseño:
//  1. El tiempo operativo ENTRA COMO PARÁMETRO, no se lee de la base. Así el motor no depende
//     de ninguna columna nueva y se testea entero en memoria.
//  2. La clasificación del evento (`es_falla`, `es_intervencion_fisica`) es OPCIONAL: si no
//     viene, se DERIVA de `type`. Así funciona con los 9 tipos actuales y seguirá funcionando
//     cuando existan las columnas booleanas, sin tocar este archivo.
//
// Nada de números inventados: lo que no se puede afirmar vuelve como `null`, nunca 0 ni ∞.

import { dedupeSameDay } from "@/lib/assets/identity";

const DAY_MS = 86_400_000;

/** De dónde salió el tiempo operativo. Se muestra al usuario: honestidad del dato. */
export type OperatingSource = "horometro" | "regimen" | "calendario";

export type Confidence = "alta" | "media" | "baja";

/** De dónde salieron las horas de parada. Se muestra igual que `operatingSource`. */
export type DowntimeSource = "fechas" | "manual" | "mixto" | "sin_dato";

export interface ReliabilityEvent {
  type: string;
  event_date: string;
  cost: number | null;
  currency: string;
  downtime_hours: number | null;
  // Taxonomía (F1). Si faltan o vienen null, se derivan de `type`.
  es_falla?: boolean | null;
  es_intervencion_fisica?: boolean | null;
  // Ventana de fuera de servicio (F1a). Cuando las dos están cargadas y son coherentes,
  // le GANAN a `downtime_hours`: la parada deja de depender de que alguien escriba horas.
  out_of_service_start?: string | null;
  out_of_service_end?: string | null;
}

export interface ReliabilityInput {
  events: readonly ReliabilityEvent[];
  /** Punto de inicio del equipo: acota el período hacia atrás. */
  installedAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  /** Horas que opera por día. Ausente ⇒ calendario puro (24) y la fuente lo declara. */
  regimeHoursPerDay?: number | null;
  /** Horas reales de horómetro. Si viene, gana sobre todo lo demás. */
  operatingHours?: number | null;
  now?: number;
}

export interface NameValue { name: string; value: number }

export interface Reliability {
  periodStart: string;
  periodEnd: string;
  periodDays: number;
  operatingHours: number;
  operatingSource: OperatingSource;
  failures: number;
  interventions: number;
  /** Cuántas filas colapsó la regla de "mismo equipo, mismo día". Nunca truncar en silencio. */
  dedupedSameDay: number;
  downtimeHours: number;
  failureDowntimeHours: number;
  downtimeSource: DowntimeSource;
  /** Ventanas con inicio y sin fin. No se estiman: se cuentan, para que no pasen en silencio. */
  openOutOfServiceCount: number;
  mtbfHours: number | null;
  mtbfDays: number | null;
  mtbrHours: number | null;
  mtbrDays: number | null;
  mttrHours: number | null;
  availability: number | null;
  reactiveIndex: number | null;
  trend: number | null;
  noFailuresInPeriod: boolean;
  insufficientData: boolean;
  confidence: Confidence;
  costByCurrency: NameValue[];
  costByCurrencyAllTime: NameValue[];
}

// ---------------------------------------------------------------- utilidades

/** Timestamp UTC de una fecha `YYYY-MM-DD` o de un ISO completo. null si no es fecha. */
function parseDay(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = Date.parse(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
  return Number.isFinite(t) ? t : null;
}

function startOfDayUtc(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.getTime();
}

function toDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Suma de costos agrupada por moneda. NUNCA suma monedas distintas. */
function costByCurrency(events: readonly ReliabilityEvent[]): NameValue[] {
  const acc: Record<string, number> = {};
  for (const e of events) {
    if (!e.cost) continue;
    const cur = e.currency || "ARS";
    acc[cur] = (acc[cur] ?? 0) + e.cost;
  }
  return Object.entries(acc)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ------------------------------------------------- clasificación del evento

const PHYSICAL_TYPES = new Set(["falla", "servicio"]);

/** `es_falla` explícito si existe; si no, se deriva de `type`. */
function isFailure(e: ReliabilityEvent): boolean {
  return e.es_falla ?? e.type === "falla";
}

/** `es_intervencion_fisica` explícito si existe; si no, se deriva de `type`. */
function isIntervention(e: ReliabilityEvent): boolean {
  return e.es_intervencion_fisica ?? PHYSICAL_TYPES.has(e.type);
}

/**
 * Horas de parada de un evento, con su origen.
 * Prioridad: ventana de fechas (si está completa y es coherente) sobre `downtime_hours`.
 * Una ventana abierta (inicio sin fin) NO se estima hasta hoy —sería inventar un número
 * que crece solo— : cae a `downtime_hours` y se reporta aparte en `openOutOfServiceCount`.
 */
function downtimeOf(e: ReliabilityEvent): { hours: number; origin: "fechas" | "manual" | null; open: boolean } {
  const start = parseDay(e.out_of_service_start);
  const end = parseDay(e.out_of_service_end);

  if (start !== null && end !== null && end >= start) {
    return { hours: (end - start) / 3_600_000, origin: "fechas", open: false };
  }

  const manual = e.downtime_hours ?? 0;
  return { hours: manual, origin: manual > 0 ? "manual" : null, open: start !== null && end === null };
}

// ------------------------------------------------------------------- motor

export function computeReliability(input: ReliabilityInput): Reliability {
  const now = input.now ?? Date.now();

  // ---- Ventana del período (default: 12 meses móviles, acotada por la puesta en servicio)
  const endTs = parseDay(input.periodEnd) ?? startOfDayUtc(now);
  let startTs = parseDay(input.periodStart) ?? addMonths(endTs, -12);
  const installedTs = parseDay(input.installedAt);
  if (installedTs !== null && installedTs > startTs) startTs = installedTs;
  const periodDays = Math.max(0, Math.round((endTs - startTs) / DAY_MS));

  // ---- Eventos con fecha válida (descarta basura como "0006-01-08" o texto libre)
  const dated = input.events
    .map((e) => ({ e, ts: parseDay(e.event_date) }))
    .filter((x): x is { e: ReliabilityEvent; ts: number } => x.ts !== null)
    .sort((a, b) => a.ts - b.ts);

  const inPeriod = dated.filter((x) => x.ts >= startTs && x.ts <= endTs);

  // ---- Conteos, con la regla "mismo equipo, mismo día = una intervención"
  const rawInterventions = inPeriod.filter((x) => isIntervention(x.e));
  const rawFailures = inPeriod.filter((x) => isFailure(x.e));
  const sameAsset = () => "asset";
  const dedupedInterventions = dedupeSameDay(rawInterventions, sameAsset, (x) => x.e.event_date);
  const dedupedFailures = dedupeSameDay(rawFailures, sameAsset, (x) => x.e.event_date);

  const F = dedupedFailures.length;
  const R = dedupedInterventions.length;

  // ---- Parada: ventana de fechas si está, `downtime_hours` si no (ver downtimeOf)
  const downtimeParts = inPeriod.map((x) => downtimeOf(x.e));
  const downtimeHours = downtimeParts.reduce((a, p) => a + p.hours, 0);
  const failureDowntimeHours = dedupedFailures.reduce((a, x) => a + downtimeOf(x.e).hours, 0);

  const origins = new Set(
    downtimeParts.filter((p) => p.hours > 0 && p.origin !== null).map((p) => p.origin),
  );
  const downtimeSource: DowntimeSource =
    origins.size === 0 ? "sin_dato" : origins.size > 1 ? "mixto" : (origins.values().next().value as "fechas" | "manual");
  const openOutOfServiceCount = downtimeParts.filter((p) => p.open).length;

  // ---- Tiempo operativo: jerarquía horómetro → régimen → calendario puro
  let operatingHours: number;
  let operatingSource: OperatingSource;
  if (input.operatingHours != null) {
    operatingHours = Math.max(0, input.operatingHours);
    operatingSource = "horometro";
  } else if (input.regimeHoursPerDay != null) {
    operatingHours = Math.max(0, periodDays * input.regimeHoursPerDay - downtimeHours);
    operatingSource = "regimen";
  } else {
    operatingHours = Math.max(0, periodDays * 24 - downtimeHours);
    operatingSource = "calendario";
  }
  operatingHours = r1(operatingHours);

  // ---- KPIs. Con menos de 2 intervenciones no se publica ninguna tasa.
  const insufficientData = R < 2;
  const U = operatingHours;

  const mtbfHours = !insufficientData && F >= 1 ? r1(U / F) : null;
  const mtbrHours = !insufficientData ? r1(U / R) : null;
  const mttrHours = F >= 1 ? r1(failureDowntimeHours / F) : null;

  const availability =
    mtbfHours !== null && mttrHours !== null && mtbfHours + mttrHours > 0
      ? r3(mtbfHours / (mtbfHours + mttrHours))
      : null;

  const reactiveIndex = !insufficientData && R > 0 ? r2(F / R) : null;

  // ---- Tendencia: últimos 3 intervalos vs. los 3 anteriores. < 1 = se está degradando.
  const intervals: number[] = [];
  for (let i = 1; i < dedupedInterventions.length; i++) {
    intervals.push((dedupedInterventions[i].ts - dedupedInterventions[i - 1].ts) / DAY_MS);
  }
  let trend: number | null = null;
  if (intervals.length >= 6) {
    const recent = avg(intervals.slice(-3));
    const previous = avg(intervals.slice(-6, -3));
    if (previous > 0) trend = r2(recent / previous);
  }

  // ---- Confianza: cuánta historia respalda el número
  const historyStartTs = installedTs ?? dated[0]?.ts ?? startTs;
  const historyMonths = (endTs - historyStartTs) / DAY_MS / 30.44;
  const intervalCount = Math.max(0, R - 1);
  const confidence: Confidence =
    intervalCount >= 6 && historyMonths >= 12 ? "alta" : intervalCount >= 3 ? "media" : "baja";

  return {
    periodStart: toDay(startTs),
    periodEnd: toDay(endTs),
    periodDays,
    operatingHours,
    operatingSource,
    failures: F,
    interventions: R,
    dedupedSameDay:
      rawInterventions.length - dedupedInterventions.length +
      (rawFailures.length - dedupedFailures.length) -
      // Una falla colapsada ya se contó como intervención colapsada: no duplicar el aviso.
      Math.min(
        rawFailures.length - dedupedFailures.length,
        rawInterventions.length - dedupedInterventions.length,
      ),
    downtimeHours: r1(downtimeHours),
    failureDowntimeHours: r1(failureDowntimeHours),
    downtimeSource,
    openOutOfServiceCount,
    mtbfHours,
    mtbfDays: mtbfHours !== null ? Math.round(mtbfHours / 24) : null,
    mtbrHours,
    mtbrDays: mtbrHours !== null ? Math.round(mtbrHours / 24) : null,
    mttrHours,
    availability,
    reactiveIndex,
    trend,
    noFailuresInPeriod: F === 0,
    insufficientData,
    confidence,
    costByCurrency: costByCurrency(inPeriod.map((x) => x.e)),
    costByCurrencyAllTime: costByCurrency(dated.map((x) => x.e)),
  };
}
