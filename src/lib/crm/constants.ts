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
  nuevo: "bg-slate-100 text-slate-700 border-slate-200",
  contactado: "bg-blue-100 text-blue-700 border-blue-200",
  calificado: "bg-violet-100 text-violet-700 border-violet-200",
  convertido: "bg-green-100 text-green-700 border-green-200",
  descartado: "bg-red-100 text-red-700 border-red-200",
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
  slate: "bg-slate-100 text-slate-700 border-slate-200", blue: "bg-blue-100 text-blue-700 border-blue-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200", amber: "bg-amber-100 text-amber-700 border-amber-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200", green: "bg-green-100 text-green-700 border-green-200",
  lime: "bg-lime-100 text-lime-700 border-lime-200", indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  red: "bg-red-100 text-red-700 border-red-200", orange: "bg-orange-100 text-orange-700 border-orange-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200", pink: "bg-pink-100 text-pink-700 border-pink-200",
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
  borrador: "bg-slate-100 text-slate-700 border-slate-200",
  enviada: "bg-blue-100 text-blue-700 border-blue-200",
  aceptada: "bg-green-100 text-green-700 border-green-200",
  rechazada: "bg-red-100 text-red-700 border-red-200",
  vencida: "bg-amber-100 text-amber-700 border-amber-200",
};
