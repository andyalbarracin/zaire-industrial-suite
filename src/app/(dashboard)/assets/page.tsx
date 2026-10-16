// page.tsx — src/app/(dashboard)/assets/page.tsx — 2026-07-20
// Zaire Activos — Panel: KPIs + equipos en riesgo (health) + garantías/documentos por vencer.
// (Fase 5 suma detalle de confiabilidad; Fase 7, gráficos + campana.)

import Link from "next/link";
import { Cog, Wrench, ShieldAlert, DollarSign, FileWarning, ArrowRight, Plus } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getAssetDashboardStats } from "@/lib/assets/queries";
import { ASSET_STATUS_LABELS, ASSET_STATUS_BADGE, CRITICIDAD_LABELS, ZHI_BAND_LIGHT } from "@/lib/assets/constants";

import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/shared/status-dot";
import { AssetCharts } from "@/components/assets/asset-charts";
import { FleetHealth } from "@/components/assets/fleet-health";
import { formatCurrency, cn } from "@/lib/utils";
import type { Currency } from "@/lib/assets/types";

export const dynamic = "force-dynamic";

export default async function AssetsDashboardPage() {
  const stats = await getAssetDashboardStats();
  const costLabel = stats.serviceCostMonth.length
    ? stats.serviceCostMonth.map((c) => formatCurrency(c.value, c.name as Currency)).join(" · ")
    : formatCurrency(0, "ARS");

  // Cada KPI lleva a donde está lo que cuenta, y filtrado. Un número que no se puede abrir
  // obliga a ir al listado y reconstruir el filtro a mano, que es justo lo que el panel
  // tendría que ahorrar.
  const kpis = [
    { label: "Equipos", value: String(stats.total), icon: Cog, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/15",
      href: ROUTES.assets.equipos, hint: "Ver todos los equipos" },
    { label: "En reparación", value: String(stats.byStatus.en_reparacion), icon: Wrench, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/15",
      href: `${ROUTES.assets.equipos}?estado=en_reparacion`, hint: "Ver los equipos en reparación" },
    { label: "En riesgo", value: String(stats.atRiskCount), icon: ShieldAlert, color: "text-red-600 dark:text-red-300", bg: "bg-red-50 dark:bg-red-500/15",
      href: `${ROUTES.assets.equipos}?riesgo=1`, hint: "Ver los equipos en riesgo" },
    { label: "Costo servicio (mes)", value: costLabel, icon: DollarSign, color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/15",
      href: ROUTES.assets.reportes, hint: "Ver el detalle de costos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--zaire-text)">Panel Assets</h1>
          <p className="text-sm text-(--zaire-text-muted) mt-0.5">Gestión de activos industriales</p>
        </div>
        <Button asChild><Link href={ROUTES.assets.equipoNuevo}><Plus className="w-4 h-4 mr-1.5" /> Nuevo equipo</Link></Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        {kpis.map((k, idx) => {
          const fc = idx === 0 ? "zaire-card-feature" : idx === 3 ? "zaire-card-feature-2" : null;
          const feature = !!fc;
          return (
            <Link
              key={k.label}
              href={k.href}
              aria-label={k.hint}
              className={cn(
                "p-4 block cursor-pointer transition-transform hover:-translate-y-0.5",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zaire-blue",
                "group", fc ?? "zaire-card",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-medium", feature ? "text-(--feature-fg-muted)" : "text-(--zaire-text-muted)")}>{k.label}</span>
                <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", feature ? "bg-white/15 backdrop-blur-sm" : k.bg)}>
                  <k.icon className={cn("w-4 h-4", feature ? "text-white" : k.color)} />
                </span>
              </div>
              <p className={cn("text-2xl font-bold mt-2 tabular-nums truncate", feature ? "text-(--feature-fg)" : "text-(--zaire-text)")}>{k.value}</p>
              {/* La flecha aparece al pasar por encima: avisa que la card se abre sin
                  agregarle ruido permanente a un panel que ya tiene cuatro números. */}
              <span className={cn(
                "text-[11px] mt-1 inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                feature ? "text-(--feature-fg-muted)" : "text-zaire-blue",
              )}>
                {k.hint} <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          );
        })}
      </div>

      <FleetHealth bands={stats.bands} reliability={stats.fleetReliability} />

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
                          {a.zhi && !a.zhi.outOfService && a.zhi.band ? (
                            <>
                              <StatusDot status={ZHI_BAND_LIGHT[a.zhi.band]} size="sm" pulse={a.zhi.band === "critico"} />
                              <b className="tabular-nums text-(--zaire-text)">{a.zhi.score}</b>
                            </>
                          ) : (
                            <span className="text-xs text-(--zaire-text-muted)">Fuera de servicio</span>
                          )}
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
