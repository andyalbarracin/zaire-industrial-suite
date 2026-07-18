// page.tsx — src/app/(dashboard)/field/page.tsx — 2026-07-13
// Zaire Field — Panel/Dashboard: KPIs, mapa general, visitas recientes, vencimientos.

import Link from "next/link";
import { MapPin, Users, FileWarning, Wallet, ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import {
  getDashboardFieldStats,
  getSites,
  getActiveVisitPositions,
  getVisits,
  getFieldDocuments,
} from "@/lib/field/queries";
import { FieldMap, type MapMarker } from "@/components/field/field-map";
import { StatusDot } from "@/components/shared/status-dot";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { VISIT_STATUS_LABELS, VISIT_STATUS_COLORS, DOC_TYPE_LABELS } from "@/lib/field/constants";
import { cn } from "@/lib/utils";
import type { DocType } from "@/lib/field/types";

export const dynamic = "force-dynamic";

export default async function FieldDashboardPage() {
  const [stats, sites, positions, visits, docs] = await Promise.all([
    getDashboardFieldStats(),
    getSites(true),
    getActiveVisitPositions(),
    getVisits(),
    getFieldDocuments(),
  ]);

  const recentVisits = visits.slice(0, 6);
  const upcomingDocs = docs.filter((d) => d.days_until_expiry != null && d.days_until_expiry <= 30).slice(0, 8);

  const siteMarkers: MapMarker[] = sites
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({ id: `site-${s.id}`, lat: s.latitude!, lng: s.longitude!, kind: "site", label: s.name }));
  const techMarkers: MapMarker[] = positions.map((p) => ({
    id: `tech-${p.visitId}`,
    lat: p.lat,
    lng: p.lng,
    kind: "technician",
    label: `${p.technicianName} · ${p.visitNumber ?? ""}`,
  }));

  const kpis = [
    { label: "Visitas activas", value: stats.activeVisits, icon: MapPin, color: "text-violet-600 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/15" },
    { label: "Técnicos en ruta", value: stats.techniciansOnRoute, icon: Users, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/15" },
    { label: "Docs por vencer (≤30d)", value: stats.docsExpiringSoon, icon: FileWarning, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/15" },
    { label: "Gastos del mes", value: stats.monthExpensesUsd > 0 ? `${formatCurrency(stats.monthExpensesArs, "ARS")} · ${formatCurrency(stats.monthExpensesUsd, "USD")}` : formatCurrency(stats.monthExpensesArs, "ARS"), icon: Wallet, color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/15" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Panel Field</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Operación de campo en tiempo real</p>
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
            <p className={cn("text-2xl font-bold mt-2", feature ? "text-(--feature-fg)" : "text-(--zaire-text)")}>{k.value}</p>
          </div>
          );
        })}
      </div>

      {/* Mapa general + vencimientos */}
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-up-1">
        <div className="lg:col-span-2 zaire-card p-5">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-3">Mapa general</h2>
          <FieldMap markers={[...siteMarkers, ...techMarkers]} height={360} center={[-38.5, -66.0]} zoom={5} />
          <div className="flex items-center gap-4 mt-3 text-xs text-(--zaire-text-muted)">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zaire-navy" /> Plantas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zaire-blue" /> Técnicos en ruta</span>
          </div>
        </div>

        <div className="zaire-card p-5">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-3">Próximos vencimientos</h2>
          {upcomingDocs.length === 0 ? (
            <p className="text-sm text-(--zaire-text-muted) py-4 text-center">Sin vencimientos próximos.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcomingDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-2.5">
                  <StatusDot status={d.expiry_light} size="sm" pulse={d.expiry_light === "red"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-(--zaire-text) truncate">
                      {d.doc_type ? DOC_TYPE_LABELS[d.doc_type as DocType] : "Documento"}
                      {" · "}
                      <span className="text-(--zaire-text-muted)">{d.technician?.full_name ?? d.vehicle?.plate ?? "—"}</span>
                    </p>
                    <p className="text-xs text-(--zaire-text-muted)">
                      {d.days_until_expiry != null && d.days_until_expiry < 0
                        ? `Vencido hace ${Math.abs(d.days_until_expiry)} días`
                        : `Vence en ${d.days_until_expiry} días`}{" "}· {formatDate(d.expires_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href={ROUTES.field.documentos} className="inline-flex items-center gap-1 text-xs text-zaire-blue hover:underline mt-3">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Visitas recientes */}
      <div className="zaire-card p-5 animate-fade-up-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Visitas recientes</h2>
          <Link href={ROUTES.field.visitas} className="inline-flex items-center gap-1 text-xs text-zaire-blue hover:underline">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentVisits.length === 0 ? (
          <p className="text-sm text-(--zaire-text-muted) py-4 text-center">Sin visitas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-(--zaire-text-muted) uppercase tracking-wide border-b border-(--zaire-border)">
                <tr>
                  <th className="text-left py-2">N° Visita</th>
                  <th className="text-left py-2">Agendada</th>
                  <th className="text-left py-2">Técnico</th>
                  <th className="text-left py-2">Cliente</th>
                  <th className="text-left py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {recentVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-subtle/80">
                    <td className="py-2">
                      <Link href={ROUTES.field.visita(v.id)} className="font-mono text-xs text-zaire-blue hover:underline">{v.visit_number ?? "—"}</Link>
                    </td>
                    <td className="py-2">{formatDateTime(v.scheduled_at)}</td>
                    <td className="py-2">{v.technician?.full_name ?? "—"}</td>
                    <td className="py-2">{v.client?.business_name ?? "—"}</td>
                    <td className="py-2">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", VISIT_STATUS_COLORS[v.status])}>
                        {VISIT_STATUS_LABELS[v.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
