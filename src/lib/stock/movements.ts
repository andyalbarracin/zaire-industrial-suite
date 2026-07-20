// movements.ts — src/lib/stock/movements.ts — 2026-07-18
// Helpers PUROS de inventario (WAC, disponibilidad, valuación) para preview en la UI y tests.
// El cálculo autoritativo vive en el RPC apply_stock_movement (SQL); esto lo espeja para mostrar
// el resultado en vivo en los formularios, sin ir a la base.

/** Costo promedio ponderado tras una entrada: (on_hand*avg + qtyIn*cost) / (on_hand + qtyIn). */
export function computeWac(onHand: number, avgCost: number, qtyIn: number, unitCost: number): number {
  const newOnHand = onHand + qtyIn;
  if (newOnHand <= 0) return avgCost;
  if (qtyIn <= 0) return avgCost; // salidas no cambian el WAC
  return (onHand * avgCost + qtyIn * unitCost) / newOnHand;
}

/** Disponible = on_hand - reservado (nunca negativo para mostrar). */
export function availableQty(onHand: number, reserved: number): number {
  return onHand - reserved;
}

/** Valor de inventario de una línea = on_hand * costo promedio. */
export function inventoryValue(onHand: number, avgCost: number): number {
  return onHand * avgCost;
}

/** ¿Alcanza el disponible para despachar/reservar `qty`? */
export function hasAvailable(onHand: number, reserved: number, qty: number): boolean {
  return availableQty(onHand, reserved) >= qty;
}
