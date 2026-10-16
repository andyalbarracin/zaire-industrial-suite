// page.tsx — src/app/(dashboard)/assets/equipos/[id]/page.tsx — 2026-07-20
// Ficha "gemelo digital": salud/TCO/MTBF/disponibilidad + datos + ubicación + QR + componentes +
// documentos + hoja de vida (timeline). Las mutaciones (agregar evento/doc/componente) llegan en Fase 4.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Lightbulb, StickyNote } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getAssetFull } from "@/lib/assets/queries";
import { getLabelCompany } from "@/lib/assets/label-company";
import { computeReliability } from "@/lib/assets/reliability";

import { ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, ASSET_STATUS_BADGE, CRITICIDAD_LABELS, ZHI_BAND_LABELS, ZHI_BAND_LIGHT, ZHI_CONFIDENCE_LABELS } from "@/lib/assets/constants";
import { HealthRing } from "@/components/assets/health-ring";
import { ReliabilityKpis } from "@/components/assets/reliability-kpis";
import { ReactiveIndexCard } from "@/components/assets/reactive-index-card";
import { buildReliabilityKpis } from "@/lib/assets/kpi-text";
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
  const [full, company] = await Promise.all([getAssetFull(id), getLabelCompany()]);
  if (!full || !full.asset) notFound();
  const { asset, events, documents, components } = full;

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, code, name, description, category, brand, model, unit, default_currency, default_unit_price, is_active, notes, created_at, updated_at")
    .eq("is_active", true).order("name");
  // `regimen_horas_dia` puede no existir en la base de un tenant sin migrar: llega undefined
  // y el motor cae a calendario puro, declarándolo en `operatingSource`.
  const rel = computeReliability({
    events,
    installedAt: asset.installed_at,
    regimeHoursPerDay: asset.regimen_horas_dia ?? null,
  });
  const zhi = asset.zhi;
  const kpis = buildReliabilityKpis(rel, asset.regimen_horas_dia ?? null);
  const kpiReactivo = kpis.find((k) => k.sigla === "Índice reactivo")!;
  const kpisDeTiempo = kpis.filter((k) => k !== kpiReactivo);
  const hayDiagnostico = !!(zhi && !zhi.outOfService && (zhi.capApplied || zhi.motivos.length > 0 || zhi.recomendacion));

  // El TCO de la ficha es el acumulado de toda la hoja de vida; los KPIs son del período.
  const tco = rel.costByCurrencyAllTime.length ? rel.costByCurrencyAllTime.map((c) => formatCurrency(c.value, c.name as Currency)).join(" · ") : formatCurrency(0, "ARS");

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

      {/* Hero: el anillo con el número adentro + banda + confianza. El anillo nunca va solo. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="zaire-card p-5 flex items-center gap-4">
          <HealthRing score={zhi?.outOfService ? null : zhi?.score ?? null} light={zhi?.band ? ZHI_BAND_LIGHT[zhi.band] : null} />
          <div className="min-w-0">
            <p className="text-xs text-(--zaire-text-muted)">Salud del equipo</p>
            {zhi && !zhi.outOfService && zhi.band ? (
              <>
                <p className="text-lg font-bold text-(--zaire-text) leading-tight">{ZHI_BAND_LABELS[zhi.band]}</p>
                <p className="text-[11px] text-(--zaire-text-muted) mt-0.5">
                  Confianza: {ZHI_CONFIDENCE_LABELS[zhi.confidence]}
                </p>
                <p className="text-[11px] text-(--zaire-text-muted)">Últimos {rel.periodDays} días</p>
              </>
            ) : (
              <p className="text-sm font-medium text-(--zaire-text-muted) mt-1">
                {zhi?.capApplied ?? "Fuera de servicio"}
              </p>
            )}
          </div>
        </div>
        <div className="zaire-card p-5 lg:col-span-2 flex flex-col justify-center">
          <p className="text-xs text-(--zaire-text-muted)">Costo acumulado (TCO)</p>
          <p className="text-2xl font-bold text-(--zaire-text) mt-1 tabular-nums truncate">{tco}</p>
          <p className="text-[11px] text-(--zaire-text-muted) mt-1">
            Toda la hoja de vida, por moneda. Nunca se suman monedas distintas.
          </p>
        </div>
      </div>

      {/* Los KPI de confiabilidad: la frase manda, la sigla va chica con tooltip (§7.1).
          Arriba van los CUATRO que miden tiempo. Son cuatro y no cinco a propósito: 4 entra
          parejo en 1, 2 o 4 columnas y nunca deja una card sola colgando al achicar la
          pantalla. El quinto (índice reactivo) baja al bloque de diagnóstico, que es donde
          significa algo. */}
      <ReliabilityKpis kpis={kpisDeTiempo} />

      {/* Jerarquía del §7.2: número → por qué → qué hacer. Sin fórmula, sin pesos (D6).
          El índice reactivo ocupa la tercera columna: antes quedaba vacía cuando el equipo no
          tenía recomendación, y "Por qué" flotaba solo contra el borde izquierdo. */}
      <div className={cn("grid gap-4", hayDiagnostico ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {hayDiagnostico && (
          <div className="lg:col-span-2 space-y-4">
            {(zhi!.capApplied || zhi!.motivos.length > 0) && (
              <div className="zaire-card p-4 space-y-1.5">
                <p className="text-xs font-medium text-(--zaire-text-muted)">Por qué</p>
                {zhi!.capApplied && <p className="text-sm text-(--zaire-text)">{zhi!.capApplied}</p>}
                {zhi!.motivos.map((m) => (
                  <p key={m.subIndice} className="text-sm text-(--zaire-text)">{m.texto}</p>
                ))}
              </div>
            )}
            {/* Una sola recomendación, la de mayor prioridad. Si no hay ninguna, no se muestra
                nada: un equipo sano no necesita que le inventemos una acción. */}
            {zhi!.recomendacion && (
              <div className="zaire-card p-4 border-l-2 border-l-zaire-blue">
                <p className="text-xs font-medium text-(--zaire-text-muted) flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> Qué hacer
                </p>
                <p className="text-sm text-(--zaire-text) mt-1.5">{zhi!.recomendacion.texto}</p>
              </div>
            )}
          </div>
        )}
        <ReactiveIndexCard kpi={kpiReactivo} reactiveIndex={rel.reactiveIndex} />
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
            <Field label="Fallas (período)" value={String(rel.failures)} />
          </div>
          {asset.notes && (
            <div className="border-t border-(--zaire-border) pt-3">
              <p className="text-xs font-medium text-(--zaire-text-muted) flex items-center gap-1.5 mb-1.5">
                <StickyNote className="w-3.5 h-3.5" /> Notas del equipo
              </p>
              {/* Prosa libre del cliente: lo que no entra en ningún campo ("vibra en frío",
                  "no pararla los lunes"). Se respetan los saltos de línea que haya escrito. */}
              <p className="text-sm text-(--zaire-text) leading-relaxed whitespace-pre-line">{asset.notes}</p>
            </div>
          )}
          {asset.latitude != null && asset.longitude != null && (
            <div className="border-t border-(--zaire-border) pt-3">
              <p className="text-xs text-(--zaire-text-muted) mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Ubicación en mapa</p>
              <FieldMap markers={[{ id: asset.id, lat: asset.latitude, lng: asset.longitude, kind: "site", label: asset.name }]} height={220} center={[asset.latitude, asset.longitude]} zoom={13} />
            </div>
          )}
        </div>

        {/* QR */}
        <AssetQR
          path={ROUTES.assets.equipo(asset.id)}
          company={company}
          data={{
            tag: asset.tag, name: asset.name,
            tipo: asset.type ? ASSET_TYPE_LABELS[asset.type] : null,
            marca: asset.brand, modelo: asset.model, serie: asset.serial,
            ubicacion: asset.address,
            criticidad: `${asset.criticidad} · ${CRITICIDAD_LABELS[asset.criticidad] ?? ""}`.trim(),
          }}
        />
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
