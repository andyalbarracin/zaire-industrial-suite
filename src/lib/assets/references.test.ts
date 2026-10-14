// references.test.ts — src/lib/assets/references.test.ts — 2026-10-12
// Tests de la resolución de referencias del ZHI: valor del equipo → mediana de la propia
// flota → tabla default. Y de que la tabla default siga vacía.

import { describe, it, expect } from "vitest";
import {
  computeFleetReferences,
  resolveReferences,
  MIN_FLEET_FOR_REFERENCE,
  MTBF_DEFAULT_BY_TYPE,
  MTBR_DEFAULT_BY_TYPE,
  type FleetMember,
} from "@/lib/assets/references";
import type { AssetType } from "@/lib/assets/types";

/** n bombas con MTBF/MTBR observados. */
function bombas(mtbf: (number | null)[], mtbr?: (number | null)[]): FleetMember[] {
  return mtbf.map((m, i) => ({
    type: "bomba" as AssetType,
    mtbfHours: m,
    mtbrHours: mtbr ? mtbr[i] : m,
  }));
}

describe("la tabla default de Zaire está VACÍA, y es a propósito", () => {
  // El análisis §6.3 dice textual: "a construir y validar con clientes; no inventar valores
  // de industria". Si alguien la llena con números inventados, este test falla y lo obliga a
  // enfrentar la decisión en vez de que se cuele.
  it("MTBF no tiene defaults por tipo", () => {
    expect(Object.keys(MTBF_DEFAULT_BY_TYPE)).toEqual([]);
  });
  it("MTBR no tiene defaults por tipo", () => {
    expect(Object.keys(MTBR_DEFAULT_BY_TYPE)).toEqual([]);
  });
});

describe("computeFleetReferences — la mediana de la propia flota", () => {
  it("hacen falta al menos 5 equipos comparables", () => {
    expect(MIN_FLEET_FOR_REFERENCE).toBe(5);
  });

  it("con 5 equipos devuelve la mediana", () => {
    const r = computeFleetReferences(bombas([100, 200, 300, 400, 500]));
    expect(r.mtbfByType.bomba).toBe(300);
  });

  it("con cantidad par promedia los dos del medio", () => {
    const r = computeFleetReferences(bombas([100, 200, 300, 400, 500, 600]));
    expect(r.mtbfByType.bomba).toBe(350);
  });

  it("no le importa el orden de entrada", () => {
    const a = computeFleetReferences(bombas([500, 100, 400, 200, 300]));
    expect(a.mtbfByType.bomba).toBe(300);
  });

  it("con 4 equipos NO alcanza: el tipo no entra", () => {
    const r = computeFleetReferences(bombas([100, 200, 300, 400]));
    expect(r.mtbfByType.bomba).toBeUndefined();
  });

  it("los equipos SIN dato observado no cuentan para el mínimo", () => {
    // 6 bombas, pero solo 4 tienen MTBF medido → no alcanza
    const r = computeFleetReferences(bombas([100, 200, null, 300, null, 400]));
    expect(r.mtbfByType.bomba).toBeUndefined();
  });

  it("un equipo sin dato no ensucia la mediana de los que sí tienen", () => {
    const r = computeFleetReferences(bombas([100, 200, 300, 400, 500, null]));
    expect(r.mtbfByType.bomba).toBe(300);
  });

  it("los equipos sin tipo no se pueden comparar: quedan afuera", () => {
    const sinTipo: FleetMember[] = Array.from({ length: 6 }, () => ({ type: null, mtbfHours: 100, mtbrHours: 100 }));
    const r = computeFleetReferences(sinTipo);
    expect(Object.keys(r.mtbfByType)).toEqual([]);
  });

  it("cada tipo tiene su propia mediana y no se mezclan", () => {
    const flota: FleetMember[] = [
      ...bombas([100, 200, 300, 400, 500]),
      ...Array.from({ length: 5 }, () => ({ type: "compresor" as AssetType, mtbfHours: 9000, mtbrHours: 9000 })),
    ];
    const r = computeFleetReferences(flota);
    expect(r.mtbfByType.bomba).toBe(300);
    expect(r.mtbfByType.compresor).toBe(9000);
  });

  it("MTBF y MTBR se cuentan por separado: un tipo puede tener uno y no el otro", () => {
    // 5 bombas con MTBF medido, pero solo 3 con MTBR
    const r = computeFleetReferences(bombas([100, 200, 300, 400, 500], [100, 200, 300, null, null]));
    expect(r.mtbfByType.bomba).toBe(300);
    expect(r.mtbrByType.bomba).toBeUndefined();
  });

  it("una flota vacía no inventa nada", () => {
    const r = computeFleetReferences([]);
    expect(r.mtbfByType).toEqual({});
    expect(r.mtbrByType).toEqual({});
  });

  it("descarta valores no positivos: un MTBF de 0 no es una referencia", () => {
    const r = computeFleetReferences(bombas([0, 0, 100, 200, 300, 400, 500]));
    expect(r.mtbfByType.bomba).toBe(300); // los dos ceros quedan afuera
  });
});

