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

/** Totales de un conjunto de órdenes, con cada moneda por separado. Nunca se suman entre sí. */
export interface DualTotal {
  usd: number;
  ars: number;
}

/**
 * Suma importes de MUCHAS órdenes manteniendo las dos monedas separadas.
 *
 * Es el caso opuesto a `resolveAmount()`, que elige UN importe para UNA orden. Acá no se puede
 * elegir: un conjunto de órdenes puede tener unas en pesos y otras en dólares, y **sumarlas en un
 * solo número sería un error contable** (mezclaría monedas sin tipo de cambio). Por eso esta
 * función devuelve siempre el par, y quien la use está obligado a mostrar los dos totales.
 *
 * Importante — de dónde sacar los montos: el monto confiable está en los **ítems**
 * (`total_price` / `total_price_ars`), no en las columnas de la cabecera de la orden. Las órdenes
 * generadas desde una cotización del CRM cargan bien la moneda en los ítems pero dejan
 * `total_ars` de la cabecera en 0 (ver components/crm/quote-generate-ot.tsx), así que sumar por
 * cabecera subdeclara los pesos. Los reportes financieros de Trace ya suman por ítems; esta
 * función mantiene ese mismo criterio.
 */
export function sumDualTotals<T>(rows: T[], usdOf: (row: T) => number, arsOf: (row: T) => number): DualTotal {
  return rows.reduce<DualTotal>(
    (acc, row) => ({
      usd: acc.usd + (Number(usdOf(row)) || 0),
      ars: acc.ars + (Number(arsOf(row)) || 0),
    }),
    { usd: 0, ars: 0 },
  );
}
