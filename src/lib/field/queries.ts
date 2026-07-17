// queries.ts — src/lib/field/queries.ts — 2026-07-13
// Helpers de lectura tipados para Zaire Field (Server Components).
// Las tablas field_ no están en el tipo Database generado, así que se accede con
// el cliente casteado (deuda técnica conocida del proyecto) y se castea el resultado.

import { createClient } from "@/lib/supabase/server";
import type {
  FieldVisit,
  FieldTechnician,
  FieldVehicle,
  FieldSite,
  FieldExpense,
  FieldDocument,
  Client,
  WorkOrder,
} from "@/lib/field/types";
import type { TrafficLight } from "@/lib/utils";

// Límites de carga preventivos (evitan traer todo). El componente LimitNotice avisa si se alcanzan.
export const VISITS_LIMIT = 1000;
export const EXPENSES_LIMIT = 2000;
export const DOCS_LIMIT = 2000;

const VISIT_SELECT = `
  id, visit_number, branch_id, technician_id, vehicle_id, client_id, site_id, work_order_id,
  purpose, status, scheduled_at, started_at, arrived_at, departed_at, ended_at,
  planned_notes, is_billable, billing_status, created_by, created_at, updated_at,
  technician:field_technicians(id, full_name),
  vehicle:field_vehicles(id, plate, brand, model),
  client:clients(id, business_name),
  site:field_sites(id, name, city, province, latitude, longitude, geofence_radius_m),
  work_order:work_orders(id, order_number)
`;

// ---------- Visitas ----------
export async function getVisits(): Promise<FieldVisit[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_visits")
    .select(VISIT_SELECT)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false })
    .limit(VISITS_LIMIT);
  return (data ?? []) as FieldVisit[];
}

export async function getVisit(id: string): Promise<FieldVisit | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_visits")
    .select(VISIT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as FieldVisit | null;
}

