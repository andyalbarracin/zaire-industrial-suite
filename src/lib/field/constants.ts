// constants.ts — src/lib/field/constants.ts — 2026-07-13
// Constantes de Zaire Field: estados de visita, propósitos, gastos, documentos, vehículos.
// Mismo formato que src/lib/constants.ts (arrays {value,label,color} + Record de labels/colores).

import type {
  VisitStatus,
  VisitPurpose,
  BillingStatus,
  ExpenseCategory,
  ExpenseStatus,
  DocType,
  VehicleType,
  VisitEventType,
} from "@/lib/field/types";

export const VISIT_STATUSES = [
  { value: "planificada", label: "Planificada", color: "slate" },
  { value: "en_curso", label: "En Curso", color: "blue" },
  { value: "en_sitio", label: "En Sitio", color: "violet" },
  { value: "finalizada", label: "Finalizada", color: "green" },
  { value: "cancelada", label: "Cancelada", color: "red" },
] as const;

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  planificada: "Planificada",
  en_curso: "En Curso",
  en_sitio: "En Sitio",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  planificada: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  en_curso: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  en_sitio: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
  finalizada: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  cancelada: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
};

export const VISIT_STATUS_TRANSITIONS: Record<string, string[]> = {
  planificada: ["en_curso", "cancelada"],
  en_curso: ["en_sitio", "finalizada", "cancelada"],
  en_sitio: ["finalizada", "cancelada"],
  finalizada: [],
  cancelada: [],
};

// Alias tipado (mismo patrón que ORDER_STATUS_NEXT)
export const VISIT_STATUS_NEXT = VISIT_STATUS_TRANSITIONS as Record<VisitStatus, VisitStatus[]>;

export const VISIT_PURPOSES = [
  { value: "relevamiento", label: "Relevamiento" },
  { value: "reparacion", label: "Reparación" },
  { value: "entrega", label: "Entrega" },
  { value: "visita_comercial", label: "Visita Comercial" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otro", label: "Otro" },
] as const;

export const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  relevamiento: "Relevamiento",
  reparacion: "Reparación",
  entrega: "Entrega",
  visita_comercial: "Visita Comercial",
  mantenimiento: "Mantenimiento",
  otro: "Otro",
};

export const BILLING_STATUSES = [
  { value: "no_facturable", label: "No Facturable", color: "slate" },
  { value: "pendiente", label: "Pendiente", color: "amber" },
  { value: "facturado", label: "Facturado", color: "blue" },
  { value: "cobrado", label: "Cobrado", color: "green" },
] as const;

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  no_facturable: "No Facturable",
  pendiente: "Pendiente",
  facturado: "Facturado",
  cobrado: "Cobrado",
};

export const BILLING_STATUS_COLORS: Record<BillingStatus, string> = {
  no_facturable: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/25",
  pendiente: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  facturado: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  cobrado: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
};

export const EXPENSE_CATEGORIES = [
  { value: "combustible", label: "Combustible" },
  { value: "peaje", label: "Peaje" },
  { value: "comida", label: "Comida" },
  { value: "hotel", label: "Hotel" },
  { value: "estacionamiento", label: "Estacionamiento" },
  { value: "insumos", label: "Insumos" },
  { value: "otro", label: "Otro" },
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  combustible: "Combustible",
  peaje: "Peaje",
  comida: "Comida",
  hotel: "Hotel",
  estacionamiento: "Estacionamiento",
  insumos: "Insumos",
  otro: "Otro",
};

export const EXPENSE_STATUSES = [
  { value: "pendiente", label: "Pendiente", color: "amber" },
  { value: "aprobado", label: "Aprobado", color: "green" },
  { value: "reintegrado", label: "Reintegrado", color: "blue" },
  { value: "rechazado", label: "Rechazado", color: "red" },
] as const;

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  reintegrado: "Reintegrado",
  rechazado: "Rechazado",
};

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  pendiente: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  aprobado: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  reintegrado: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  rechazado: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
};

export const VEHICLE_TYPES = [
  { value: "camioneta", label: "Camioneta" },
  { value: "auto", label: "Auto" },
  { value: "utilitario", label: "Utilitario" },
  { value: "moto", label: "Moto" },
  { value: "camion", label: "Camión" },
  { value: "otro", label: "Otro" },
] as const;

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  camioneta: "Camioneta",
  auto: "Auto",
  utilitario: "Utilitario",
  moto: "Moto",
  camion: "Camión",
  otro: "Otro",
};

