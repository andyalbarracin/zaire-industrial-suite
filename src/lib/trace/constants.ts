// constants.ts — src/lib/trace/constants.ts — 2026-07-16
// Constantes del módulo Trace: estados de orden y de ítems, y workflow de transiciones

import type { OrderStatus } from "@/lib/types/database";

// Límite de carga preventivo de la tabla de órdenes (LimitNotice avisa si se alcanza).
export const ORDERS_LIMIT = 500;

export const ORDER_STATUSES = [
  { value: "ingresada", label: "Ingresada", color: "slate" },
  { value: "en_revision", label: "En Revisión", color: "blue" },
  { value: "cotizada", label: "Cotizada", color: "violet" },
  { value: "aprobada", label: "Aprobada", color: "cyan" },
  { value: "en_reparacion", label: "En Reparación", color: "amber" },
  { value: "lista_para_entregar", label: "Lista para Entregar", color: "lime" },
  { value: "remitido", label: "Remitido", color: "green" },
  { value: "facturada", label: "Facturada", color: "indigo" },
  { value: "cancelada", label: "Cancelada", color: "red" },
] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ingresada: "Ingresada",
  en_revision: "En Revisión",
  cotizada: "Cotizada",
  aprobada: "Aprobada",
  en_reparacion: "En Reparación",
  lista_para_entregar: "Lista para Entregar",
  remitido: "Remitido",
  facturada: "Facturada",
  cancelada: "Cancelada",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  ingresada: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  en_revision: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  cotizada: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
  aprobada: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/25",
  en_reparacion: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  lista_para_entregar: "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/25",
  remitido: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  facturada: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/25",
  cancelada: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
};

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  ingresada: ["en_revision", "cancelada"],
  en_revision: ["cotizada", "en_reparacion", "cancelada"],
  cotizada: ["aprobada", "cancelada"],
  aprobada: ["en_reparacion", "cancelada"],
  en_reparacion: ["lista_para_entregar", "cancelada"],
  lista_para_entregar: ["remitido"],
  remitido: ["facturada"],
  facturada: [],
  cancelada: [],
};

// Alias para compatibilidad con código existente que usa ORDER_STATUS_NEXT
export const ORDER_STATUS_NEXT = STATUS_TRANSITIONS as Record<OrderStatus, OrderStatus[]>;

export const ITEM_STATUS_LABELS = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  completado: "Completado",
  entregado: "Entregado",
} as const;
