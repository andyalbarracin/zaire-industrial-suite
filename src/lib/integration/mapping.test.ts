// mapping.test.ts — src/lib/integration/mapping.test.ts — 2026-08-27
// Tests del mapeo canónico → tablas reales. Cubren las reglas que impone el schema:
// NOT NULL, el CHECK de moneda, el índice único parcial de `code` y las columnas
// que la integración NO debe pisar.

import { describe, it, expect } from "vitest";
import { toClientRow, toProductRow, huboCambio } from "./mapping";
import type { CanonicalCustomer, CanonicalProduct } from "./types";

const cliente = (over: Partial<CanonicalCustomer> = {}): CanonicalCustomer => ({
  external_id: "1",
  external_write_date: "2026-08-27T10:00:00.000Z",
  nombre: "Bombas del Sur S.A.",
  ...over,
});

const producto = (over: Partial<CanonicalProduct> = {}): CanonicalProduct => ({
  external_id: "1",
  external_write_date: "2026-08-27T10:00:00.000Z",
  nombre: "Sello mecánico 45mm",
  ...over,
});

describe("toClientRow", () => {
  it("mapea los campos canónicos a las columnas de `clients`", () => {
    const { row } = toClientRow(
      cliente({ cuit: "30-12345678-9", email: "a@b.com", telefono: "+54 11 4444", direccion: "Av. Mitre 100", ciudad: "Avellaneda" })
    );
    expect(row).toEqual({
      business_name: "Bombas del Sur S.A.",
      tax_id: "30-12345678-9",
      email: "a@b.com",
      phone: "+54 11 4444",
      address: "Av. Mitre 100",
      city: "Avellaneda",
    });
  });

  it("nunca escribe columnas que carga una persona en Zaire", () => {
    const { row } = toClientRow(cliente());
    for (const col of ["contact_name", "notes", "client_code", "is_active"]) {
      expect(row).not.toHaveProperty(col);
    }
  });

  it("convierte los strings vacíos en null", () => {
    const { row } = toClientRow(cliente({ cuit: "   ", email: "", ciudad: null }));
    expect(row.tax_id).toBeNull();
    expect(row.email).toBeNull();
    expect(row.city).toBeNull();
  });

  it("rechaza el registro sin nombre (business_name es NOT NULL)", () => {
    expect(() => toClientRow(cliente({ nombre: "   " }))).toThrow(/nombre/i);
  });
});

describe("toProductRow", () => {
  it("mapea los campos canónicos a las columnas de `products`", () => {
    const { row } = toProductRow(producto({ codigo: "SM-045", precio: 1250.5, moneda: "USD", unidad: "Unidades" }));
    expect(row).toEqual({
      code: "SM-045",
      name: "Sello mecánico 45mm",
      default_unit_price: 1250.5,
      default_currency: "USD",
      unit: "Unidades",
    });
  });

  it("nunca escribe `category` (el CHECK solo admite los 5 valores de Zaire)", () => {
    const { row } = toProductRow(producto());
    for (const col of ["category", "description", "brand", "model", "notes", "is_active"]) {
      expect(row).not.toHaveProperty(col);
    }
  });

  it("manda `code` vacío como null, para no chocar contra products_code_unique", () => {
    // El índice es único PARCIAL (WHERE code IS NOT NULL): con "" el segundo producto
    // sin código rompería; con NULL conviven todos.
    expect(toProductRow(producto({ codigo: "" })).row.code).toBeNull();
    expect(toProductRow(producto({ codigo: "   " })).row.code).toBeNull();
    expect(toProductRow(producto({ codigo: undefined })).row.code).toBeNull();
  });

  it("omite la moneda no soportada y avisa, en vez de romper el registro", () => {
    const { row, warning } = toProductRow(producto({ moneda: "EUR" }));
    expect(row).not.toHaveProperty("default_currency");
    expect(warning).toMatch(/EUR/);
  });

  it("acepta USD y ARS en cualquier capitalización", () => {
    expect(toProductRow(producto({ moneda: "ars" })).row.default_currency).toBe("ARS");
    expect(toProductRow(producto({ moneda: "Usd" })).row.default_currency).toBe("USD");
  });

  it("omite `unit` cuando viene vacía, para que quede el default de la tabla", () => {
    expect(toProductRow(producto({ unidad: "" })).row).not.toHaveProperty("unit");
  });

  it("normaliza precios no numéricos a null", () => {
    expect(toProductRow(producto({ precio: null })).row.default_unit_price).toBeNull();
    expect(toProductRow(producto({ precio: Number.NaN })).row.default_unit_price).toBeNull();
    expect(toProductRow(producto({ precio: 0 })).row.default_unit_price).toBe(0);
  });

  it("rechaza el registro sin nombre (name es NOT NULL)", () => {
    expect(() => toProductRow(producto({ nombre: "" }))).toThrow(/nombre/i);
  });
});

describe("huboCambio", () => {
  it("es falso cuando el instante es el mismo aunque el formato difiera", () => {
    // Así vuelve la fecha de Postgres vs. cómo llega de Odoo.
    expect(huboCambio("2026-08-27T10:00:00.000Z", "2026-08-27T10:00:00+00:00")).toBe(false);
  });

  it("es verdadero cuando el registro externo se modificó", () => {
    expect(huboCambio("2026-08-27T11:00:00.000Z", "2026-08-27T10:00:00+00:00")).toBe(true);
  });

  it("ante datos faltantes o inválidos asume que cambió", () => {
    expect(huboCambio(null, "2026-08-27T10:00:00Z")).toBe(true);
    expect(huboCambio("2026-08-27T10:00:00Z", null)).toBe(true);
    expect(huboCambio("no-es-fecha", "2026-08-27T10:00:00Z")).toBe(true);
  });
});
