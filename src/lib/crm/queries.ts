// queries.ts — src/lib/crm/queries.ts — 2026-07-16
// Helpers de lectura tipados para Zaire CRM (Server Components).
// Las tablas crm_ no están en el tipo Database generado, así que se accede con
// el cliente casteado (deuda técnica conocida del proyecto) y se castea el resultado.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  CrmLead,
  CrmContact,
  CrmOpportunity,
  CrmActivity,
  CrmPipelineStage,
  CrmAttachment,
  CrmAttachmentEntity,
  CrmAccount,
  CrmQuote,
  Client,
} from "@/lib/crm/types";
import { isModuleEnabled } from "@/lib/modules";
import { computeAccountScore } from "@/lib/crm/score";

// Producto del catálogo de Trace (reusado en cotizaciones).
export interface QuoteProduct {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  default_unit_price: number | null;
  default_currency: string;
}

// Último precio conocido por producto (para sugerir en el form de cotización).
export interface LastPrice {
  unit_price: number;
  unit_cost: number | null;
  currency: string;
  created_at: string;
}

// Sucursal/planta del cliente (reusa field_sites si Field está habilitado).
export interface CrmClientSite {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const LEADS_LIMIT = 1000;
export const OPPORTUNITIES_LIMIT = 1000;
export const CONTACTS_LIMIT = 2000;
export const ACTIVITIES_LIMIT = 2000;

// owner_id y created_by ambos apuntan a profiles → se desambigua con el nombre de la FK.
const LEAD_SELECT = `
  id, company_name, contact_name, email, phone, source, status, owner_id,
  estimated_value, currency, notes, discard_reason, converted_client_id, converted_at,
  industry, website, score, next_action_at,
  created_by, created_at, updated_at,
  owner:profiles!crm_leads_owner_id_fkey(id, full_name),
  converted_client:clients(id, business_name)
`;

const CONTACT_SELECT = `
  id, client_id, lead_id, full_name, role_title, email, phone, is_primary, notes,
  created_by, created_at, updated_at,
  client:clients(id, business_name),
  lead:crm_leads(id, company_name, contact_name)
`;

const OPP_SELECT = `
  id, title, client_id, lead_id, contact_id, stage, amount, currency, probability,
  expected_close_date, owner_id, lost_reason, notes, next_action_at, closed_at, created_by, created_at, updated_at,
  client:clients(id, business_name),
  lead:crm_leads(id, company_name, contact_name),
  contact:crm_contacts(id, full_name),
  owner:profiles!crm_opportunities_owner_id_fkey(id, full_name)
`;

const ACTIVITY_SELECT = `
  id, activity_type, subject, body, opportunity_id, client_id, lead_id, contact_id,
  due_at, done, done_at, created_by, created_at, updated_at,
  opportunity:crm_opportunities(id, title),
  client:clients(id, business_name),
  lead:crm_leads(id, company_name, contact_name),
  contact:crm_contacts(id, full_name),
  creator:profiles!crm_activities_created_by_fkey(id, full_name)
`;

// ---------- Leads ----------
export async function getLeads(): Promise<CrmLead[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_leads")
    .select(LEAD_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(LEADS_LIMIT);
  return (data ?? []) as CrmLead[];
}

export async function getLead(id: string): Promise<CrmLead | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as CrmLead | null;
}

// ---------- Contactos ----------
export async function getContacts(): Promise<CrmContact[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_contacts")
    .select(CONTACT_SELECT)
    .is("deleted_at", null)
    .order("full_name", { ascending: true })
    .limit(CONTACTS_LIMIT);
  return (data ?? []) as CrmContact[];
}

// ---------- Oportunidades ----------
export async function getOpportunities(): Promise<CrmOpportunity[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_opportunities")
    .select(OPP_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(OPPORTUNITIES_LIMIT);
  return (data ?? []) as CrmOpportunity[];
}

export async function getOpportunity(id: string): Promise<CrmOpportunity | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_opportunities")
    .select(OPP_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as CrmOpportunity | null;
}

// ---------- Actividades ----------
export async function getActivities(): Promise<CrmActivity[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_activities")
    .select(ACTIVITY_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(ACTIVITIES_LIMIT);
  return (data ?? []) as CrmActivity[];
}

export async function getContact(id: string): Promise<CrmContact | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("crm_contacts").select(CONTACT_SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
  return (data ?? null) as CrmContact | null;
}

// Actividades filtradas por entidad (para las fichas de detalle).
async function activitiesBy(column: "lead_id" | "client_id" | "contact_id", value: string): Promise<CrmActivity[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_activities")
    .select(ACTIVITY_SELECT)
    .eq(column, value)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(ACTIVITIES_LIMIT);
  return (data ?? []) as CrmActivity[];
}
export const getActivitiesForLead = (leadId: string) => activitiesBy("lead_id", leadId);
export const getActivitiesForClient = (clientId: string) => activitiesBy("client_id", clientId);
export const getActivitiesForContact = (contactId: string) => activitiesBy("contact_id", contactId);

export async function getContactsForClient(clientId: string): Promise<CrmContact[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("crm_contacts").select(CONTACT_SELECT).eq("client_id", clientId).is("deleted_at", null).order("is_primary", { ascending: false });
  return (data ?? []) as CrmContact[];
}

export async function getOpportunitiesForClient(clientId: string): Promise<CrmOpportunity[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("crm_opportunities").select(OPP_SELECT).eq("client_id", clientId).is("deleted_at", null).order("created_at", { ascending: false });
  return (data ?? []) as CrmOpportunity[];
}

// ---------- Adjuntos ----------
export async function getAttachments(entityType: CrmAttachmentEntity, entityId: string): Promise<CrmAttachment[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_attachments")
    .select("id, entity_type, entity_id, category, file_name, storage_path, file_type, size_bytes, notes, uploaded_by, created_at, deleted_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmAttachment[];
}

// ---------- Cuentas (clients + rollups comerciales) ----------
export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Client | null;
}

export async function getAccounts(): Promise<CrmAccount[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [{ data: clients }, { data: opps }, { data: contacts }, { data: acts }, stages] = await Promise.all([
    supabase.from("clients").select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at").order("business_name"),
    sb.from("crm_opportunities").select("client_id, stage, amount, currency").is("deleted_at", null),
    sb.from("crm_contacts").select("client_id").is("deleted_at", null),
    sb.from("crm_activities").select("client_id, created_at").is("deleted_at", null),
    getPipelineStages(),
  ]);
  const openKeys = new Set(stages.filter((s) => !s.is_won && !s.is_lost).map((s) => s.key));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oList = (opps ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cList = (contacts ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aList = (acts ?? []) as any[];

  const now = Date.now();
  return ((clients ?? []) as Client[]).map((client) => {
    const cOpps = oList.filter((o) => o.client_id === client.id && openKeys.has(o.stage));
    const lastAct = aList
      .filter((a) => a.client_id === client.id)
      .reduce<string | null>((max, a) => (!max || a.created_at > max ? a.created_at : max), null);
    const contactsCount = cList.filter((c) => c.client_id === client.id).length;
    const openOpportunities = cOpps.length;
    const pipelineArs = cOpps.filter((o) => o.currency === "ARS").reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const pipelineUsd = cOpps.filter((o) => o.currency === "USD").reduce((s, o) => s + (Number(o.amount) || 0), 0);

    const score = computeAccountScore({ openOpportunities, pipelineArs, pipelineUsd, contactsCount, lastActivityAt: lastAct }, now);

    return { client, contactsCount, openOpportunities, pipelineArs, pipelineUsd, lastActivityAt: lastAct, score };
  });
}

// Sucursales/plantas del cliente — reusa field_sites SOLO si Field está habilitado.
export async function getClientSites(clientId: string): Promise<CrmClientSite[]> {
  if (!isModuleEnabled("field")) return [];
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("field_sites")
    .select("id, name, city, province, latitude, longitude")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as CrmClientSite[];
}

// ---------- Cotizaciones (Fase B) ----------
const QUOTE_SELECT = `
  id, quote_number, opportunity_id, client_id, title, status, currency, valid_until,
  terms, notes, subtotal, total_cost, margin_amount, margin_pct, tax_pct, tax_amount, total,
  generated_work_order_id, created_by, created_at, updated_at,
  client:clients(id, business_name),
  opportunity:crm_opportunities(id, title)
`;

export async function getQuotes(): Promise<CrmQuote[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("crm_quotes").select(QUOTE_SELECT).is("deleted_at", null).order("created_at", { ascending: false }).limit(1000);
  return (data ?? []) as CrmQuote[];
}

export async function getQuote(id: string): Promise<CrmQuote | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_quotes")
    .select(`${QUOTE_SELECT}, items:crm_quote_items(id, quote_id, item_number, product_id, description, specs, quantity, unit_cost, unit_price, line_total, created_at)`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data ?? null) as CrmQuote | null;
}

export async function getQuoteProducts(): Promise<QuoteProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, code, name, unit, default_unit_price, default_currency")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as QuoteProduct[];
}

// Último precio por producto (del historial), para sugerir en el form.
export async function getLastPrices(): Promise<Record<string, LastPrice>> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_price_history")
    .select("product_id, unit_price, unit_cost, currency, created_at")
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);
  const map: Record<string, LastPrice> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    if (r.product_id && !map[r.product_id]) {
      map[r.product_id] = { unit_price: Number(r.unit_price), unit_cost: r.unit_cost != null ? Number(r.unit_cost) : null, currency: r.currency, created_at: r.created_at };
    }
  }
  return map;
}

