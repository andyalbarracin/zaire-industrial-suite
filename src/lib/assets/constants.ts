// constants.ts — src/lib/assets/constants.ts — 2026-07-20
// Labels y badges (dark-aware) de Zaire Activos. Espeja el patrón de stock/crm.

import type { AssetType, AssetStatus, EventType } from "@/lib/assets/types";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  bomba: "Bomba", sello: "Sello", compresor: "Compresor", motor: "Motor", valvula: "Válvula", otro: "Otro",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  operativo: "Operativo", en_reparacion: "En reparación", standby: "Standby", baja: "Baja",
};

export const ASSET_STATUS_BADGE: Record<AssetStatus, string> = {
  operativo:     "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  en_reparacion: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  standby:       "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  baja:          "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  servicio: "Servicio", inspeccion: "Inspección", falla: "Falla", traslado: "Traslado",
  lectura: "Lectura", alta: "Alta", baja: "Baja", garantia: "Garantía", nota: "Nota",
};

export const EVENT_TYPE_BADGE: Record<EventType, string> = {
  servicio:   "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  inspeccion: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/25",
  falla:      "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  traslado:   "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
  lectura:    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  alta:       "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  baja:       "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  garantia:   "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  nota:       "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
};

/** Etiqueta de criticidad 1-5. */
export const CRITICIDAD_LABELS: Record<number, string> = {
  1: "Muy baja", 2: "Baja", 3: "Media", 4: "Alta", 5: "Crítica",
};
