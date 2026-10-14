// queries.ts — src/lib/assets/queries.ts — 2026-07-20
// Lecturas tipadas de Zaire Activos (Server Components). Tablas asset_ no están en el tipo
// Database → cliente casteado. El health score se calcula ON-READ (molde de getAccounts del CRM).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { computeFleetZhi } from "@/lib/assets/zhi-input";
import { daysUntilExpiry, expiryLight } from "@/lib/utils";
import { ASSET_EVENTS_LIMIT } from "@/lib/assets/constants";
import type { Asset, AssetEvent, AssetDocument, AssetComponent } from "@/lib/assets/types";

// `*` y no una lista explícita de columnas, por dos razones:
//  1. Unifica el patrón del módulo: asset_events y asset_documents ya se leen con `*`.
//     `assets` era la excepción, no la regla.
//  2. Una lista explícita es FAIL-CLOSED: pedir una columna que la base del tenant todavía
//     no tiene tira 42703 y se cae la pantalla de equipos entera. Con `*`, una base sin
//     migrar simplemente no devuelve las columnas nuevas, llegan `undefined` y el motor
//     cae a su fuente por defecto. Es el riesgo §G.1 del addendum, resuelto en vez de repetido.
// El join a clients sí va explícito: `*` no trae relaciones.
const ASSET_SELECT = `*, client:clients(id, business_name)`;

/** Agrega los campos de vencimiento calculados, para que la UI no los calcule en el render. */
function withExpiry(docs: AssetDocument[], now: number): AssetDocument[] {
  return docs.map((d) => {
    const days = daysUntilExpiry(d.expires_at, now);
    return { ...d, days_until_expiry: days, expiry_light: expiryLight(days) };
  });
}

/**
 * La flota con su ZHI calculado.
 *
 * El ZHI necesita bastante más dato que el health viejo: los eventos de cada equipo (para el
 * motor de confiabilidad) y sus documentos (para el pilar Integridad). Y necesita la flota
 * COMPLETA en memoria antes de poder calcular un solo equipo, porque la referencia de cada uno
 * sale de la mediana de los demás (§6.3). Por eso se trae todo junto y se calcula en una sola
 * pasada de flota, en lugar de consultar por equipo.
 *
 * `asset.health` sigue siendo el score, para no romper a los consumidores que ya lo usan;
 * `asset.zhi` trae el resto (banda, motivos, confianza, sub-índices).
 */
export const getAssets = cache(async (): Promise<Asset[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [{ data }, { data: eventRows }, { data: docRows }] = await Promise.all([
    sb.from("assets").select(ASSET_SELECT).is("deleted_at", null).order("name"),
    sb.from("asset_events").select("*").order("event_date", { ascending: false }).limit(ASSET_EVENTS_LIMIT),
    sb.from("asset_documents").select("*").is("deleted_at", null),
  ]);

  const assets = (data ?? []) as Asset[];
  const events = (eventRows ?? []) as AssetEvent[];
  const documents = (docRows ?? []) as AssetDocument[];

  const eventsBy = new Map<string, AssetEvent[]>();
  for (const e of events) (eventsBy.get(e.asset_id) ?? eventsBy.set(e.asset_id, []).get(e.asset_id)!).push(e);
  const docsBy = new Map<string, AssetDocument[]>();
  for (const d of documents) (docsBy.get(d.asset_id) ?? docsBy.set(d.asset_id, []).get(d.asset_id)!).push(d);

  const zhiBy = computeFleetZhi(
    assets.map((a) => ({ asset: a, events: eventsBy.get(a.id) ?? [], documents: docsBy.get(a.id) ?? [] })),
    Date.now(),
  );

  return assets.map((a) => {
    const zhi = zhiBy.get(a.id);
    return { ...a, zhi, health: zhi?.score ?? undefined };
  });
});

export const getAssetFull = cache(async (id: string): Promise<{
  asset: Asset | null;
  events: AssetEvent[];
  documents: AssetDocument[];
  components: AssetComponent[];
} | null> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: asset } = await sb.from("assets").select(ASSET_SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
  if (!asset) return null;
  const [{ data: events }, { data: documents }, { data: components }] = await Promise.all([
    sb.from("asset_events").select("*").eq("asset_id", id).order("event_date", { ascending: false }).order("created_at", { ascending: false }),
    sb.from("asset_documents").select("*").eq("asset_id", id).is("deleted_at", null).order("expires_at", { ascending: true }),
    sb.from("asset_components").select("*, product:products(id, code, name, unit)").eq("asset_id", id).order("created_at"),
  ]);
  const evs = (events ?? []) as AssetEvent[];

  // El ZHI se toma del cálculo de FLOTA, no se recalcula acá. Dos razones:
  //  1. La referencia de un equipo sale de la mediana de los demás (§6.3): sin la flota, la
  //     ficha daría un número distinto al de la lista para el mismo equipo.
  //  2. `getAssets` está envuelto en React.cache, así que en el mismo render no se repite.
  const fleet = await getAssets();
  const zhi = fleet.find((a) => a.id === id)?.zhi;

  return {
    asset: { ...(asset as Asset), zhi, health: zhi?.score ?? undefined },
    events: evs,
    documents: withExpiry((documents ?? []) as AssetDocument[], Date.now()),
    components: (components ?? []) as AssetComponent[],
  };
});

