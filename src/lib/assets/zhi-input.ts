// zhi-input.ts — src/lib/assets/zhi-input.ts — 2026-10-13
// Traduce lo que hay en la base (equipo + eventos + documentos + referencias) a un `ZhiInput`.
// PURO: `now` entra como parámetro. Es la capa donde se decide **qué señal existe de verdad**,
// así que acá quedan documentados los dos huecos del esquema que hoy limitan al ZHI.
//
// ─────────────────────── HUECO 1: no hay documentos de inspección ───────────────────────
// El §6.2 penaliza "inspección vencida −40" y el §6.4 pone un tope de 59 por eso. Pero el
// catálogo de `doc_type` que ofrece la UI (`asset-documents-section.tsx`) es
// manual / certificado / plano / garantia / otro: **no existe "inspeccion"**.
// La columna es TEXT libre y sin CHECK, así que este módulo YA cuenta los documentos tipados
// como `inspeccion`: en cuanto la UI ofrezca la opción, la señal empieza a pesar sin tocar
// este archivo. Mientras no la ofrezca, `expiredInspections` es siempre 0 y esa penalización
// (y su tope) quedan inertes.
//
// ──────────────── HUECO 2: `valor_reposicion` no tiene moneda ────────────────
// Los costos de los eventos llevan `currency` (ARS o USD); `assets.valor_reposicion` es un
// numeric pelado. El sub-índice de Costo compara una cosa contra la otra, y comparar pesos
// contra un valor sin moneda es exactamente el error que la suite evita en todos los informes.
// Regla que aplica este módulo: el costo se pasa SOLO si todos los costos del período están en
// UNA moneda (y ahí se asume que `valor_reposicion` está en esa misma). Si hay dos monedas, se
// devuelven `null` los dos y el sub-índice sale `null` → el ZHI renormaliza. Mejor no contestar
// que contestar con un número que mezcla monedas.

import { computeReliability, isFailure, type Reliability } from "@/lib/assets/reliability";
import { daysUntilExpiry } from "@/lib/utils";
import { computeFleetReferences, resolveReferences, type ResolvedReference } from "@/lib/assets/references";
import { computeZhi, type Zhi, type ZhiInput } from "@/lib/assets/zhi";
import type { Asset, AssetDocument, AssetEvent } from "@/lib/assets/types";

/** Tipos de documento cuyo vencimiento compromete la condición "en regla" del equipo. */
const DOC_CRITICOS = new Set(["certificado", "garantia"]);
/** Tipo de documento de inspección. Ver "HUECO 1" en el encabezado. */
const DOC_INSPECCION = "inspeccion";
/** Ventana de "por vencer" del §6.2. */
const POR_VENCER_DIAS = 30;

const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

