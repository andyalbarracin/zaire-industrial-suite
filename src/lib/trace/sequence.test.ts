// sequence.test.ts — src/lib/trace/sequence.test.ts — 2026-09-26
// Verificación de secuencia correlativa: series independientes, huecos reales y no-falsos-saltos.

import { describe, it, expect } from "vitest";
import { parseOrderNumber, buildSequenceReport, branchLikePatterns } from "@/lib/trace/sequence";

const ord = (order_number: string, status = "facturada") => ({ order_number, status });
const checks = (rows: { check: string }[]) => rows.map(r => r.check);

describe("parseOrderNumber", () => {
  it("separa tipo, sucursal y secuencia de una OT", () => {
    expect(parseOrderNumber("OT-2026-BB0007")).toEqual({
      type: "OT", code: "BB", branch: "BB", series: "OT-BB", seq: 7,
    });
  });

  it("conserva el prefijo SR en la serie pero normaliza la sucursal", () => {
    expect(parseOrderNumber("OTS-2026-SRBB00007")).toEqual({
      type: "OTS", code: "SRBB", branch: "BB", series: "OTS-SRBB", seq: 7,
    });
  });

  it("una OT y una OTS con el mismo número son series DISTINTAS", () => {
    expect(parseOrderNumber("OT-2026-BB0001")!.series)
      .not.toBe(parseOrderNumber("OTS-2026-SRBB00001")!.series);
  });

  it("devuelve null para números que no siguen el formato", () => {
    expect(parseOrderNumber("PRESUPUESTO-123")).toBeNull();
    expect(parseOrderNumber("")).toBeNull();
  });
});

describe("buildSequenceReport", () => {
  it("una serie continua no tiene huecos ni saltos", () => {
    const { rows, gaps } = buildSequenceReport([
      ord("OT-2026-BB0001"), ord("OT-2026-BB0002"), ord("OT-2026-BB0003"),
    ]);
    expect(gaps).toEqual([]);
    expect(checks(rows)).toEqual(["inicio", "correlativo", "correlativo"]);
  });

  it("detecta un hueco real y lo marca como salto en la fila siguiente", () => {
    const { rows, gaps } = buildSequenceReport([
      ord("OT-2026-BB0001"), ord("OT-2026-BB0002"), ord("OT-2026-BB0005"),
    ]);
    expect(gaps.map(g => g.missing)).toEqual([3, 4]);
    expect(gaps.every(g => g.series === "OT-BB")).toBe(true);
    expect(checks(rows)).toEqual(["inicio", "correlativo", "salto"]);
  });

  it("dos series de la MISMA sucursal no se contaminan entre sí", () => {
    // Este es el caso del informe real: OT y OTS de Bahía Blanca intercaladas, cada una
    // arrancando en 1. Antes toda OTS salía marcada como "salto".
    const { rows, gaps } = buildSequenceReport([
      ord("OT-2026-BB0001"), ord("OTS-2026-SRBB00001"),
      ord("OT-2026-BB0002"), ord("OTS-2026-SRBB00002"),
      ord("OT-2026-BB0003"), ord("OTS-2026-SRBB00003"),
    ]);
    expect(gaps).toEqual([]);
    expect(rows.filter(r => r.check === "salto")).toEqual([]);
    expect(rows.filter(r => r.check === "inicio").map(r => r.series)).toEqual(["OT-BB", "OTS-SRBB"]);
  });

  it("un hueco en una serie NO queda tapado por la otra serie de la misma sucursal", () => {
    // Falta OT-2026-BB0002. Agrupando solo por sucursal, OTS-…00002 llenaba el lugar y el
    // informe declaraba "0 huecos".
    const { gaps } = buildSequenceReport([
      ord("OT-2026-BB0001"), ord("OTS-2026-SRBB00001"),
      ord("OTS-2026-SRBB00002"),
      ord("OT-2026-BB0003"), ord("OTS-2026-SRBB00003"),
    ]);
    expect(gaps).toEqual([
      { series: "OT-BB", missing: 2, around: "OT-BB: entre OT-2026-BB0001 y OT-2026-BB0003" },
    ]);
  });

  it("cada sucursal arranca su propia serie sin marcar salto", () => {
    const { rows, gaps } = buildSequenceReport([
      ord("OT-2026-BB0001"), ord("OT-2026-BB0002"),
      ord("OT-2026-BUE00001"), ord("OT-2026-BUE00002"),
    ]);
    expect(gaps).toEqual([]);
    expect(checks(rows)).toEqual(["inicio", "correlativo", "inicio", "correlativo"]);
  });

  it("ordena por serie y por número aunque la entrada venga desordenada", () => {
    const { rows } = buildSequenceReport([
      ord("OTS-2026-SRBB00002"), ord("OT-2026-BB0002"),
      ord("OTS-2026-SRBB00001"), ord("OT-2026-BB0001"),
    ]);
    expect(rows.map(r => r.order_number)).toEqual([
      "OT-2026-BB0001", "OT-2026-BB0002", "OTS-2026-SRBB00001", "OTS-2026-SRBB00002",
    ]);
  });

  it("informa los números que no se pueden interpretar en vez de descartarlos", () => {
    const { rows, unparsed } = buildSequenceReport([ord("OT-2026-BB0001"), ord("SIN-FORMATO")]);
    expect(unparsed).toEqual(["SIN-FORMATO"]);
    expect(rows).toHaveLength(1);
  });

  it("cuenta las órdenes de cada serie", () => {
    const { countBySeries } = buildSequenceReport([
      ord("OT-2026-BB0001"), ord("OT-2026-BB0002"), ord("OTS-2026-SRBB00001"),
    ]);
    expect(countBySeries).toEqual([
      { series: "OT-BB", count: 2 }, { series: "OTS-SRBB", count: 1 },
    ]);
  });

  it("regresión con los datos reales de SAS: 4 series continuas, 0 huecos, 0 saltos", () => {
    const input = [
      ...Array.from({ length: 48 }, (_, i) => ord(`OT-2026-BB${String(i + 1).padStart(4, "0")}`)),
      ...Array.from({ length: 73 }, (_, i) => ord(`OTS-2026-SRBB${String(i + 1).padStart(5, "0")}`)),
      ord("OT-2026-BUE00001"),
      ...Array.from({ length: 2 }, (_, i) => ord(`OTS-2026-SRBUE${String(i + 1).padStart(5, "0")}`)),
    ];
    const { rows, gaps, countBySeries } = buildSequenceReport(input);

    expect(rows).toHaveLength(124);
    expect(gaps).toEqual([]);
    expect(rows.filter(r => r.check === "salto")).toEqual([]);
    expect(rows.filter(r => r.check === "inicio")).toHaveLength(4);
    expect(countBySeries).toEqual([
      { series: "OT-BB", count: 48 }, { series: "OT-BUE", count: 1 },
      { series: "OTS-SRBB", count: 73 }, { series: "OTS-SRBUE", count: 2 },
    ]);
  });
});

describe("branchLikePatterns", () => {
  it("incluye el prefijo SR para no dejar afuera las OTS de la sucursal", () => {
    const [ot, ots] = branchLikePatterns("2026", "BB");
    expect("OT-2026-BB0001").toContain(ot.replaceAll("%", ""));
    expect("OTS-2026-SRBB00001").toContain(ots.replaceAll("%", ""));
    expect("OTS-2026-SRBB00001").not.toContain(ot.replaceAll("%", ""));
  });
});
