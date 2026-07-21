// page.tsx — src/app/(dashboard)/assets/page.tsx — 2026-07-20
// Zaire Activos — Panel: KPIs + equipos en riesgo (health) + garantías/documentos por vencer.
// (Fase 5 suma detalle de confiabilidad; Fase 7, gráficos + campana.)

import Link from "next/link";
import { Cog, Wrench, ShieldAlert, DollarSign, FileWarning } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getAssetDashboardStats } from "@/lib/assets/queries";
import { ASSET_STATUS_LABELS, ASSET_STATUS_BADGE, CRITICIDAD_LABELS } from "@/lib/assets/constants";
import { healthLight } from "@/lib/assets/health";
import { StatusDot } from "@/components/shared/status-dot";
import { AssetCharts } from "@/components/assets/asset-charts";
import { formatCurrency, cn } from "@/lib/utils";
import type { Currency } from "@/lib/assets/types";

export const dynamic = "force-dynamic";

export default async function AssetsDashboardPage() {
  const stats = await getAssetDashboardStats();
  const costLabel = stats.serviceCostMonth.length
    ? stats.serviceCostMonth.map((c) => formatCurrency(c.value, c.name as Currency)).join(" · ")
    : formatCurrency(0, "ARS");

  const kpis = [
    { label: "Equipos", value: String(stats.total), icon: Cog, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/15" },
    { label: "En reparación", value: String(stats.byStatus.en_reparacion), icon: Wrench, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/15" },
    { label: "En riesgo", value: String(stats.atRiskCount), icon: ShieldAlert, color: "text-red-600 dark:text-red-300", bg: "bg-red-50 dark:bg-red-500/15" },
    { label: "Costo servicio (mes)", value: costLabel, icon: DollarSign, color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/15" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Panel Assets</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Gemelo digital de {stats.total} equipo(s) · salud, costo y confiabilidad</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        {kpis.map((k, idx) => {
          const fc = idx === 0 ? "zaire-card-feature" : idx === 3 ? "zaire-card-feature-2" : null;
          const feature = !!fc;
          return (
            <div key={k.label} className={cn("p-4", fc ?? "zaire-card")}>
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-medium", feature ? "text-(--feature-fg-muted)" : "text-(--zaire-text-muted)")}>{k.label}</span>
                <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", feature ? "bg-white/15 backdrop-blur-sm" : k.bg)}>
                  <k.icon className={cn("w-4 h-4", feature ? "text-white" : k.color)} />
                </span>
              </div>
              <p className={cn("text-2xl font-bold mt-2 tabular-nums truncate", feature ? "text-(--feature-fg)" : "text-(--zaire-text)")}>{k.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up-1">
        {/* Equipos en riesgo */}
        <div className="zaire-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Equipos en riesgo</h2>
            <Link href={ROUTES.assets.equipos} className="text-xs text-zaire-blue hover:underline">Ver equipos →</Link>
          </div>
          <div className="px-5 py-3">
            {stats.atRisk.length === 0 ? (
              <p className="text-sm text-center py-4 text-(--zaire-text-muted)">Sin equipos en riesgo. Todo saludable.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-(--zaire-text-muted) uppercase tracking-wide border-b border-(--zaire-border)">
                    <th className="text-left py-2">Equipo</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-right py-2">Criticidad</th>
                    <th className="text-right py-2">Salud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--zaire-border)">
                  {stats.atRisk.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2">
                        <Link href={ROUTES.assets.equipo(a.id)} className="text-(--zaire-text) hover:text-zaire-blue truncate max-w-40 inline-block">{a.name}</Link>
                      </td>
                      <td className="py-2"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ASSET_STATUS_BADGE[a.status])}>{ASSET_STATUS_LABELS[a.status]}</span></td>
                      <td className="py-2 text-right text-(--zaire-text-muted)">{CRITICIDAD_LABELS[a.criticidad] ?? a.criticidad}</td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center gap-1.5 justify-end">
                          <StatusDot status={healthLight(a.health ?? 100)} size="sm" pulse={(a.health ?? 100) < 40} />
                          <b className="tabular-nums text-(--zaire-text)">{a.health}</b>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Por vencer */}
        <div className="zaire-card">
          <div className="px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Estado de la flota</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <Row label="Operativos" value={stats.byStatus.operativo} />
            <Row label="En reparación" value={stats.byStatus.en_reparacion} />
            <Row label="Standby" value={stats.byStatus.standby} />
            <Row label="Baja" value={stats.byStatus.baja} />
            <div className="pt-2 border-t border-(--zaire-border) flex items-center gap-2 text-sm">
              <FileWarning className="w-4 h-4 text-amber-500" />
              <span className="text-(--zaire-text-muted)">Garantías/documentos por vencer (≤30d):</span>
              <b className="text-(--zaire-text) tabular-nums ml-auto">{stats.expiringDocs}</b>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-(--zaire-text-muted)">Equipos críticos (criticidad ≥ 4):</span>
              <b className="text-(--zaire-text) tabular-nums ml-auto">{stats.criticalCount}</b>
            </div>
          </div>
        </div>
      </div>

      <AssetCharts byStatus={stats.byStatus} byCriticidad={stats.byCriticidad} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-(--zaire-text-muted)">{label}</span>
      <b className="text-(--zaire-text) tabular-nums">{value}</b>
    </div>
  );
}
