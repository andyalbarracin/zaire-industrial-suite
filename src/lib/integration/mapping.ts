// mapping.ts — src/lib/integration/mapping.ts — 2026-08-27
// Traducción canónico → filas de las tablas reales de Zaire (`clients`, `products`).
// Funciones PURAS (sin Supabase, sin red): acá viven todas las reglas que impone el
// schema real, y son las que se testean en mapping.test.ts.
//
// REGLA: solo se escriben las columnas que la integración gobierna. Las columnas que
// carga una persona en Zaire NUNCA se pisan (ver listas de exclusión más abajo).

import type { CanonicalCustomer, CanonicalProduct } from "./types";
import type { Currency } from "@/lib/types/database";

/** Monedas que admite el CHECK `products_default_currency_check`. */
const MONEDAS_SOPORTADAS: Currency[] = ["USD", "ARS"];

/** Columnas de `clients` que escribe la integración. El resto no se toca jamás. */
export interface ClientImportRow {
  business_name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}
// NO se escriben: contact_name, notes, client_code, is_active.
//   → un cliente desactivado a mano en Zaire sigue desactivado después de reimportar.

/** Columnas de `products` que escribe la integración. */
export interface ProductImportRow {
  code: string | null;
  name: string;
  default_unit_price: number | null;
  default_currency?: Currency;
  unit?: string;
}
// NO se escriben: category, description, brand, model, notes, is_active.
//   → `category` tiene un CHECK con los 5 valores propios de Zaire
//     (sello_mecanico|bomba|empaquetadura|spare_part|otro). Las categorías de un ERP
//     externo no mapean a ese dominio y forzar 'otro' ensuciaría el dato: se deja NULL
//     (el CHECK acepta NULL) y la clasificación la sigue haciendo la gente en Zaire.

/** Trim + vacío → null. Odoo devuelve `false` en los campos vacíos; el adaptador ya lo normaliza. */
function limpiar(v: string | null | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

export function toClientRow(c: CanonicalCustomer): { row: ClientImportRow; warning: string | null } {
  const nombre = limpiar(c.nombre);
  // business_name es NOT NULL en `clients`: sin nombre el registro no es importable.
  if (!nombre) throw new Error("El registro no tiene nombre (business_name es obligatorio)");

  return {
    row: {
      business_name: nombre,
      tax_id: limpiar(c.cuit),
      email: limpiar(c.email),
      phone: limpiar(c.telefono),
      address: limpiar(c.direccion),
      city: limpiar(c.ciudad),
    },
    warning: null,
  };
}

export function toProductRow(p: CanonicalProduct): { row: ProductImportRow; warning: string | null } {
  const nombre = limpiar(p.nombre);
  // name es NOT NULL en `products`.
  if (!nombre) throw new Error("El registro no tiene nombre (name es obligatorio)");

  const row: ProductImportRow = {
    // `code` tiene un índice único PARCIAL (products_code_unique, WHERE code IS NOT NULL):
    // el vacío tiene que ir como NULL o el segundo producto sin código choca contra el índice.
    code: limpiar(p.codigo),
    name: nombre,
    default_unit_price: typeof p.precio === "number" && Number.isFinite(p.precio) ? p.precio : null,
  };

  let warning: string | null = null;

  const moneda = limpiar(p.moneda)?.toUpperCase();
  if (moneda) {
    if ((MONEDAS_SOPORTADAS as string[]).includes(moneda)) {
      row.default_currency = moneda as Currency;
    } else {
      // El CHECK solo admite USD/ARS. Se omite la columna (queda el default de la tabla)
      // en vez de romper el registro entero por la moneda.
      warning = `Moneda "${moneda}" no soportada por Zaire (solo USD/ARS): se dejó la moneda por defecto`;
    }
  }

  const unidad = limpiar(p.unidad);
  if (unidad) row.unit = unidad;

  return { row, warning };
}

/**
 * ¿Cambió el registro en el sistema externo desde la última sincronización?
 * Compara instantes, no strings: la fecha guardada vuelve de Postgres con offset
 * ("2026-08-27T14:33:12+00:00") y la de Odoo llega en ISO Z.
 * Si falta alguna de las dos, se asume que cambió (más vale actualizar de más).
 */
export function huboCambio(externalWriteDate: string | null, guardada: string | null): boolean {
  if (!externalWriteDate || !guardada) return true;
  const a = new Date(externalWriteDate).getTime();
  const b = new Date(guardada).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return a !== b;
}
