// page.tsx — src/app/(dashboard)/assets/equipos/[id]/page.tsx — 2026-07-20
// Ficha "gemelo digital": salud/TCO/MTBF/disponibilidad + datos + ubicación + QR + componentes +
// documentos + hoja de vida (timeline). Las mutaciones (agregar evento/doc/componente) llegan en Fase 4.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getAssetFull } from "@/lib/assets/queries";
import { computeReliability } from "@/lib/assets/reliability";
import { healthLight } from "@/lib/assets/health";
import { ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_BADGE, CRITICIDAD_LABELS } from "@/lib/assets/constants";
import { StatusDot } from "@/components/shared/status-dot";
import { FieldMap } from "@/components/field/field-map";
import { AssetQR } from "@/components/assets/asset-qr";
import { AssetEventsSection } from "@/components/assets/asset-events-section";
import { AssetComponentsSection } from "@/components/assets/asset-components-section";
import { AssetDocumentsSection } from "@/components/assets/asset-documents-section";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Currency } from "@/lib/assets/types";
import type { Product } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AssetFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getAssetFull(id);
  if (!full || !full.asset) notFound();
  const { asset, events, documents, components } = full;

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, code, name, description, category, brand, model, unit, default_currency, default_unit_price, is_active, notes, created_at, updated_at")
    .eq("is_active", true).order("name");
  const rel = computeReliability(events, asset.installed_at);
  const health = asset.health ?? 100;
  const tco = rel.costByCurrency.length ? rel.costByCurrency.map((c) => formatCurrency(c.value, c.name as Currency)).join(" · ") : formatCurrency(0, "ARS");

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.assets.equipos} className="inline-flex items-center gap-1 text-xs text-(--zaire-text-muted) hover:text-zaire-blue mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Equipos</Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-(--zaire-text)">{asset.name}</h1>
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ASSET_STATUS_BADGE[asset.status])}>{ASSET_STATUS_LABELS[asset.status]}</span>
        </div>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {asset.tag && <span className="font-mono">{asset.tag}</span>}
          {asset.type ? `${asset.tag ? " · " : ""}${ASSET_TYPE_LABELS[asset.type]}` : ""}
          {asset.brand ? ` · ${asset.brand}${asset.model ? ` ${asset.model}` : ""}` : ""}
        </p>
      </div>

      {/* Confiabilidad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="zaire-card p-4">
          <p className="text-xs text-(--zaire-text-muted)">Salud</p>
          <p className="text-2xl font-bold mt-1 tabular-nums flex items-center gap-2"><StatusDot status={healthLight(health)} size="sm" pulse={health < 40} /><span className="text-(--zaire-text)">{health}</span></p>
        </div>
        <div className="zaire-card p-4"><p className="text-xs text-(--zaire-text-muted)">Costo acumulado (TCO)</p><p className="text-xl font-bold text-(--zaire-text) mt-1 tabular-nums truncate">{tco}</p></div>
        <div className="zaire-card p-4"><p className="text-xs text-(--zaire-text-muted)">MTBF (entre fallas)</p><p className="text-2xl font-bold text-(--zaire-text) mt-1 tabular-nums">{rel.mtbfDays != null ? `${rel.mtbfDays} d` : "—"}</p></div>
        <div className="zaire-card p-4"><p className="text-xs text-(--zaire-text-muted)">Disponibilidad</p><p className="text-2xl font-bold text-(--zaire-text) mt-1 tabular-nums">{rel.availability != null ? `${Math.round(rel.availability * 100)}%` : "—"}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Datos + ubicación */}
        <div className="lg:col-span-2 zaire-card p-5 space-y-4">
          <h3 className="font-semibold text-(--zaire-text)">Datos del equipo</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Cliente" value={asset.client?.business_name ?? "—"} />
            <Field label="N° de serie" value={asset.serial ?? "—"} />
            <Field label="Criticidad" value={`${asset.criticidad} · ${CRITICIDAD_LABELS[asset.criticidad] ?? ""}`} />
            <Field label="Instalado" value={asset.installed_at ? formatDate(asset.installed_at) : "—"} />
            <Field label="Garantía hasta" value={asset.warranty_until ? formatDate(asset.warranty_until) : "—"} />
            <Field label="Vida útil" value={asset.expected_life_years != null ? `${asset.expected_life_years} años` : "—"} />
            <Field label="Ubicación" value={asset.address ?? "—"} />
            <Field label="Fallas (total)" value={String(rel.failureCount)} />
          </div>
          {asset.notes && <p className="text-sm text-(--zaire-text-muted) border-t border-(--zaire-border) pt-3">{asset.notes}</p>}
          {asset.latitude != null && asset.longitude != null && (
            <div className="border-t border-(--zaire-border) pt-3">
              <p className="text-xs text-(--zaire-text-muted) mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Ubicación en mapa</p>
              <FieldMap markers={[{ id: asset.id, lat: asset.latitude, lng: asset.longitude, kind: "site", label: asset.name }]} height={220} center={[asset.latitude, asset.longitude]} zoom={13} />
            </div>
          )}
        </div>

        {/* QR */}
        <AssetQR path={ROUTES.assets.equipo(asset.id)} tag={asset.tag} name={asset.name} />
      </div>

      {/* Componentes / genealogía */}
      <AssetComponentsSection assetId={asset.id} components={components} products={(products ?? []) as Product[]} />

      {/* Documentos / garantías */}
      <AssetDocumentsSection assetId={asset.id} documents={documents} />

      {/* Hoja de vida */}
      <AssetEventsSection assetId={asset.id} events={events} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-(--zaire-text-muted)">{label}</span>
      <span className="text-(--zaire-text) font-medium text-right truncate">{value}</span>
    </div>
  );
}
