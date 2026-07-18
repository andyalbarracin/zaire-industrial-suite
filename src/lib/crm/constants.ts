// constants.ts — src/lib/crm/constants.ts — 2026-07-16
// Constantes del módulo CRM: fuentes, estados de lead, etapas de pipeline, tipos de actividad.

import type { LeadSource, LeadStatus, ActivityType, QuoteStatus } from "@/lib/crm/types";

// Límites de carga preventivos (LimitNotice avisa si se alcanzan).
export const LEADS_LIMIT = 1000;
export const OPPORTUNITIES_LIMIT = 1000;
export const CONTACTS_LIMIT = 2000;
export const ACTIVITIES_LIMIT = 2000;

// ---------- Fuente del lead ----------
export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "referido", label: "Referido" },
  { value: "visita_comercial", label: "Visita comercial" },
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" },
];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = Object.fromEntries(
  LEAD_SOURCES.map((s) => [s.value, s.label])
) as Record<LeadSource, string>;

// ---------- Estado del lead ----------
export const LEAD_STATUSES = [
  { value: "nuevo", label: "Nuevo", color: "slate" },
  { value: "contactado", label: "Contactado", color: "blue" },
  { value: "calificado", label: "Calificado", color: "violet" },
  { value: "convertido", label: "Convertido", color: "green" },
  { value: "descartado", label: "Descartado", color: "red" },
] as const;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  convertido: "Convertido",
  descartado: "Descartado",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  contactado: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  calificado: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
  convertido: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  descartado: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
};

// Transiciones válidas del lead (calificado puede convertir; convertido/descartado son finales).
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  nuevo: ["contactado", "descartado"],
  contactado: ["calificado", "descartado"],
  calificado: ["convertido", "descartado"],
  convertido: [],
  descartado: [],
};

// ---------- Etapas del pipeline (dinámicas: viven en crm_pipeline_stages) ----------
// Paleta de colores disponible para las etapas. Clases literales para que Tailwind
// las incluya en el build (no se pueden componer dinámicamente).
export const STAGE_PALETTE = [
  "slate", "blue", "violet", "amber", "cyan", "green",
  "lime", "indigo", "red", "orange", "teal", "pink",
] as const;

export type StageColor = (typeof STAGE_PALETTE)[number];

// Punto de color (columna del Kanban / dashboard).
export const STAGE_DOT: Record<string, string> = {
  slate: "bg-slate-400", blue: "bg-blue-500", violet: "bg-violet-500", amber: "bg-amber-500",
  cyan: "bg-cyan-500", green: "bg-green-500", lime: "bg-lime-500", indigo: "bg-indigo-500",
  red: "bg-red-500", orange: "bg-orange-500", teal: "bg-teal-500", pink: "bg-pink-500",
};

// Badge (pill de etapa en la lista/tabla).
export const STAGE_BADGE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25", blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  violet: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25", amber: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/25", green: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  lime: "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/25", indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/25",
  red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25", orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25",
  teal: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/25", pink: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/25",
};

export const stageDot = (color: string) => STAGE_DOT[color] ?? STAGE_DOT.slate;
export const stageBadge = (color: string) => STAGE_BADGE[color] ?? STAGE_BADGE.slate;

// ---------- Tipo de actividad ----------
export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "reunion", label: "Reunión" },
  { value: "nota", label: "Nota" },
  { value: "tarea", label: "Tarea" },
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((a) => [a.value, a.label])
) as Record<ActivityType, string>;

// ---------- Cotizaciones (Fase B) ----------
export const QUOTES_LIMIT = 1000;

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "vencida", label: "Vencida" },
];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  borrador: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  enviada: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  aceptada: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  rechazada: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  vencida: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
};
