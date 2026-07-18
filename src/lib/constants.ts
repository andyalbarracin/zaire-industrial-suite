// constants.ts — src/lib/constants.ts — 2026-05-27
// Constantes compartidas de la suite: categorías, monedas, roles, sucursales, marcas

import type { ProductCategory } from "@/lib/types/database";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  sello_mecanico: "Sello Mecánico",
  bomba: "Bomba",
  empaquetadura: "Empaquetadura",
  spare_part: "Spare Part",
  otro: "Otro",
};

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  sello_mecanico: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  bomba: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  empaquetadura: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  spare_part: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
  otro: "bg-slate-100 text-slate-600",
};

export const CURRENCY_LABELS = { USD: "USD ($)", ARS: "ARS ($)" } as const;

export const USER_ROLE_LABELS = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Visualizador",
} as const;

export const AUDIT_ACTION_LABELS = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  status_change: "Cambio de Estado",
} as const;

export const MARCAS = [
  "AESSEAL",
  "JOHN CRANE",
  "BURGMANN",
  "FLOWSERVE",
  "LATTY",
  "CHESTERTON",
  "SEALMATIC",
  "RUHR PUMPEN",
  "OTRO",
] as const;

export const UNIDADES_MEDIDA = ["MM", "PULG"] as const;

export const BRANCHES = [
  { id: "bb", name: "Bahía Blanca", code: "BB" },
  { id: "nqn", name: "Neuquén", code: "NQN" },
  { id: "noa", name: "NOA", code: "NOA" },
  { id: "bue", name: "Buenos Aires", code: "BUE" },
] as const;

export const EMPRESA_INFO = {
  nombre: "Empresa Demo S.A.",
  cuit: "30-00000000-0",
  direccion: "Dirección 1234",
  ciudad: "Buenos Aires, Argentina",
  telefono: "+54 11 0000-0000",
  email: "demo@empresa.com",
  web: "www.empresa.com",
} as const;