/** Fecha parseable y plausible. Descarta la basura real que hay en producción (año 0006). */
function ts(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = Date.parse(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
  if (!Number.isFinite(t)) return null;
  return new Date(t).getUTCFullYear() >= 1900 ? t : null;
}

export interface BuildZhiInputArgs {
  asset: Asset;
  /** Resultado del motor para ESE equipo y ESE período. */
  reliability: Reliability;
  /** Eventos del equipo. Se usan para la última falla; los KPIs ya vienen en `reliability`. */
  events: readonly AssetEvent[];
  documents: readonly AssetDocument[];
  references: { mtbf: ResolvedReference; mtbr: ResolvedReference };
  now: number;
}

export function buildZhiInput({ asset, reliability, events, documents, references, now }: BuildZhiInputArgs): ZhiInput {
  // ---- Días desde la última falla (tope de 14 días del §6.4).
  // Usa `isFailure` del motor: la taxonomía se define en un solo lugar.
  const ultimaFalla = events
    .filter((e) => isFailure(e))
    .map((e) => ts(e.event_date))
    .filter((t): t is number => t !== null)
    .sort((a, b) => b - a)[0];
  const daysSinceLastFailure = ultimaFalla === undefined
    ? null
    : Math.max(0, Math.floor((now - ultimaFalla) / DAY_MS));

  // ---- Integridad: se cuenta solo lo que tiene fecha de vencimiento.
  let expiredInspections = 0;
  let expiredCriticalDocs = 0;
  let docsExpiringSoon = 0;
  for (const d of documents) {
    const dias = daysUntilExpiry(d.expires_at, now);
    if (dias === null) continue;
    const tipo = (d.doc_type ?? "").toLowerCase();
    if (dias < 0) {
      if (tipo === DOC_INSPECCION) expiredInspections += 1;
      else if (DOC_CRITICOS.has(tipo)) expiredCriticalDocs += 1;
    } else if (dias <= POR_VENCER_DIAS) {
      docsExpiringSoon += 1;
    }
  }
  // La garantía del propio equipo cuenta igual que una garantía adjunta. Hoy `warranty_until`
  // no dispara ninguna alerta en la campana (hallazgo de F0); acá sí pesa.
  const diasGarantia = daysUntilExpiry(asset.warranty_until, now);
  if (diasGarantia !== null) {
    if (diasGarantia < 0) expiredCriticalDocs += 1;
    else if (diasGarantia <= POR_VENCER_DIAS) docsExpiringSoon += 1;
  }

  // ---- Completitud de la ficha (§5). `criticidad` NO se chequea: es NOT NULL con default,
  // así que nunca falta y reportarla sería ruido.
  const camposFichaFaltantes: string[] = [];
  if (!asset.serial?.trim()) camposFichaFaltantes.push("serie");
  if (!asset.site_id && !asset.address?.trim()) camposFichaFaltantes.push("ubicación");
  if (!asset.installed_at) camposFichaFaltantes.push("puesta en servicio");
  if (asset.valor_reposicion == null) camposFichaFaltantes.push("valor de reposición");

  // ---- Costo del período, solo si no hay ambigüedad de moneda (ver HUECO 2).
  const monedas = reliability.costByCurrency;
  const costoUnivoco = monedas.length <= 1;
  const maintenanceCost12m = costoUnivoco ? (monedas[0]?.value ?? 0) : null;
  const replacementValue = costoUnivoco ? (asset.valor_reposicion ?? null) : null;

  // ---- Edad
  const instalado = ts(asset.installed_at);
  const ageYears = instalado === null ? null : (now - instalado) / YEAR_MS;

  return {
    status: asset.status,
    criticidad: asset.criticidad,

    operatingHours: reliability.operatingHours,
    failures: reliability.failures,
    interventions: reliability.interventions,
    reactiveIndex: reliability.reactiveIndex,
    trend: reliability.trend,
    confidence: reliability.confidence,
    daysSinceLastFailure,

    mtbfReferenceHours: references.mtbf.hours,
    mtbrReferenceHours: references.mtbr.hours,

    expiredInspections,
    expiredCriticalDocs,
    docsExpiringSoon,
    camposFichaFaltantes,

    maintenanceCost12m,
    replacementValue,
    ageYears,
    expectedLifeYears: asset.expected_life_years,
  };
}

// ------------------------------------------------------------ nivel de flota

export interface FleetZhiMember {
  asset: Asset;
  events: readonly AssetEvent[];
  documents: readonly AssetDocument[];
}

/**
 * Calcula el ZHI de una flota completa, en DOS pasadas, y el orden importa:
 *
 *  1ª — el motor de confiabilidad por equipo. De ahí sale el MTBF/MTBR **observado** de cada uno.
 *  2ª — con esos observados se saca la **mediana por tipo** (§6.3), y recién entonces se puede
 *       resolver la referencia de cada equipo y calcular su salud.
 *
 * No se puede hacer en una pasada: la referencia de un equipo depende de lo que midieron los
 * demás. Es, justamente, la parte que el §6.7 señala como propietaria — la referencia se arma
 * sola con el uso de la flota.
 *
 * PURO: `now` entra como parámetro. Devuelve un ZHI por equipo, indexado por `asset.id`.
 */
export function computeFleetZhi(members: readonly FleetZhiMember[], now: number): Map<string, Zhi> {
  // 1ª pasada
  const reliabilities = members.map((m) => ({
    member: m,
    reliability: computeReliability({ events: m.events, installedAt: m.asset.installed_at, now }),
  }));

  // Medianas de la flota, sobre lo observado
  const fleet = computeFleetReferences(
    reliabilities.map(({ member, reliability }) => ({
      type: member.asset.type,
      mtbfHours: reliability.mtbfHours,
      mtbrHours: reliability.mtbrHours,
    })),
  );

  // 2ª pasada
  const out = new Map<string, Zhi>();
  for (const { member, reliability } of reliabilities) {
    const references = resolveReferences(member.asset, fleet);
    const input = buildZhiInput({
      asset: member.asset, reliability, events: member.events,
      documents: member.documents, references, now,
    });
    out.set(member.asset.id, computeZhi(input));
  }
  return out;
}