// Lista manejada desde acá (el CHECK de doc_type se flexibilizó en la BD).
// `group`: "vehicle" | "technician" | "ambos" — para agrupar en la UI.
export const DOC_TYPES = [
  // Vehículo / unidad
  { value: "licencia_conducir", label: "Licencia de Conducir", group: "technician" },
  { value: "vtv", label: "VTV", group: "vehicle" },
  { value: "rto", label: "RTO", group: "vehicle" },
  { value: "seguro", label: "Seguro", group: "vehicle" },
  { value: "cedula", label: "Cédula del vehículo", group: "vehicle" },
  { value: "titulo", label: "Título de propiedad", group: "vehicle" },
  { value: "adr", label: "ADR (transporte peligrosos)", group: "vehicle" },
  { value: "senasa", label: "SENASA / habilitación", group: "vehicle" },
  // Técnico / persona
  { value: "art", label: "ART", group: "technician" },
  { value: "carnet_profesional", label: "Carnet Profesional", group: "technician" },
  { value: "apto_medico", label: "Apto Médico", group: "technician" },
  { value: "certificado_seguridad", label: "Certificado de Seguridad", group: "technician" },
  { value: "trabajo_altura", label: "Trabajo en Altura", group: "technician" },
  { value: "espacios_confinados", label: "Espacios Confinados", group: "technician" },
  { value: "manejo_defensivo", label: "Manejo Defensivo", group: "technician" },
  { value: "curso", label: "Curso / Capacitación", group: "technician" },
  { value: "contrato", label: "Contrato", group: "technician" },
  { value: "otro", label: "Otro", group: "ambos" },
] as const;

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  licencia_conducir: "Licencia de Conducir",
  vtv: "VTV",
  rto: "RTO",
  seguro: "Seguro",
  cedula: "Cédula del vehículo",
  titulo: "Título de propiedad",
  adr: "ADR (transporte peligrosos)",
  senasa: "SENASA / habilitación",
  art: "ART",
  carnet_profesional: "Carnet Profesional",
  apto_medico: "Apto Médico",
  certificado_seguridad: "Certificado de Seguridad",
  trabajo_altura: "Trabajo en Altura",
  espacios_confinados: "Espacios Confinados",
  manejo_defensivo: "Manejo Defensivo",
  curso: "Curso / Capacitación",
  contrato: "Contrato",
  otro: "Otro",
};

export const DOC_ENTITY_LABELS = {
  technician: "Técnico",
  vehicle: "Vehículo",
} as const;

// Umbrales de alerta de vencimiento de documentos (mismo patrón que Zaire Trace)
export const DOC_ALERT_THRESHOLDS = { danger: 7, warning: 30 } as const;

// ---------- Unidades: archivos y mantenimiento ----------
export const VEHICLE_FILE_CATEGORIES = [
  { value: "foto", label: "Foto" },
  { value: "presupuesto", label: "Presupuesto" },
  { value: "taller", label: "Remito de taller" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "seguro", label: "Seguro" },
  { value: "cedula", label: "Cédula" },
  { value: "otro", label: "Otro" },
] as const;

export const VEHICLE_FILE_CATEGORY_LABELS: Record<string, string> = {
  foto: "Foto",
  presupuesto: "Presupuesto",
  taller: "Remito de taller",
  mantenimiento: "Mantenimiento",
  seguro: "Seguro",
  cedula: "Cédula",
  otro: "Otro",
};

export const MAINTENANCE_TYPES = [
  { value: "service", label: "Service" },
  { value: "reparacion", label: "Reparación" },
  { value: "cambio_aceite", label: "Cambio de aceite" },
  { value: "cambio_filtros", label: "Cambio de filtros" },
  { value: "taller", label: "Visita a taller" },
  { value: "vtv", label: "VTV" },
  { value: "neumaticos", label: "Neumáticos" },
  { value: "otro", label: "Otro" },
] as const;

export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  service: "Service",
  reparacion: "Reparación",
  cambio_aceite: "Cambio de aceite",
  cambio_filtros: "Cambio de filtros",
  taller: "Visita a taller",
  vtv: "VTV",
  neumaticos: "Neumáticos",
  otro: "Otro",
};

// ---------- Técnico: contactos y archivos ----------
export const CONTACT_KINDS = [
  { value: "telefono", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "direccion", label: "Dirección" },
  { value: "emergencia", label: "Contacto de emergencia" },
  { value: "otro", label: "Otro" },
] as const;

export const CONTACT_KIND_LABELS: Record<string, string> = {
  telefono: "Teléfono",
  email: "Email",
  direccion: "Dirección",
  emergencia: "Contacto de emergencia",
  otro: "Otro",
};

export const TECHNICIAN_FILE_CATEGORIES = [
  { value: "foto", label: "Foto" },
  { value: "apto_medico", label: "Apto médico" },
  { value: "certificado_seguridad", label: "Certificado de seguridad" },
  { value: "curso", label: "Curso / Capacitación" },
  { value: "contrato", label: "Contrato" },
  { value: "otro", label: "Otro" },
] as const;

export const TECHNICIAN_FILE_CATEGORY_LABELS: Record<string, string> = {
  foto: "Foto",
  apto_medico: "Apto médico",
  certificado_seguridad: "Certificado de seguridad",
  curso: "Curso / Capacitación",
  contrato: "Contrato",
  otro: "Otro",
};
