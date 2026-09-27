// search.ts — src/lib/search.ts — 2026-07-18
// Búsqueda universal de la suite: consulta en paralelo por módulo habilitado (isModuleEnabled)
// y devuelve resultados agrupados. Reusa las tablas existentes con ilike sobre columnas clave.

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { isModuleEnabled } from "@/lib/modules";
import {
  TRACE_ORDER_FIELDS, TRACE_ITEM_FIELDS, TRACE_CLIENT_FIELDS, TRACE_ITEM_PREVIEW_FIELDS,
  ilikeOr, sanitizeTerm, matchStatuses, matchBranches, matchOrderType, matchDateRange,
} from "@/lib/search-fields";

export interface SearchHit { title: string; subtitle: string; href: string }
export interface SearchGroup { key: string; label: string; hits: SearchHit[] }

const LIMIT = 5;

export async function searchSuite(q: string): Promise<SearchGroup[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const safe = sanitizeTerm(term);
  if (!safe) return [];
  const like = `%${safe}%`;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const groups: SearchGroup[] = [];
  const push = (key: string, label: string, hits: SearchHit[]) => { if (hits.length) groups.push({ key, label, hits }); };

  // Master data (siempre): clientes. La misma consulta sirve para el grupo "Clientes" y para
  // encontrar las órdenes de ese cliente, así que no hace falta una consulta aparte.
  const clientsP = supabase.from("clients").select("id, business_name, tax_id, client_code")
    .or(ilikeOr(TRACE_CLIENT_FIELDS, safe)).limit(LIMIT);

  // Trace — búsqueda universal sobre la OT/OTS. Los campos buscables se declaran en
  // lib/search-fields.ts, no acá.
  //
  // Se resuelve en dos pasos, con una cantidad FIJA de consultas (no hay N+1):
  //   paso 1 — en paralelo con todo lo demás: campos de la cabecera, e ítems que matchean;
  //   paso 2 — UNA consulta que trae las órdenes referidas por esos ítems y por esos clientes.
  // El paso 2 existe para no depender de embeber `work_orders` desde `work_order_items`: esa
  // dirección no se usa en ninguna otra parte del sistema y no se puede verificar sin base.
  const traceOn = isModuleEnabled("trace");
  const ORDER_COLS = "id, order_number, status, date_in, clients(business_name)";
  const none = Promise.resolve({ data: [] });

  // Campos de la cabecera + el término interpretado como estado, tipo, sucursal o fecha.
  const traceOrderClauses = [ilikeOr(TRACE_ORDER_FIELDS, safe)];
  const statuses = matchStatuses(safe);
  if (statuses.length) traceOrderClauses.push(`status.in.(${statuses.join(",")})`);
  const branches = matchBranches(safe);
  if (branches.length) traceOrderClauses.push(`branch_id.in.(${branches.join(",")})`);
  const orderType = matchOrderType(safe);
  if (orderType) traceOrderClauses.push(`order_type.eq.${orderType}`);
  const dateRange = matchDateRange(safe);
  if (dateRange) traceOrderClauses.push(`and(date_in.gte.${dateRange.from},date_in.lt.${dateRange.to})`);

  const traceP = traceOn
    ? sb.from("work_orders").select(ORDER_COLS).is("deleted_at", null)
        .or(traceOrderClauses.join(",")).limit(LIMIT)
    : none;

  // Ítems: TAG, serie, descripción, materiales, diagnóstico… Solo se pide a qué orden pertenecen
  // y el texto que se va a mostrar; la orden se trae en el paso 2.
  const traceItemsP = traceOn
    ? sb.from("work_order_items")
        .select(`work_order_id, ${TRACE_ITEM_PREVIEW_FIELDS.join(", ")}`)
        .or(ilikeOr(TRACE_ITEM_FIELDS, safe))
        .limit(LIMIT * 4)
    : none;

  const crmOn = isModuleEnabled("crm");
  const crmLeadsP = crmOn ? sb.from("crm_leads").select("id, company_name, contact_name").is("deleted_at", null).or(`company_name.ilike.${like},contact_name.ilike.${like}`).limit(LIMIT) : Promise.resolve({ data: [] });
  const crmOppsP = crmOn ? sb.from("crm_opportunities").select("id, title, client:clients(business_name)").is("deleted_at", null).ilike("title", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const crmContactsP = crmOn ? sb.from("crm_contacts").select("id, full_name, role_title").is("deleted_at", null).ilike("full_name", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const crmQuotesP = crmOn ? sb.from("crm_quotes").select("id, quote_number, title").is("deleted_at", null).or(`quote_number.ilike.${like},title.ilike.${like}`).limit(LIMIT) : Promise.resolve({ data: [] });

  const fieldOn = isModuleEnabled("field");
  const fVisitsP = fieldOn ? sb.from("field_visits").select("id, visit_number, client:clients(business_name)").is("deleted_at", null).ilike("visit_number", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const fTechsP = fieldOn ? sb.from("field_technicians").select("id, full_name").is("deleted_at", null).ilike("full_name", like).limit(LIMIT) : Promise.resolve({ data: [] });
  const fSitesP = fieldOn ? sb.from("field_sites").select("id, name, city").is("deleted_at", null).ilike("name", like).limit(LIMIT) : Promise.resolve({ data: [] });

  const [clients, trace, traceByItem, leads, opps, contacts, quotes, visits, techs, sites] = await Promise.all([
    clientsP, traceP, traceItemsP, crmLeadsP, crmOppsP, crmContactsP, crmQuotesP, fVisitsP, fTechsP, fSitesP,
  ]);

  // Una consulta que falla devuelve `data: null`, igual que una sin resultados. Sin este log, un
  // error de la consulta se ve en pantalla como "Sin resultados" y es imposible de diagnosticar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (r: any, origen: string) => {
    if (r?.error) console.error(`[searchSuite] ${origen}: ${r.error.message}`, r.error.details ?? "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (r?.data ?? []) as any[];
  };

  const clientRows = d(clients, "clientes");
  push("clients", "Clientes", clientRows.map((c) => ({ title: c.business_name, subtitle: c.tax_id ?? "", href: ROUTES.cliente(c.id) })));

  const lower = safe.toLowerCase();

  // Paso 2 de Trace: una sola consulta para las órdenes referidas por los ítems que matchearon y
  // por los clientes que matchearon. El texto del ítem que produjo el match se guarda para
  // mostrarlo como subtítulo, así se ve POR QUÉ apareció esa orden.
  const itemMatchByOrder = new Map<string, string>();
  for (const item of d(traceByItem, "trace/items")) {
    if (!item.work_order_id || itemMatchByOrder.has(item.work_order_id)) continue;
    const preview = TRACE_ITEM_PREVIEW_FIELDS
      .map((f) => item[f])
      .find((v: unknown): v is string => typeof v === "string" && v.toLowerCase().includes(lower));
    itemMatchByOrder.set(item.work_order_id, preview ? `Ítem: ${preview}` : "Coincide en un ítem");
  }
  const clientIds: string[] = clientRows.map((c) => c.id);

  const relatedClauses: string[] = [];
  if (itemMatchByOrder.size) relatedClauses.push(`id.in.(${Array.from(itemMatchByOrder.keys()).join(",")})`);
  if (clientIds.length) relatedClauses.push(`client_id.in.(${clientIds.join(",")})`);

  const related = traceOn && relatedClauses.length
    ? await sb.from("work_orders").select(ORDER_COLS).is("deleted_at", null)
        .or(relatedClauses.join(",")).limit(LIMIT * 4)
    : { data: [] };

  // Solo entran LIMIT resultados, así que el orden importa: primero el número de orden (el
  // identificador que la gente escribe), después los ítems (el TAG es el caso que motivó esto) y
  // al final el resto. Sin este orden, un match por TAG podía quedar desplazado por uno más débil.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownMatches = d(trace, "trace/orden") as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byNumber = ownMatches.filter((o: any) => o.order_number?.toLowerCase().includes(lower));
  const relatedRows = d(related, "trace/relacionadas");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traceOrders = new Map<string, { order: any; matched: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addOrder = (order: any) => {
    if (order && !traceOrders.has(order.id)) {
      traceOrders.set(order.id, { order, matched: itemMatchByOrder.get(order.id) ?? "" });
    }
  };

  byNumber.forEach(addOrder);
  relatedRows.filter((o) => itemMatchByOrder.has(o.id)).forEach(addOrder);
  ownMatches.forEach(addOrder);
  relatedRows.forEach(addOrder);

  push("trace", "Órdenes · Trace", Array.from(traceOrders.values()).slice(0, LIMIT).map(({ order, matched }) => ({
    title: order.order_number,
    subtitle: [matched, order.clients?.business_name].filter(Boolean).join(" · "),
    href: ROUTES.trace.orden(order.id),
  })));
  push("crm_leads", "Leads · CRM", d(leads, "crm/leads").map((l) => ({ title: l.company_name ?? l.contact_name ?? "Lead", subtitle: l.company_name && l.contact_name ? l.contact_name : "", href: ROUTES.crm.lead(l.id) })));
  push("crm_opps", "Oportunidades · CRM", d(opps, "crm/oportunidades").map((o) => ({ title: o.title, subtitle: o.client?.business_name ?? "", href: ROUTES.crm.pipeline })));
  push("crm_contacts", "Contactos · CRM", d(contacts, "crm/contactos").map((c) => ({ title: c.full_name, subtitle: c.role_title ?? "", href: ROUTES.crm.contacto(c.id) })));
  push("crm_quotes", "Cotizaciones · CRM", d(quotes, "crm/cotizaciones").map((q2) => ({ title: q2.quote_number ?? q2.title, subtitle: q2.title, href: ROUTES.crm.cotizacion(q2.id) })));
  push("field_visits", "Visitas · Field", d(visits, "field/visitas").map((v) => ({ title: v.visit_number ?? "Visita", subtitle: v.client?.business_name ?? "", href: ROUTES.field.visita(v.id) })));
  push("field_techs", "Técnicos · Field", d(techs, "field/tecnicos").map((t) => ({ title: t.full_name, subtitle: "", href: ROUTES.field.tecnico(t.id) })));
  push("field_sites", "Plantas · Field", d(sites, "field/plantas").map((s) => ({ title: s.name, subtitle: s.city ?? "", href: ROUTES.field.planta(s.id) })));

  return groups;
}
