// identity.test.ts — src/lib/assets/identity.test.ts — 2026-10-02
// Tests de la identidad del activo: normalización, lista negra de placeholders y dedupe del mismo día.
// Las dos reglas duras salen del dato real de producción (ver .docs/assets-confiabilidad/F0-auditoria).

import { describe, it, expect } from "vitest";
import { normalizeIdentity, isPlaceholder, dedupeSameDay } from "@/lib/assets/identity";

describe("normalizeIdentity", () => {
  it("recorta, pasa a mayúsculas y colapsa espacios internos", () => {
    expect(normalizeIdentity("  mcc   clarck ")).toBe("MCC CLARCK");
    expect(normalizeIdentity("413j")).toBe("413J");
  });

  it("devuelve null cuando no hay nada cargado", () => {
    expect(normalizeIdentity("")).toBeNull();
    expect(normalizeIdentity("   ")).toBeNull();
    expect(normalizeIdentity(null)).toBeNull();
    expect(normalizeIdentity(undefined)).toBeNull();
  });

  it("devuelve null para cada placeholder de la lista negra", () => {
    const placeholders = [
      "S/N", "SN", "S.N", "S.N.", "SIN NUMERO", "SIN SERIE",
      "N/A", "NA", "-", "--", ".", "0", "00", "X", "XX", "XXX", "?", "NN",
    ];
    for (const p of placeholders) {
      expect(normalizeIdentity(p), `"${p}" debería ser placeholder`).toBeNull();
    }
  });

  it("detecta placeholders escritos con otra caja o con espacios de más", () => {
    expect(normalizeIdentity("s/n")).toBeNull();
    expect(normalizeIdentity(" S / N ")).toBeNull();
    expect(normalizeIdentity("sin  numero")).toBeNull();
  });

  it("no confunde un TAG real que contiene un placeholder como subcadena", () => {
    expect(normalizeIdentity("SN-4120")).toBe("SN-4120");
    expect(normalizeIdentity("X-15")).toBe("X-15");
  });
});

describe("isPlaceholder", () => {
  it("es true solo cuando hay contenido y ese contenido es un placeholder", () => {
    expect(isPlaceholder("S/N")).toBe(true);
    expect(isPlaceholder("s/n")).toBe(true);
  });

  it("distingue 'cargó un placeholder' de 'no cargó nada'", () => {
    expect(isPlaceholder("")).toBe(false);
    expect(isPlaceholder(null)).toBe(false);
  });

  it("es false para una identidad real", () => {
    expect(isPlaceholder("413J")).toBe(false);
  });
});

describe("dedupeSameDay", () => {
  // Regla dura: OT + OTS el mismo día sobre el mismo equipo = UNA intervención.
  // Casos reales en producción: OT-2026-BB0041 + OTS-2026-SRBB00059 (2026-08-10)
  // y OT-2026-BB0047 + OTS-2026-SRBB00067 (2026-09-08), ambos con intervalo 0 días.
  const rows = [
    { id: "ot41", key: "413J", date: "2026-08-10" },
    { id: "ots59", key: "413J", date: "2026-08-10" },
    { id: "ots61", key: "413J", date: "2026-08-18" },
    { id: "ots67", key: "1661C", date: "2026-09-08" },
  ];
  const keyOf = (r: (typeof rows)[number]) => r.key;
  const dateOf = (r: (typeof rows)[number]) => r.date;

  it("colapsa dos filas del mismo equipo y la misma fecha en una", () => {
    const out = dedupeSameDay(rows, keyOf, dateOf);
    expect(out).toHaveLength(3);
  });

  it("conserva la primera fila de cada par colapsado", () => {
    const out = dedupeSameDay(rows, keyOf, dateOf);
    expect(out.map((r) => r.id)).toEqual(["ot41", "ots61", "ots67"]);
  });

  it("no colapsa la misma fecha en equipos distintos", () => {
    const sameDayOtherAsset = [
      { id: "a", key: "413J", date: "2026-09-08" },
      { id: "b", key: "1661C", date: "2026-09-08" },
    ];
    const out = dedupeSameDay(sameDayOtherAsset, (r) => r.key, (r) => r.date);
    expect(out).toHaveLength(2);
  });

  it("ignora la hora: dos timestamps del mismo día se colapsan", () => {
    const withTimes = [
      { id: "a", key: "413J", date: "2026-08-10T08:00:00Z" },
      { id: "b", key: "413J", date: "2026-08-10T17:30:00Z" },
    ];
    const out = dedupeSameDay(withTimes, (r) => r.key, (r) => r.date);
    expect(out).toHaveLength(1);
  });

  it("devuelve una lista vacía sin tocar nada", () => {
    expect(dedupeSameDay([], keyOf, dateOf)).toEqual([]);
  });
});
