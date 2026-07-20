// constants.ts — src/lib/stock/constants.ts — 2026-07-18
// Labels, badges (dark-aware) y helpers de Zaire Stock. Espeja el patrón de trace/crm/field.

import type { MovementType, WarehouseType, SerialStatus, ReservationStatus } from "@/lib/stock/types";

// ---------- Movimientos ----------
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
  consumo: "Consumo",
};

export const MOVEMENT_TYPE_BADGE: Record<MovementType, string> = {
  entrada:       "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  salida:        "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  ajuste:        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  transferencia: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  consumo:       "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
};

// ---------- Depósitos ----------
export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  deposito: "Depósito",
  vehiculo: "Unidad móvil",
};

// ---------- Series / lotes ----------
export const SERIAL_STATUS_LABELS: Record<SerialStatus, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  despachado: "Despachado",
  consumido: "Consumido",
};

export const SERIAL_STATUS_BADGE: Record<SerialStatus, string> = {
  disponible: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  reservado:  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  despachado: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  consumido:  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
};

// ---------- Reservas ----------
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  activa: "Activa",
  consumida: "Consumida",
  liberada: "Liberada",
};

export const RESERVATION_STATUS_BADGE: Record<ReservationStatus, string> = {
  activa:    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  consumida: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  liberada:  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
};

/** Semáforo de existencia vs punto de reorden (para StatusDot). rojo=agotado, amarillo=bajo mínimo, verde=ok. */
export function stockLight(onHand: number, minQty: number): "green" | "yellow" | "red" {
  if (onHand <= 0) return "red";
  if (minQty > 0 && onHand <= minQty) return "yellow";
  return "green";
}
