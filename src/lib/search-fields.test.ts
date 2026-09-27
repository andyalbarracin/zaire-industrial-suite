// search-fields.test.ts — src/lib/search-fields.test.ts — 2026-09-26
// Registro de campos buscables e interpretación del término (estado, sucursal, tipo, fecha).

import { describe, it, expect } from "vitest";
import {
  TRACE_ORDER_FIELDS, TRACE_ITEM_FIELDS, TRACE_CLIENT_FIELDS,
  ilikeOr, sanitizeTerm, matchStatuses, matchBranches, matchOrderType, matchDateRange,
} from "@/lib/search-fields";

describe("campos buscables", () => {
  it("los ítems incluyen el TAG y la serie", () => {
    // El TAG es la identidad del equipo: sin él no existe el flujo de "ver la historia de
    // este equipo", que es lo que motivó ampliar la búsqueda.
    expect(TRACE_ITEM_FIELDS).toContain("equipment_number");
    expect(TRACE_ITEM_FIELDS).toContain("serial_number");
  });

  it("la orden incluye número y observaciones; el cliente, razón social y código", () => {
    expect(TRACE_ORDER_FIELDS).toContain("order_number");
    expect(TRACE_ORDER_FIELDS).toContain("general_notes");
    expect(TRACE_CLIENT_FIELDS).toContain("business_name");
    expect(TRACE_CLIENT_FIELDS).toContain("client_code");
  });

  it("no hay campos repetidos", () => {
    for (const fields of [TRACE_ORDER_FIELDS, TRACE_ITEM_FIELDS, TRACE_CLIENT_FIELDS]) {
      expect(new Set(fields).size).toBe(fields.length);
    }
  });
});

describe("ilikeOr / sanitizeTerm", () => {
  it("arma la cláusula `or` de PostgREST", () => {
    expect(ilikeOr(["equipment_number", "serial_number"], "413J"))
      .toBe("equipment_number.ilike.%413J%,serial_number.ilike.%413J%");
  });

  it("saca los caracteres que son sintaxis de PostgREST", () => {
    // Una coma o un paréntesis sin sanear parten la cláusula en dos y rompen la consulta.
    expect(sanitizeTerm("a,b(c)")).not.toContain(",");
    expect(sanitizeTerm("a,b(c)")).not.toContain("(");
    expect(sanitizeTerm("50%")).not.toContain("%");
  });

  it("un término que era solo sintaxis queda vacío", () => {
    expect(sanitizeTerm(",,,")).toBe("");
  });

  it("no toca un término normal", () => {
    expect(sanitizeTerm("MCC CLARCK")).toBe("MCC CLARCK");
    expect(sanitizeTerm("OT-2026-BB0001")).toBe("OT-2026-BB0001");
  });
});

describe("interpretación del término", () => {
  it("reconoce estados por etiqueta y por valor interno", () => {
    expect(matchStatuses("factur")).toEqual(["facturada"]);
    expect(matchStatuses("en reparacion")).toEqual(["en_reparacion"]);
  });

  it("no inventa estados para un término cualquiera", () => {
    expect(matchStatuses("413J")).toEqual([]);
  });

  it("reconoce sucursales por nombre y por código", () => {
    expect(matchBranches("bahía")).toEqual(["bb"]);
    expect(matchBranches("BB")).toEqual(["bb"]);
    expect(matchBranches("xyz")).toEqual([]);
  });

  it("el tipo solo matchea exacto", () => {
    // Con prefijo, "OT" traería además todas las OTS y el filtro dejaría de significar nada.
    expect(matchOrderType("ot")).toBe("OT");
    expect(matchOrderType("OTS")).toBe("OTS");
    expect(matchOrderType("OT-2026-BB0001")).toBeNull();
  });
});

describe("matchDateRange", () => {
  it("interpreta un día en formato local y en ISO", () => {
    expect(matchDateRange("15/03/2026")).toEqual({
      from: "2026-03-15T00:00:00.000Z", to: "2026-03-16T00:00:00.000Z",
    });
    expect(matchDateRange("2026-03-15")).toEqual(matchDateRange("15/03/2026"));
    expect(matchDateRange("15-03-2026")).toEqual(matchDateRange("15/03/2026"));
  });

  it("interpreta un mes completo", () => {
    expect(matchDateRange("2026-03")).toEqual({
      from: "2026-03-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z",
    });
    expect(matchDateRange("03/2026")).toEqual(matchDateRange("2026-03"));
  });

  it("el mes de diciembre cierra en el año siguiente", () => {
    expect(matchDateRange("2026-12")!.to).toBe("2027-01-01T00:00:00.000Z");
  });

  it("un año suelto NO es una fecha", () => {
    // "2026" está en todos los números de orden: como rango devolvería casi toda la base.
    expect(matchDateRange("2026")).toBeNull();
  });

  it("descarta meses y días fuera de rango", () => {
    // Sin validar, "13/2026" caería en enero de 2027 y devolvería órdenes de otra fecha.
    expect(matchDateRange("13/2026")).toBeNull();
    expect(matchDateRange("32/03/2026")).toBeNull();
    expect(matchDateRange("15/13/2026")).toBeNull();
  });

  it("un término que no es fecha devuelve null", () => {
    expect(matchDateRange("413J")).toBeNull();
    expect(matchDateRange("OT-2026-BB0001")).toBeNull();
  });
});
