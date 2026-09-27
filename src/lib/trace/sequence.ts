// sequence.ts — src/lib/trace/sequence.ts — 2026-09-26
// Verificación de secuencia correlativa: parseo de números de orden y detección de huecos.
// Fuente ÚNICA del cálculo: la usan el PDF, la vista web y el resumen, para que no puedan
// contradecirse entre sí (antes el resumen y el detalle calculaban cada uno por su lado).

/**
 * La numeración de órdenes NO es una sola secuencia: la RPC `generate_order_number` recibe
 * `p_order_type` y `p_branch_id`, así que hay un contador independiente por **tipo + sucursal**.
 * En los datos reales conviven, por ejemplo, `OT-2026-BB0001…` y `OTS-2026-SRBB00001…`, que
 * arrancan los dos en 1. Comparar un número contra la fila anterior del listado —o agrupar solo
 * por sucursal— produce "saltos" falsos y, peor, **tapa huecos reales** de la otra serie.
 *
 * Serie = tipo + código de sucursal tal como aparece en el número (las OTS incluyen el prefijo
 * "SR"): `OT-BB`, `OTS-SRBB`, `OT-BUE`, `OTS-SRBUE`.
 */
export interface ParsedOrderNumber {
  /** "OT" | "OTS" */
  type: string;
  /** Código tal cual viene en el número: "BB", "SRBB", "BUE", "SRBUE". */
  code: string;
  /** Sucursal normalizada, sin el prefijo "SR": "BB", "BUE". */
  branch: string;
  /** Clave de la serie, que es lo que se verifica: "OT-BB", "OTS-SRBB". */
  series: string;
  seq: number;
}

export function parseOrderNumber(orderNumber: string): ParsedOrderNumber | null {
  const m = orderNumber.match(/^(OTS?)-\d{4}-([A-Z]+?)(\d+)$/);
  if (!m) return null;
  const [, type, code, digits] = m;
  return {
    type,
    code,
    branch: code.startsWith("SR") ? code.slice(2) : code,
    series: `${type}-${code}`,
    seq: parseInt(digits, 10),
  };
}

export type SequenceCheck = "inicio" | "correlativo" | "salto";

export interface SequenceInput {
  order_number: string;
  status: string;
}

export interface SequenceRow extends SequenceInput {
  series: string;
  branch: string;
  seq: number;
  /** Resultado de comparar contra la orden anterior **de la misma serie**. */
  check: SequenceCheck;
}

export interface SequenceGap {
  series: string;
  missing: number;
  around: string;
}

export interface SequenceReport {
  /** Filas ordenadas por serie y, dentro de cada serie, por número. */
  rows: SequenceRow[];
  gaps: SequenceGap[];
  /** Órdenes por serie, para el resumen. */
  countBySeries: { series: string; count: number }[];
  /** Números que no se pudieron interpretar: se informan, no se descartan en silencio. */
  unparsed: string[];
}

/**
 * Agrupa por serie, ordena por número dentro de cada una y marca cada fila como
 * `inicio` / `correlativo` / `salto`. Los huecos salen del MISMO recorrido que las marcas, así
 * que el resumen ("N huecos") y el detalle siempre coinciden.
 */
export function buildSequenceReport(input: SequenceInput[]): SequenceReport {
  const bySeries = new Map<string, (SequenceInput & ParsedOrderNumber)[]>();
  const unparsed: string[] = [];

  for (const row of input) {
    const parsed = parseOrderNumber(row.order_number);
    if (!parsed) { unparsed.push(row.order_number); continue; }
    const list = bySeries.get(parsed.series) ?? [];
    list.push({ ...row, ...parsed });
    bySeries.set(parsed.series, list);
  }

  const rows: SequenceRow[] = [];
  const gaps: SequenceGap[] = [];
  const countBySeries: { series: string; count: number }[] = [];

  for (const [series, list] of Array.from(bySeries.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    list.sort((a, b) => a.seq - b.seq);
    countBySeries.push({ series, count: list.length });

    list.forEach((row, i) => {
      const prev = i > 0 ? list[i - 1] : null;
      let check: SequenceCheck = "inicio";
      if (prev) {
        check = row.seq - prev.seq === 1 ? "correlativo" : "salto";
        for (let missing = prev.seq + 1; missing < row.seq; missing++) {
          gaps.push({ series, missing, around: `${series}: entre ${prev.order_number} y ${row.order_number}` });
        }
      }
      rows.push({
        order_number: row.order_number,
        status: row.status,
        series, branch: row.branch, seq: row.seq, check,
      });
    });
  }

  return { rows, gaps, countBySeries, unparsed };
}

/**
 * Patrón `LIKE` de PostgREST para filtrar un año + sucursal sobre `order_number`.
 * Las OTS llevan el prefijo "SR" antes del código de sucursal (`OTS-2026-SRBB00001`), así que un
 * único `%-2026-BB%` deja afuera **todas** las OTS de esa sucursal. Por eso se devuelven los dos
 * patrones y se consultan con un `or`.
 */
export function branchLikePatterns(year: string, branchCode: string): string[] {
  return [`%-${year}-${branchCode}%`, `%-${year}-SR${branchCode}%`];
}
