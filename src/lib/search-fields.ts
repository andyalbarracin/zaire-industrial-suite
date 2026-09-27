// search-fields.ts — src/lib/search-fields.ts — 2026-09-26
// Registro ÚNICO de los campos que cubre la búsqueda universal. Sumar un campo buscable es
// agregarlo acá: lib/search.ts arma las consultas a partir de estas listas y no menciona columnas.

import { ORDER_STATUSES } from "@/lib/trace/constants";
import { BRANCHES } from "@/lib/constants";

/**
 * Campos de texto de la ORDEN. La intención de la búsqueda de Trace es ser universal sobre la
 * OT/OTS: que encuentre por cualquier término que el cliente haya escrito, esté en la cabecera de
 * la orden o en cualquiera de sus ítems.
 */
export const TRACE_ORDER_FIELDS = [
  "order_number",
  "general_notes",
  "orden_compra",
  "remito_salida",
  "requiere_compra",
] as const;

/**
 * Campos de texto de los ÍTEMS. El TAG (`equipment_number`) es la identidad del equipo y está
 * cargado en muchas más órdenes que el número de serie, así que es el campo más importante de esta
 * lista: sin él no existe el flujo de "ver la historia de este equipo".
 */
export const TRACE_ITEM_FIELDS = [
  "equipment_number",
  "serial_number",
  "custom_description",
  "marca",
  "modelo",
  "medida",
  "materiales_caras",
  "materiales_orings",
  "origen_abastecimiento",
  "orden_compra_item",
  "additional_observation",
  "diagnosis",
  "work_performed",
  "notes",
] as const;

/** Campos del CLIENTE por los que se puede llegar a una orden. */
export const TRACE_CLIENT_FIELDS = ["business_name", "client_code", "tax_id"] as const;

/** Campos de ítem que se muestran como subtítulo del resultado, en orden de preferencia. */
export const TRACE_ITEM_PREVIEW_FIELDS = ["equipment_number", "serial_number", "custom_description"] as const;

/**
 * Cláusula `or` de PostgREST: `campo.ilike.%term%,otro.ilike.%term%`.
 * El término ya tiene que venir saneado (ver sanitizeTerm): las comas y los paréntesis son
 * separadores de la sintaxis de PostgREST y romperían la consulta.
 */
export function ilikeOr(fields: readonly string[], term: string): string {
  return fields.map((f) => `${f}.ilike.%${term}%`).join(",");
}

/** Quita los caracteres que PostgREST interpreta como sintaxis dentro de un `or`. */
export function sanitizeTerm(term: string): string {
  return term.replace(/[,()%*\\]/g, " ").trim();
}

// ─── Interpretación del término ───────────────────────────────────────────────
// Un término también puede referirse a algo que NO es texto libre: un estado, un tipo, una
// sucursal o una fecha. Se resuelve en memoria contra las constantes que ya existen y se traduce
// a filtros, para no obligar al usuario a escribir el valor interno ("en_reparacion").

/** Estados cuyo valor o etiqueta contienen el término ("factur" → ["facturada"]). */
export function matchStatuses(term: string): string[] {
  const t = term.toLowerCase();
  return ORDER_STATUSES
    .filter((s) => s.value.replace(/_/g, " ").includes(t) || s.label.toLowerCase().includes(t))
    .map((s) => s.value);
}

/** Sucursales cuyo id, código o nombre contienen el término ("bahía" → ["bb"]). */
export function matchBranches(term: string): string[] {
  const t = term.toLowerCase();
  return BRANCHES
    .filter((b) => b.id === t || b.code.toLowerCase() === t || b.name.toLowerCase().includes(t))
    .map((b) => b.id);
}

/** "OT" / "OTS" exactos. No se usa prefijo: "OT" matchearía todas las OTS. */
export function matchOrderType(term: string): "OT" | "OTS" | null {
  const t = term.trim().toUpperCase();
  return t === "OT" || t === "OTS" ? t : null;
}

/**
 * Interpreta el término como fecha y devuelve el rango `[desde, hasta)` en ISO.
 * Formatos aceptados: `15/03/2026`, `15-03-2026`, `2026-03-15` (un día); `03/2026`, `2026-03`
 * (un mes); `2026` (un año). Devuelve `null` si no parece una fecha.
 */
export function matchDateRange(term: string): { from: string; to: string } | null {
  const t = term.trim();
  const range = (from: Date, to: Date) => ({ from: from.toISOString(), to: to.toISOString() });
  // Sin validar, "13/2026" se interpretaría como enero de 2027 y devolvería resultados de otra
  // fecha en vez de ninguno.
  const day = (y: number, m: number, d: number) =>
    m >= 1 && m <= 12 && d >= 1 && d <= 31
      ? range(new Date(Date.UTC(y, m - 1, d)), new Date(Date.UTC(y, m - 1, d + 1)))
      : null;
  const month = (y: number, m: number) =>
    m >= 1 && m <= 12 ? range(new Date(Date.UTC(y, m - 1, 1)), new Date(Date.UTC(y, m, 1))) : null;

  // Un año suelto se descarta a propósito: "2026" aparece en todos los números de orden y como
  // rango de fecha devolvería prácticamente toda la base.
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return day(+m[1], +m[2], +m[3]);

  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return day(+m[3], +m[2], +m[1]);

  m = t.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return month(+m[1], +m[2]);

  m = t.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return month(+m[2], +m[1]);

  return null;
}
