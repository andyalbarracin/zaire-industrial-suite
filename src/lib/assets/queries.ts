// queries.ts — src/lib/assets/queries.ts — 2026-07-20
// Lecturas tipadas de Zaire Activos (Server Components). Tablas asset_ no están en el tipo
// Database → cliente casteado. El health score se calcula ON-READ (molde de getAccounts del CRM).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import { computeAssetHealth, assetRisk, daysUntilExpiry, expiryLight } from "@/lib/assets/health";
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

// Fallas de los últimos 12 meses por equipo (para el health score).
//
// El error NO se descarta, y es deliberado: si esta consulta falla (RLS, permisos, red) y se
// devolviera `{}`, todos los equipos quedarían con 0 fallas y TODA LA FLOTA SE VERÍA SANA, en
// silencio. En un módulo de confiabilidad ese es el peor error posible: no muestra una falla,
// muestra una mentira tranquilizadora. Mejor que explote y lo agarre `assets/error.tsx`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function failuresByAsset(sb: any): Promise<Record<string, number>> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await sb.from("asset_events").select("asset_id").eq("type", "falla").gte("event_date", since);
  if (error) throw new Error(`No se pudieron leer las fallas de los equipos: ${error.message}`);
  const acc: Record<string, number> = {};
  for (const r of (data ?? []) as { asset_id: string }[]) acc[r.asset_id] = (acc[r.asset_id] ?? 0) + 1;
  return acc;
}

/** Agrega los campos de vencimiento calculados, para que la UI no los calcule en el render. */
function withExpiry(docs: AssetDocument[], now: number): AssetDocument[] {
  return docs.map((d) => {
    const days = daysUntilExpiry(d.expires_at, now);
    return { ...d, days_until_expiry: days, expiry_light: expiryLight(days) };
  });
}

export const getAssets = cache(async (): Promise<Asset[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [{ data }, fails] = await Promise.all([
    sb.from("assets").select(ASSET_SELECT).is("deleted_at", null).order("name"),
    failuresByAsset(sb),
  ]);
  return ((data ?? []) as Asset[]).map((a) => ({
    ...a,
    health: computeAssetHealth({
      status: a.status, installedAt: a.installed_at, expectedLifeYears: a.expected_life_years,
      recentFailures: fails[a.id] ?? 0,
    }),
  }));
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
  const health = computeAssetHealth({
    status: (asset as Asset).status, installedAt: (asset as Asset).installed_at,
    expectedLifeYears: (asset as Asset).expected_life_years,
    recentFailures: evs.filter((e) => e.type === "falla" && Date.now() - new Date(e.event_date).getTime() <= 365 * 86_400_000).length,
  });
  return {
    asset: { ...(asset as Asset), health },
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
  const atRisk = [...assets].filter((a) => (a.health ?? 100) < 60)
    .sort((x, y) => assetRisk(y.health ?? 100, y.criticidad) - assetRisk(x.health ?? 100, x.criticidad));

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