describe("resolveReferences — la jerarquía de 3 niveles", () => {
  const flotaConBombas = computeFleetReferences(bombas([100, 200, 300, 400, 500]));

  it("1º — el valor cargado para ESE equipo le gana a todo", () => {
    const r = resolveReferences({ type: "bomba", mtbf_referencia: 7777, mtbr_referencia: 555 }, flotaConBombas);
    expect(r.mtbf).toEqual({ hours: 7777, source: "equipo" });
    expect(r.mtbr).toEqual({ hours: 555, source: "equipo" });
  });

  it("2º — sin valor propio usa la mediana de su flota, y lo declara", () => {
    const r = resolveReferences({ type: "bomba", mtbf_referencia: null, mtbr_referencia: null }, flotaConBombas);
    expect(r.mtbf).toEqual({ hours: 300, source: "flota" });
  });

  it("3º — sin valor propio ni flota, la tabla default está vacía: sin referencia", () => {
    const r = resolveReferences({ type: "motor", mtbf_referencia: null, mtbr_referencia: null }, flotaConBombas);
    expect(r.mtbf).toEqual({ hours: null, source: "sin_referencia" });
  });

  it("un equipo sin tipo y sin valor propio no tiene con qué compararse", () => {
    const r = resolveReferences({ type: null, mtbf_referencia: null, mtbr_referencia: null }, flotaConBombas);
    expect(r.mtbf.source).toBe("sin_referencia");
  });

  it("un valor propio de 0 o negativo no es una referencia válida: cae al nivel siguiente", () => {
    expect(resolveReferences({ type: "bomba", mtbf_referencia: 0 }, flotaConBombas).mtbf).toEqual({ hours: 300, source: "flota" });
    expect(resolveReferences({ type: "bomba", mtbf_referencia: -5 }, flotaConBombas).mtbf).toEqual({ hours: 300, source: "flota" });
  });

  it("las columnas pueden no existir (base sin migrar) y no rompe", () => {
    const r = resolveReferences({ type: "bomba" }, flotaConBombas);
    expect(r.mtbf).toEqual({ hours: 300, source: "flota" });
  });

  it("MTBF y MTBR se resuelven por separado: uno propio y el otro de flota", () => {
    const r = resolveReferences({ type: "bomba", mtbf_referencia: 7777, mtbr_referencia: null }, flotaConBombas);
    expect(r.mtbf.source).toBe("equipo");
    expect(r.mtbr.source).toBe("flota");
  });

  it("lo que devuelve es exactamente lo que el ZHI espera recibir", () => {
    const r = resolveReferences({ type: "bomba", mtbf_referencia: null }, flotaConBombas);
    // El ZHI recibe `mtbfReferenceHours: number | null` — si es null, el sub-índice sale null.
    expect(typeof r.mtbf.hours === "number" || r.mtbf.hours === null).toBe(true);
  });
});
