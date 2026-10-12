// identity.ts — src/lib/assets/identity.ts — 2026-10-02
// Identidad del activo: normalización, lista negra de placeholders y dedupe del mismo día.
// PURO y testeable. Las dos reglas salen del dato real de producción, no de la teoría:
//   1. "S/N" y "SN" son el placeholder de "sin número", no equipos. Agrupar por ellos crea
//      un equipo fantasma que fusiona máquinas distintas y rompe el MTBF.
//   2. Una OT y una OTS del mismo día sobre el mismo equipo son UNA intervención. Sin esto
//      la cantidad de intervenciones se duplica y el MTBR se parte al medio.

/** Valores que la gente escribe cuando no hay número. No son identidad: son identidad ausente. */
const PLACEHOLDERS = new Set([
  "S/N", "SN", "S.N", "S.N.", "SIN NUMERO", "SIN SERIE",
  "N/A", "NA", "-", "--", ".", "0", "00", "X", "XX", "XXX", "?", "NN",
]);

/** Forma canónica: sin bordes, mayúsculas, un solo espacio entre palabras. */
function canonical(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  return v === "" ? null : v;
}

/**
 * true solo si hay contenido Y ese contenido es un placeholder.
 * Permite distinguir "cargó S/N" de "no cargó nada" al reportar cobertura.
 */
export function isPlaceholder(raw: string | null | undefined): boolean {
  const c = canonical(raw);
  if (c === null) return false;
  // Se chequean las dos formas: con espacios simples ("SIN NUMERO") y sin espacios ("S / N" → "S/N").
  return PLACEHOLDERS.has(c) || PLACEHOLDERS.has(c.replace(/\s/g, ""));
}

/** Identidad usable del equipo, o null si está ausente o es un placeholder. */
export function normalizeIdentity(raw: string | null | undefined): string | null {
  const c = canonical(raw);
  if (c === null || isPlaceholder(c)) return null;
  return c;
}

/**
 * Colapsa a una sola fila las que comparten equipo y día calendario, conservando la primera
 * de cada grupo y el orden de entrada. La hora se ignora a propósito.
 */
export function dedupeSameDay<T>(
  rows: T[],
  keyOf: (row: T) => string,
  dateOf: (row: T) => string,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const day = dateOf(row).slice(0, 10);
    const id = `${keyOf(row)}@${day}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}
