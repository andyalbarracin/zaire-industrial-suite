// types.ts — src/lib/field/types.ts — 2026-07-13
// Tipos TypeScript de las tablas field_ (Zaire Field). Espejo del SQL en
// .docs/sql/zaire_field_schema.sql. Reutiliza tipos compartidos de database.ts.

import type { Client, Branch, WorkOrder, WorkOrderItem, Profile } from "@/lib/types/database";

// Reexport de tipos compartidos (no se redefinen)
export type { Client, Branch, WorkOrder, WorkOrderItem, Profile };

// ---------- Uniones (espejo de los CHECK del SQL) ----------
export type VisitStatus =
  | "planificada"
  | "en_curso"
  | "en_sitio"
  | "finalizada"
  | "cancelada";

export type VisitPurpose =
  | "relevamiento"
  | "reparacion"
  | "entrega"
  | "visita_comercial"
  | "mantenimiento"
  | "otro";

export type BillingStatus = "no_facturable" | "pendiente" | "facturado" | "cobrado";

export type VisitEventType =
  | "salida"
  | "geocerca_entrada"
  | "geocerca_salida"
  | "checkin"
  | "checkout"
  | "nota"
  | "foto"
  | "cambio_estado"
  | "gasto";

export type VehicleType = "camioneta" | "auto" | "utilitario" | "moto" | "camion" | "otro";

export type ExpenseCategory =
  | "combustible"
  | "peaje"
  | "comida"
  | "hotel"
  | "estacionamiento"
  | "insumos"
  | "otro";

export type ExpenseStatus = "pendiente" | "aprobado" | "reintegrado" | "rechazado";

export type DocEntityType = "technician" | "vehicle";

export type DocType =
  // Vehículo / unidad
  | "licencia_conducir"
  | "vtv"
  | "rto"
  | "seguro"
  | "cedula"
  | "titulo"
  | "adr"
  | "senasa"
  // Técnico / persona
  | "art"
  | "carnet_profesional"
  | "apto_medico"
  | "certificado_seguridad"
  | "trabajo_altura"
  | "espacios_confinados"
  | "manejo_defensivo"
  | "curso"
  | "contrato"
  | "otro";

export type ExpenseEventType =
  | "creado"
  | "editado"
  | "aprobado"
  | "rechazado"
  | "reintegrado"
  | "revertido"
  | "comentario"
  | "adjunto";

export type DevicePlatform = "ios" | "android";

export type UnidadMedida = "MM" | "PULG";

