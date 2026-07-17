// search.ts — src/lib/search.ts — 2026-07-18
// Búsqueda universal de la suite: consulta en paralelo por módulo habilitado (isModuleEnabled)
// y devuelve resultados agrupados. Reusa las tablas existentes con ilike sobre columnas clave.

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { isModuleEnabled } from "@/lib/modules";

export interface SearchHit { title: string; subtitle: string; href: string }
export interface SearchGroup { key: string; label: string; hits: SearchHit[] }

const LIMIT = 5;

export async function searchSuite(q: string): Promise<SearchGroup[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const safe = term.replace(/[,()%]/g, " ").trim();
  const like = `%${safe}%`;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const groups: SearchGroup[] = [];
  const push = (key: string, label: string, hits: SearchHit[]) => { if (hits.length) groups.push({ key, label, hits }); };

  // Master data (siempre): clientes
  const clientsP = supabase.from("clients").select("id, business_name, tax_id").or(`business_name.ilike.${like},tax_id.ilike.${like}`).limit(LIMIT);

  const traceP = isModuleEnabled("trace")
    ? sb.from("work_orders").select("id, order_number, clients(business_name)").is("deleted_at", null).ilike("order_number", like).limit(LIMIT)
    : Promise.resolve({ data: [] });

  const crmOn = isModuleEnabled("crm");
  const crmLeadsP = crmOn ? sb.from("crm_leads").select("id, company_name, contact_name").is("deleted_at", null).or(`company_name.ilike.${like},contact_name.ilike.${like}`).limit(LIMIT) : Promise.resolve({ data: [] });
  const crmOppsP = crmOn ? sb.from("crm_opportunities").select("id, title, client:clients(business_name)").is("deleted_at", null).ilike("title", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const crmContactsP = crmOn ? sb.from("crm_contacts").select("id, full_name, role_title").is("deleted_at", null).ilike("full_name", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const crmQuotesP = crmOn ? sb.from("crm_quotes").select("id, quote_number, title").is("deleted_at", null).or(`quote_number.ilike.${like},title.ilike.${like}`).limit(LIMIT) : Promise.resolve({ data: [] });

  const fieldOn = isModuleEnabled("field");
  const fVisitsP = fieldOn ? sb.from("field_visits").select("id, visit_number, client:clients(business_name)").is("deleted_at", null).ilike("visit_number", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const fTechsP = fieldOn ? sb.from("field_technicians").select("id, full_name").is("deleted_at", null).ilike("full_name", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const fSitesP = fieldOn ? sb.from("field_sites").select("id, name, city").is("deleted_at", null).ilike("name", like).limit(LIMIT) : Promise.resolve({ data: [] });

  const [clients, trace, leads, opps, contacts, quotes, visits, techs, sites] = await Promise.all([
    clientsP, traceP, crmLeadsP, crmOppsP, crmContactsP, crmQuotesP, fVisitsP, fTechsP, fSitesP,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (r: any) => (r?.data ?? []) as any[];

  push("clients", "Clientes", d(clients).map((c) => ({ title: c.business_name, subtitle: c.tax_id ?? "", href: ROUTES.cliente(c.id) })));
  push("trace", "Órdenes · Trace", d(trace).map((o) => ({ title: o.order_number, subtitle: o.clients?.business_name ?? "", href: ROUTES.trace.orden(o.id) })));
  push("crm_leads", "Leads · CRM", d(leads).map((l) => ({ title: l.company_name ?? l.contact_name ?? "Lead", subtitle: l.company_name && l.contact_name ? l.contact_name : "", href: ROUTES.crm.lead(l.id) })));
  push("crm_opps", "Oportunidades · CRM", d(opps).map((o) => ({ title: o.title, subtitle: o.client?.business_name ?? "", href: ROUTES.crm.pipeline })));
  push("crm_contacts", "Contactos · CRM", d(contacts).map((c) => ({ title: c.full_name, subtitle: c.role_title ?? "", href: ROUTES.crm.contacto(c.id) })));
  push("crm_quotes", "Cotizaciones · CRM", d(quotes).map((q2) => ({ title: q2.quote_number ?? q2.title, subtitle: q2.title, href: ROUTES.crm.cotizacion(q2.id) })));
  push("field_visits", "Visitas · Field", d(visits).map((v) => ({ title: v.visit_number ?? "Visita", subtitle: v.client?.business_name ?? "", href: ROUTES.field.visita(v.id) })));
  push("field_techs", "Técnicos · Field", d(techs).map((t) => ({ title: t.full_name, subtitle: "", href: ROUTES.field.tecnico(t.id) })));
  push("field_sites", "Plantas · Field", d(sites).map((s) => ({ title: s.name, subtitle: s.city ?? "", href: ROUTES.field.planta(s.id) })));

  return groups;
}