// Alertas para la campana suite-wide: garantías/documentos por vencer (≤30d, incl. vencidos).
export const getAssetBellAlerts = cache(async (): Promise<{ id: string; title: string; subtitle: string; date_due: string; href: string }[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb.from("asset_documents")
    .select("id, name, doc_type, expires_at, asset:assets(id, name)")
    .is("deleted_at", null).not("expires_at", "is", null).lte("expires_at", in30)
    .order("expires_at", { ascending: true }).limit(15);
  return ((data ?? []) as { id: string; name: string | null; doc_type: string | null; expires_at: string; asset: { id: string; name: string } | null }[])
    .map((d) => ({
      id: `assetdoc-${d.id}`,
      title: `${d.doc_type === "garantia" ? "Garantía" : "Documento"} · ${d.name ?? d.doc_type ?? ""}`.trim(),
      subtitle: d.asset?.name ?? "Zaire Assets",
      date_due: d.expires_at,
      href: d.asset ? ROUTES.assets.equipo(d.asset.id) : ROUTES.assets.documentos,
    }));
});

export const getAssetDocuments = cache(async (): Promise<AssetDocument[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("asset_documents")
    .select("*, asset:assets(id, tag, name)")
    .is("deleted_at", null).order("expires_at", { ascending: true });
  return withExpiry((data ?? []) as AssetDocument[], Date.now());
});

// Todos los eventos de la hoja de vida (para reportes de flota/costo/confiabilidad).
// El tope es EXPLÍCITO y la UI avisa cuando se alcanza (<LimitNotice>): si se truncara en
// silencio, el TCO y el top de fallas saldrían mal sin que nada lo indique.
export const getAllAssetEvents = cache(async (limit = ASSET_EVENTS_LIMIT): Promise<AssetEvent[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("asset_events")
    .select("id, asset_id, type, event_date, cost, currency, downtime_hours")
    .order("event_date", { ascending: false }).limit(limit);
  return (data ?? []) as AssetEvent[];
});

export const getAssetDashboardStats = cache(async (): Promise<{
  total: number;
  byStatus: { operativo: number; en_reparacion: number; standby: number; baja: number };
  byCriticidad: { name: string; value: number }[];
  criticalCount: number;
  atRiskCount: number;
  expiringDocs: number;
  serviceCostMonth: { name: string; value: number }[];
  atRisk: Asset[];
}> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const assets = await getAssets();

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: costRows }, { count: expiringDocs }] = await Promise.all([
    sb.from("asset_events").select("cost, currency").not("cost", "is", null).gte("event_date", monthStart),
    sb.from("asset_documents").select("id", { count: "exact", head: true }).is("deleted_at", null).not("expires_at", "is", null).lte("expires_at", in30),
  ]);
  const byCur: Record<string, number> = {};
  for (const r of (costRows ?? []) as { cost: number; currency: string }[]) byCur[r.currency || "ARS"] = (byCur[r.currency || "ARS"] ?? 0) + (r.cost || 0);

  const byStatus = { operativo: 0, en_reparacion: 0, standby: 0, baja: 0 };
  const critAcc: Record<number, number> = {};
  for (const a of assets) { byStatus[a.status] += 1; critAcc[a.criticidad] = (critAcc[a.criticidad] ?? 0) + 1; }
  const byCriticidad = [1, 2, 3, 4, 5].filter((n) => critAcc[n]).map((n) => ({ name: `Crit. ${n}`, value: critAcc[n] }));
  // Los equipos fuera de servicio quedan afuera: no están "en riesgo", están en reparación o
  // de baja, y el dashboard ya los cuenta aparte en byStatus. Se ordenan por la prioridad del
  // §6.6 (salud × criticidad), no por salud: "¿qué atiendo primero?" no es "¿qué está peor?".
  const atRisk = assets
    .filter((a) => a.zhi && !a.zhi.outOfService && a.zhi.band !== "sano")
    .sort((x, y) => (y.zhi?.priority ?? 0) - (x.zhi?.priority ?? 0));

  return {
    total: assets.length,
    byStatus,
    byCriticidad,
    criticalCount: assets.filter((a) => a.criticidad >= 4).length,
    atRiskCount: atRisk.length,
    expiringDocs: expiringDocs ?? 0,
    serviceCostMonth: Object.entries(byCur).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    atRisk: atRisk.slice(0, 8),
  };
});