// ---------- Tablas ----------
export interface FieldTechnician {
  id: string;
  user_id: string | null;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  branch_id: string | null;
  license_number: string | null;
  is_active: boolean;
  notes: string | null;
  photo_path: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactKind = "telefono" | "email" | "direccion" | "emergencia" | "otro";

export interface FieldTechnicianContact {
  id: string;
  technician_id: string;
  kind: ContactKind | null;
  label: string | null;
  value: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TechnicianFileCategory =
  | "foto"
  | "apto_medico"
  | "certificado_seguridad"
  | "curso"
  | "contrato"
  | "otro";

export interface FieldTechnicianFile {
  id: string;
  technician_id: string;
  category: TechnicianFileCategory | null;
  title: string | null;
  storage_path: string;
  file_type: string | null;
  expires_at: string | null;
  notes: string | null;
  uploaded_by: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface FieldVehicle {
  id: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  type: VehicleType | null;
  branch_id: string | null;
  assigned_technician_id: string | null;
  is_active: boolean;
  notes: string | null;
  cover_photo_path: string | null;
  current_odometer: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  technician?: FieldTechnician;
}

export type VehicleFileCategory =
  | "foto"
  | "presupuesto"
  | "taller"
  | "mantenimiento"
  | "seguro"
  | "cedula"
  | "otro";

export interface FieldVehicleFile {
  id: string;
  vehicle_id: string;
  category: VehicleFileCategory | null;
  title: string | null;
  storage_path: string;
  file_type: string | null;
  is_cover: boolean;
  notes: string | null;
  uploaded_by: string | null;
  deleted_at: string | null;
  created_at: string;
}

export type MaintenanceType =
  | "service"
  | "reparacion"
  | "cambio_aceite"
  | "cambio_filtros"
  | "taller"
  | "vtv"
  | "neumaticos"
  | "otro";

export interface FieldVehicleMaintenance {
  id: string;
  vehicle_id: string;
  type: MaintenanceType | null;
  performed_at: string | null;
  odometer: number | null;
  cost: number | null;
  currency: "ARS" | "USD";
  workshop: string | null;
  description: string | null;
  next_service_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldVehicleFuelLog {
  id: string;
  vehicle_id: string;
  filled_at: string;
  liters: number | null;
  amount: number | null;
  currency: "ARS" | "USD";
  odometer: number | null;
  station: string | null;
  technician_id: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface FieldSite {
  id: string;
  client_id: string | null;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  contact_name: string | null;
  contact_phone: string | null;
  is_active: boolean;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  client?: Client;
}

export interface FieldVisit {
  id: string;
  visit_number: string | null;
  branch_id: string;
  technician_id: string | null;
  vehicle_id: string | null;
  client_id: string | null;
  site_id: string | null;
  work_order_id: string | null;
  purpose: VisitPurpose | null;
  status: VisitStatus;
  scheduled_at: string | null;
  started_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  ended_at: string | null;
  planned_notes: string | null;
  is_billable: boolean;
  billing_status: BillingStatus;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  technician?: FieldTechnician;
  vehicle?: FieldVehicle;
  client?: Client;
  site?: FieldSite;
  work_order?: WorkOrder;
  report?: FieldVisitReport;
  events?: FieldVisitEvent[];
  expenses?: FieldExpense[];
}

export interface FieldVisitEvent {
  id: string;
  visit_id: string;
  event_type: VisitEventType;
  occurred_at: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface FieldLocationPing {
  id: number;
  visit_id: string | null;
  technician_id: string | null;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  speed_kmh: number | null;
  heading: number | null;
  recorded_at: string;
}

export interface FieldVisitReport {
  id: string;
  visit_id: string;
  equipment_tag: string | null;
  serial_number: string | null;
  medida: string | null;
  unidad_medida: UnidadMedida | null;
  marca: string | null;
  modelo: string | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  findings: string | null;
  recommendations: string | null;
  requires_repair: boolean;
  created_work_order_item_id: string | null;
  // Solicitud de OT/OTS (la crea el admin en Zaire Tracking; Field solo solicita)
  ot_requested: boolean;
  ot_request_status: "no_solicitada" | "solicitada" | "vinculada" | "rechazada";
  ot_request_notes: string | null;
  ot_requested_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  photos?: FieldVisitPhoto[];
}

export interface FieldExpenseEvent {
  id: string;
  expense_id: string;
  event_type: ExpenseEventType;
  old_status: string | null;
  new_status: string | null;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  // Joins
  profile?: Profile;
}

export interface FieldVisitPhoto {
  id: string;
  visit_id: string;
  report_id: string | null;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface FieldExpense {
  id: string;
  visit_id: string | null;
  technician_id: string | null;
  category: ExpenseCategory | null;
  amount: number;
  currency: "ARS" | "USD";
  description: string | null;
  incurred_at: string;
  receipt_path: string | null;
  status: ExpenseStatus;
  is_billable: boolean;
  approved_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  technician?: FieldTechnician;
  visit?: FieldVisit;
}

export interface FieldDocument {
  id: string;
  entity_type: DocEntityType | null;
  technician_id: string | null;
  vehicle_id: string | null;
  doc_type: DocType | null;
  doc_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_path: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  technician?: FieldTechnician;
  vehicle?: FieldVehicle;
}

export interface FieldDeviceToken {
  id: string;
  technician_id: string | null;
  token: string | null;
  platform: DevicePlatform | null;
  is_active: boolean;
  created_at: string;
}
