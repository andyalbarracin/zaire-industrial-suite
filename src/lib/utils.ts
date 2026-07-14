// utils.ts — src/lib/utils.ts — 2026-05-27
// Helpers generales: formato de moneda, fechas, cn, semáforo

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Currency } from "@/lib/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Convierte un string de fecha (YYYY-MM-DD o timestamp) en un Date a medianoche LOCAL.
// Evita el corrimiento de un día por zona horaria (UTC) en fechas de calendario.
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date(date);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(parseLocalDate(date), "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatRelativeTime(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function isOverdue(date_due: string | null): boolean {
  if (!date_due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseLocalDate(date_due) < today;
}

export function getDueDaysLabel(date_due: string | null): string {
  if (!date_due) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(date_due);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)} días`;
  if (diffDays === 0) return "Vence hoy";
  if (diffDays === 1) return "Vence mañana";
  return `Vence en ${diffDays} días`;
}

export type TrafficLight = "green" | "yellow" | "red";

/**
 * Calcula el color del semáforo para un campo booleano en una lista de ítems.
 * Verde = todos completados, Amarillo = algunos, Rojo = ninguno.
 */
export function calculateTrafficLight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[],
  field: string
): TrafficLight {
  if (!items || items.length === 0) return "red";
  const completed = items.filter((item) => item[field] === true).length;
  if (completed === items.length) return "green";
  if (completed > 0) return "yellow";
  return "red";
}