// ---------- Técnicos ----------
export async function getTechnicians(includeInactive = false): Promise<FieldTechnician[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let query = sb
    .from("field_technicians")
    .select(
      "id, user_id, full_name, document_id, phone, email, branch_id, license_number, is_active, notes, photo_path, created_at, updated_at, deleted_at"
    )
    .is("deleted_at", null)
    .order("full_name", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  return (data ?? []) as FieldTechnician[];
}

// ---------- Detalle de técnico + contactos, archivos, documentos, log ----------
export async function getTechnician(id: string): Promise<FieldTechnician | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_technicians")
    .select("id, user_id, full_name, document_id, phone, email, branch_id, license_number, is_active, notes, photo_path, created_at, updated_at, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as FieldTechnician | null;
}

export async function getTechnicianContacts(technicianId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_technician_contacts")
    .select("id, technician_id, kind, label, value, created_at, updated_at, deleted_at")
    .eq("technician_id", technicianId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as import("@/lib/field/types").FieldTechnicianContact[];
}

export async function getTechnicianFiles(technicianId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_technician_files")
    .select("id, technician_id, category, title, storage_path, file_type, expires_at, notes, uploaded_by, created_at, deleted_at")
    .eq("technician_id", technicianId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as import("@/lib/field/types").FieldTechnicianFile[];
}

export async function getTechnicianDocuments(technicianId: string): Promise<FieldDocumentWithExpiry[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_documents")
    .select("id, entity_type, technician_id, vehicle_id, doc_type, doc_number, issued_at, expires_at, file_path, notes, created_at, updated_at, deleted_at")
    .eq("technician_id", technicianId)
    .is("deleted_at", null)
    .order("expires_at", { ascending: true });
  return ((data ?? []) as FieldDocument[]).map((doc) => {
    const d = doc.expires_at ? Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    return { ...doc, days_until_expiry: d, expiry_light: expiryLight(d) };
  });
}

export async function getTechnicianLog(technicianId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("audit_logs")
    .select("id, action, description, user_name, created_at")
    .eq("entity_type", "field_technician")
    .eq("entity_id", technicianId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as { id: string; action: string; description: string | null; user_name: string | null; created_at: string }[];
}

// ---------- Vehículos ----------
export async function getVehicles(includeInactive = false): Promise<FieldVehicle[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let query = sb
    .from("field_vehicles")
    .select(
      "id, plate, brand, model, year, type, branch_id, assigned_technician_id, is_active, notes, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name)"
    )
    .is("deleted_at", null)
    .order("plate", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  return (data ?? []) as FieldVehicle[];
}

// ---------- Detalle de unidad + archivos, mantenimiento, combustible ----------
export async function getVehicle(id: string): Promise<FieldVehicle | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_vehicles")
    .select(
      "id, plate, brand, model, year, type, branch_id, assigned_technician_id, is_active, notes, cover_photo_path, current_odometer, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name)"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as FieldVehicle | null;
}

export async function getVehicleFiles(vehicleId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_vehicle_files")
    .select("id, vehicle_id, category, title, storage_path, file_type, is_cover, notes, uploaded_by, created_at, deleted_at")
    .eq("vehicle_id", vehicleId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as import("@/lib/field/types").FieldVehicleFile[];
}

export async function getVehicleMaintenance(vehicleId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_vehicle_maintenance")
    .select("id, vehicle_id, type, performed_at, odometer, cost, currency, workshop, description, next_service_at, technician_id, receipt_path, created_by, created_at, updated_at, deleted_at")
    .eq("vehicle_id", vehicleId)
    .is("deleted_at", null)
    .order("performed_at", { ascending: false });
  return (data ?? []) as import("@/lib/field/types").FieldVehicleMaintenance[];
}

export async function getVehicleFuelLogs(vehicleId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_vehicle_fuel_logs")
    .select("id, vehicle_id, filled_at, liters, amount, currency, odometer, station, technician_id, receipt_path, created_by, created_at, deleted_at")
    .eq("vehicle_id", vehicleId)
    .is("deleted_at", null)
    .order("filled_at", { ascending: false });
  return (data ?? []) as import("@/lib/field/types").FieldVehicleFuelLog[];
}

// ---------- Sitios ----------
export async function getSites(includeInactive = false): Promise<FieldSite[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let query = sb
    .from("field_sites")
    .select(
      "id, client_id, name, address, city, province, latitude, longitude, geofence_radius_m, contact_name, contact_phone, is_active, notes, created_at, updated_at, deleted_at, client:clients(id, business_name)"
    )
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  return (data ?? []) as FieldSite[];
}

export async function getSite(id: string): Promise<FieldSite | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_sites")
    .select("id, client_id, name, address, city, province, latitude, longitude, geofence_radius_m, contact_name, contact_phone, is_active, notes, created_at, updated_at, deleted_at, client:clients(id, business_name)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as FieldSite | null;
}

// ---------- Gastos ----------
export async function getExpenses(): Promise<FieldExpense[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_expenses")
    .select(
      "id, visit_id, technician_id, category, amount, currency, description, incurred_at, receipt_path, status, is_billable, approved_by, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name, branch_id), visit:field_visits(id, visit_number, branch_id)"
    )
    .is("deleted_at", null)
    .order("incurred_at", { ascending: false })
    .limit(EXPENSES_LIMIT);
  return (data ?? []) as FieldExpense[];
}

// ---------- Documentos con cálculo de días a vencer ----------
export interface FieldDocumentWithExpiry extends FieldDocument {
  days_until_expiry: number | null;
  expiry_light: TrafficLight;
}

export function expiryLight(daysUntil: number | null): TrafficLight {
  if (daysUntil === null) return "green";
  if (daysUntil < 0) return "red";      // vencido
  if (daysUntil <= 7) return "orange";  // vence en <= 7 días
  if (daysUntil <= 30) return "yellow"; // vence en <= 30 días
  return "green";
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getFieldDocuments(): Promise<FieldDocumentWithExpiry[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_documents")
    .select(
      "id, entity_type, technician_id, vehicle_id, doc_type, doc_number, issued_at, expires_at, file_path, notes, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name), vehicle:field_vehicles(id, plate, brand, model)"
    )
    .is("deleted_at", null)
    .order("expires_at", { ascending: true })
    .limit(DOCS_LIMIT);
  return ((data ?? []) as FieldDocument[]).map((doc) => {
    const d = daysUntil(doc.expires_at);
    return { ...doc, days_until_expiry: d, expiry_light: expiryLight(d) };
  });
}

// ---------- Timeline y traza de una visita ----------
export async function getVisitEvents(visitId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_visit_events")
    .select("id, visit_id, event_type, occurred_at, latitude, longitude, description, metadata, created_by, created_at")
    .eq("visit_id", visitId)
    .order("occurred_at", { ascending: true });
  return (data ?? []) as import("@/lib/field/types").FieldVisitEvent[];
}

export async function getVisitPings(visitId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_location_pings")
    .select("id, latitude, longitude, recorded_at")
    .eq("visit_id", visitId)
    .order("recorded_at", { ascending: true });
  return (data ?? []) as { id: number; latitude: number; longitude: number; recorded_at: string }[];
}

// ---------- Fotos de una visita ----------
export async function getVisitPhotos(visitId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_visit_photos")
    .select("id, visit_id, report_id, storage_path, caption, taken_at, latitude, longitude, created_at")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: false });
  return (data ?? []) as import("@/lib/field/types").FieldVisitPhoto[];
}

// ---------- Reporte de una visita ----------
export async function getVisitReport(visitId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_visit_reports")
    .select(
      "id, visit_id, equipment_tag, serial_number, medida, unidad_medida, marca, modelo, materiales_caras, materiales_orings, findings, recommendations, requires_repair, created_work_order_item_id, ot_requested, ot_request_status, ot_request_notes, ot_requested_at, created_at, updated_at"
    )
    .eq("visit_id", visitId)
    .maybeSingle();
  return (data ?? null) as import("@/lib/field/types").FieldVisitReport | null;
}

// ---------- Gastos de una visita ----------
export async function getVisitExpenses(visitId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_expenses")
    .select(
      "id, visit_id, technician_id, category, amount, currency, description, incurred_at, receipt_path, status, is_billable, approved_by, created_at, updated_at, deleted_at"
    )
    .eq("visit_id", visitId)
    .is("deleted_at", null)
    .order("incurred_at", { ascending: false })
    .limit(EXPENSES_LIMIT);
  return (data ?? []) as FieldExpense[];
}

// ---------- Detalle de un gasto + su log de auditoría ----------
export async function getExpense(id: string): Promise<FieldExpense | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_expenses")
    .select(
      "id, visit_id, technician_id, category, amount, currency, description, incurred_at, receipt_path, status, is_billable, approved_by, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name, branch_id), visit:field_visits(id, visit_number, branch_id)"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as FieldExpense | null;
}

export async function getExpenseEvents(expenseId: string) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_expense_events")
    .select("id, expense_id, event_type, old_status, new_status, comment, metadata, created_by, created_at, profile:profiles(full_name)")
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: true });
  return (data ?? []) as import("@/lib/field/types").FieldExpenseEvent[];
}

// ---------- Datos para el form de visitas ----------
export interface VisitFormData {
  technicians: FieldTechnician[];
  vehicles: FieldVehicle[];
  sites: FieldSite[];
  clients: Client[];
  workOrders: Pick<WorkOrder, "id" | "order_number" | "client_id">[];
}

export async function getVisitFormData(): Promise<VisitFormData> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [technicians, vehicles, sites, clientsRes, ordersRes] = await Promise.all([
    getTechnicians(true),
    getVehicles(true),
    getSites(true),
    sb
      .from("clients")
      .select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at")
      .eq("is_active", true)
      .order("business_name"),
    sb
      .from("work_orders")
      .select("id, order_number, client_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  return {
    technicians,
    vehicles,
    sites,
    clients: (clientsRes.data ?? []) as Client[],
    workOrders: (ordersRes.data ?? []) as Pick<WorkOrder, "id" | "order_number" | "client_id">[],
  };
}

// ---------- Usuario actual (para created_by / audit) ----------
export async function getCurrentUserProfile(): Promise<{ id: string; full_name: string; role: string | null } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", auth.user.id)
    .maybeSingle();
  return profile
    ? { id: profile.id as string, full_name: (profile.full_name as string) ?? "", role: (profile.role as string) ?? null }
    : { id: auth.user.id, full_name: "", role: null };
}

// ---------- Posiciones de técnicos con visita activa (para el mapa general) ----------
export interface ActiveVisitPosition {
  visitId: string;
  visitNumber: string | null;
  technicianName: string;
  lat: number;
  lng: number;
}

export async function getActiveVisitPositions(): Promise<ActiveVisitPosition[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: visits } = await sb
    .from("field_visits")
    .select("id, visit_number, technician:field_technicians(full_name)")
    .is("deleted_at", null)
    .in("status", ["en_curso", "en_sitio"]);

  const activeVisits = (visits ?? []) as { id: string; visit_number: string | null; technician: { full_name: string } | null }[];
  if (activeVisits.length === 0) return [];

  const ids = activeVisits.map((v) => v.id);
  const { data: pings } = await sb
    .from("field_location_pings")
    .select("visit_id, latitude, longitude, recorded_at")
    .in("visit_id", ids)
    .order("recorded_at", { ascending: false });

  const latestByVisit = new Map<string, { latitude: number; longitude: number }>();
  for (const p of (pings ?? []) as { visit_id: string; latitude: number; longitude: number }[]) {
    if (!latestByVisit.has(p.visit_id)) latestByVisit.set(p.visit_id, { latitude: p.latitude, longitude: p.longitude });
  }

  const result: ActiveVisitPosition[] = [];
  for (const v of activeVisits) {
    const last = latestByVisit.get(v.id);
    if (last) {
      result.push({
        visitId: v.id,
        visitNumber: v.visit_number,
        technicianName: v.technician?.full_name ?? "Técnico",
        lat: Number(last.latitude),
        lng: Number(last.longitude),
      });
    }
  }
  return result;
}

// ---------- KPIs del dashboard de Field ----------
export interface DashboardFieldStats {
  activeVisits: number;
  techniciansOnRoute: number;
  docsExpiringSoon: number;
  monthExpensesArs: number;
  monthExpensesUsd: number;
}

export async function getDashboardFieldStats(): Promise<DashboardFieldStats> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: activeRaw }, { data: docsRaw }, { data: expensesRaw }] = await Promise.all([
    sb
      .from("field_visits")
      .select("id, technician_id, status")
      .is("deleted_at", null)
      .in("status", ["en_curso", "en_sitio"]),
    sb
      .from("field_documents")
      .select("id, expires_at")
      .is("deleted_at", null)
      .not("expires_at", "is", null)
      .lte("expires_at", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
    sb
      .from("field_expenses")
      .select("amount, currency, incurred_at")
      .is("deleted_at", null)
      .gte("incurred_at", startOfMonth.toISOString()),
  ]);

  const active = (activeRaw ?? []) as { technician_id: string | null }[];
  const techs = new Set(active.map((v) => v.technician_id).filter(Boolean));
  const expenses = (expensesRaw ?? []) as { amount: number; currency: string }[];
  const sumBy = (cur: string) =>
    expenses.filter((e) => e.currency === cur).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

  return {
    activeVisits: active.length,
    techniciansOnRoute: techs.size,
    docsExpiringSoon: (docsRaw ?? []).length,
    monthExpensesArs: sumBy("ARS"),
    monthExpensesUsd: sumBy("USD"),
  };
}