// ---------- Etapas del pipeline (dinámicas) ----------
// cache(): dedupe por request — el dashboard lo pide directo y vía getCrmDashboardStats.
export const getPipelineStages = cache(async (): Promise<CrmPipelineStage[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("crm_pipeline_stages")
    .select("key, name, position, color, is_won, is_lost, created_at, updated_at")
    .order("position", { ascending: true });
  return (data ?? []) as CrmPipelineStage[];
});

// ---------- Clientes (master data compartida) para selects ----------
export async function getCrmClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at")
    .eq("is_active", true)
    .order("business_name");
  return (data ?? []) as Client[];
}

// ---------- KPIs del dashboard CRM ----------
export interface CrmDashboardStats {
  newLeads: number;            // leads en estado 'nuevo'
  openOpportunities: number;   // oportunidades en etapas abiertas
  pipelineArs: number;         // monto en pipeline (ARS, etapas abiertas)
  pipelineUsd: number;         // monto en pipeline (USD, etapas abiertas)
  wonThisMonthArs: number;     // ganadas del mes (ARS)
  wonThisMonthUsd: number;     // ganadas del mes (USD)
  wonThisMonthCount: number;
}

export async function getCrmDashboardStats(): Promise<CrmDashboardStats> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Etapas dinámicas: "abiertas" = ni ganada ni perdida; "ganada" = is_won.
  const stages = await getPipelineStages();
  const openKeys = stages.filter((s) => !s.is_won && !s.is_lost).map((s) => s.key);
  const wonKeys = stages.filter((s) => s.is_won).map((s) => s.key);
  // Guardas para no romper el .in() si no hay etapas cargadas todavía.
  const safeOpen = openKeys.length ? openKeys : ["__none__"];
  const safeWon = wonKeys.length ? wonKeys : ["__none__"];

  const [{ count: newLeads }, { data: openOpps }, { data: wonOpps }] = await Promise.all([
    sb.from("crm_leads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "nuevo"),
    sb.from("crm_opportunities").select("amount, currency").is("deleted_at", null).in("stage", safeOpen),
    sb
      .from("crm_opportunities")
      .select("amount, currency")
      .is("deleted_at", null)
      .in("stage", safeWon)
      .gte("closed_at", startOfMonth.toISOString()),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const open = (openOpps ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const won = (wonOpps ?? []) as any[];

  const sumBy = (rows: { amount: number | null; currency: string }[], cur: string) =>
    rows.filter((r) => r.currency === cur).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  return {
    newLeads: newLeads ?? 0,
    openOpportunities: open.length,
    pipelineArs: sumBy(open, "ARS"),
    pipelineUsd: sumBy(open, "USD"),
    wonThisMonthArs: sumBy(won, "ARS"),
    wonThisMonthUsd: sumBy(won, "USD"),
    wonThisMonthCount: won.length,
  };
}
