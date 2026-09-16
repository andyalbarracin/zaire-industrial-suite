// amounts.ts — src/lib/trace/amounts.ts — 2026-09-07
// Resolución de importes bi-moneda de una OT/OTS para mostrarlos en documentos y pantallas.

import type { Currency } from "@/lib/types/database";

/**
 * Las órdenes guardan los importes en DOS columnas paralelas e independientes (no es una
 * conversión): `unit_price`/`total_price`/`subtotal`/`total` son los montos en USD, y
 * `unit_price_ars`/`total_price_ars`/`subtotal_ars`/`total_ars` los montos en ARS. El campo
 * `currency` de la orden indica cuál es la moneda principal de esa orden.
 *
 * Un usuario carga el importe en el campo que corresponde a la operación: si la OT es en pesos
 * completa el precio en ARS y el de USD queda en 0 (y viceversa). Por eso NO alcanza con leer
 * siempre la columna de USD — así se imprimía $0 en toda orden facturada en pesos.
 *
 * Regla que aplica esta función:
 *  1. Toma el importe de la moneda declarada en la orden.
 *  2. Si ese importe es 0 pero el de la otra moneda tiene valor, devuelve ese otro **junto con su
 *     propia moneda**, para que el documento nunca imprima $0 habiendo un monto cargado (por
 *     ejemplo, si la orden quedó marcada en USD pero el importe se cargó en ARS).
 *  3. Si ambos son 0, devuelve 0 en la moneda de la orden (la orden realmente no tiene importe).
 *
 * Devuelve el par {amount, currency} ya listo para pasarle a `formatCurrency`, de modo que el
 * número y el símbolo SIEMPRE correspondan a la misma moneda.
 */
export function resolveAmount(usd: number, ars: number, orderCurrency: Currency): { amount: number; currency: Currency } {
  const usdNum = Number(usd) || 0;
  const arsNum = Number(ars) || 0;
  const isArs = orderCurrency === "ARS";

  const primary = isArs ? arsNum : usdNum;
  if (primary > 0) return { amount: primary, currency: orderCurrency };

  const fallback = isArs ? usdNum : arsNum;
  if (fallback > 0) return { amount: fallback, currency: isArs ? "USD" : "ARS" };

  return { amount: 0, currency: orderCurrency };
}
