// page.tsx — src/app/(dashboard)/crm/page.tsx — 2026-07-16
// Zaire CRM — Dashboard: KPIs comerciales, embudo por etapa, leads recientes y tareas pendientes.

import Link from "next/link";
import { UserPlus, Target, TrendingUp, Trophy, ChevronRight, ListChecks, AlertTriangle, Clock, Hourglass } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getCrmDashboardStats, getLeads, getOpportunities, getActivities, getPipelineStages } from "@/lib/crm/queries";
import {
  stageDot,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from "@/lib/crm/constants";
import { formatCurrency, formatCurrencyCompact, formatDate, formatDateTime, cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ClickableRow } from "@/components/shared/clickable-row";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const [stats, leads, opportunities, activities, stages] = await Promise.all([
    getCrmDashboardStats(),
    getLeads(),
    getOpportunities(),
    getActivities(),
    getPipelineStages(),
  ]);

  const recentLeads = leads.slice(0, 6);
  const pendingTasks = activities
    .filter((a) => a.activity_type === "tarea" && !a.done)
    .sort((a, b) => new Date(a.due_at ?? a.created_at).getTime() - new Date(b.due_at ?? b.created_at).getTime())
    .slice(0, 6);

  // ── Automatización in-app: alertas comerciales ──
  const now = new Date().getTime();
  const DAY = 86_400_000;
  const stageByKey = new Map(stages.map((s) => [s.key, s]));
  const isOpen = (o: (typeof opportunities)[number]) => { const s = stageByKey.get(o.stage); return s ? !s.is_won && !s.is_lost : true; };
  const openOpps = opportunities.filter(isOpen);
  const lastActByOpp = new Map<string, number>();
  for (const a of activities) {
    if (!a.opportunity_id) continue;
    const t = new Date(a.created_at).getTime();
    if (t > (lastActByOpp.get(a.opportunity_id) ?? 0)) lastActByOpp.set(a.opportunity_id, t);
  }
  const overdueTasks = pendingTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const closingSoon = openOpps.filter((o) => {
    if (!o.expected_close_date) return false;
    const d = new Date(o.expected_close_date).getTime();
    return d >= now - DAY && d <= now + 7 * DAY;
  });
  const staleOpps = openOpps.filter((o) => now - (lastActByOpp.get(o.id) ?? new Date(o.created_at).getTime()) > 14 * DAY);

  const alerts = [
    ...overdueTasks.slice(0, 3).map((t) => ({ id: `t-${t.id}`, kind: "overdue" as const, title: t.subject ?? "Tarea", subtitle: `Tarea vencida · ${t.client?.business_name ?? t.opportunity?.title ?? "—"}`, href: ROUTES.crm.actividades })),
    ...closingSoon.slice(0, 3).map((o) => ({ id: `c-${o.id}`, kind: "close" as const, title: o.title, subtitle: `Cierre estimado ${formatDate(o.expected_close_date)} · ${o.client?.business_name ?? ""}`, href: ROUTES.crm.pipeline })),
    ...staleOpps.slice(0, 3).map((o) => ({ id: `s-${o.id}`, kind: "stale" as const, title: o.title, subtitle: `Sin actividad hace +14 días · ${o.client?.business_name ?? ""}`, href: ROUTES.crm.pipeline })),
  ].slice(0, 6);
  const ALERT_STYLE = {
    overdue: { icon: AlertTriangle, cls: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" },
    close: { icon: Clock, cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" },
    stale: { icon: Hourglass, cls: "bg-subtle-2 text-slate-500 dark:text-(--zaire-text-muted)" },
  };

  // Conteo + monto por etapa (para el embudo), según las etapas dinámicas del pipeline.
  const stageSummary = stages.map((s) => {
    const list = opportunities.filter((o) => o.stage === s.key);
    const totalArs = list.filter((o) => o.currency === "ARS").reduce((a, o) => a + (Number(o.amount) || 0), 0);
    const totalUsd = list.filter((o) => o.currency === "USD").reduce((a, o) => a + (Number(o.amount) || 0), 0);
    return { key: s.key, name: s.name, color: s.color, count: list.length, totalArs, totalUsd };
  });
  const maxCount = Math.max(1, ...stageSummary.map((s) => s.count));

  // Montos en formato compacto (evita números enormes en las KPI cards). USD va como sub-línea.
  const pipelineSub = stats.pipelineUsd > 0 ? formatCurrencyCompact(stats.pipelineUsd, "USD") : null;
  const wonSub = stats.wonThisMonthUsd > 0 ? formatCurrencyCompact(stats.wonThisMonthUsd, "USD") : null;

  const kpis = [
    { label: "Leads nuevos", value: String(stats.newLeads), sub: null as string | null, info: null as string | null, icon: UserPlus, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/15", href: ROUTES.crm.leads as string | null },
    { label: "Oportunidades", value: String(stats.openOpportunities), sub: null as string | null, info: "Oportunidades en etapas abiertas (ni ganadas ni perdidas)." as string | null, icon: Target, color: "text-violet-600 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/15", href: ROUTES.crm.pipeline as string | null },
    { label: "En pipeline", value: formatCurrencyCompact(stats.pipelineArs, "ARS"), sub: pipelineSub, info: "Monto total de las oportunidades en etapas abiertas." as string | null, icon: TrendingUp, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/15", href: null as string | null },
    { label: "Ganadas del mes", value: formatCurrencyCompact(stats.wonThisMonthArs, "ARS"), sub: wonSub, info: `${stats.wonThisMonthCount} oportunidad(es) marcada(s) como ganada(s) este mes. El monto es el total cerrado.` as string | null, icon: Trophy, color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/15", href: null as string | null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Zaire CRM</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Gestión comercial: prospección y pipeline</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        {kpis.map((k, idx) => {
          const fc = idx === 0 ? "zaire-card-feature" : idx === 3 ? "zaire-card-feature-2" : null;
          const feature = !!fc;
          const inner = (
            <>
              <div className="flex items-center justify-between gap-1">
                <span className={cn("text-xs font-medium inline-flex items-center gap-1 min-w-0", feature ? "text-(--feature-fg-muted)" : "text-(--zaire-text-muted)")}>
                  <span className="truncate">{k.label}</span>
                  {k.info && <InfoTooltip text={k.info} tone={feature ? "onDark" : "muted"} className="shrink-0" />}
                </span>
                <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", feature ? "bg-white/15 backdrop-blur-sm" : k.bg)}>
                  <k.icon className={cn("w-4 h-4", feature ? "text-white" : k.color)} />
                </span>
              </div>
              <p className={cn("text-xl font-bold mt-2 tabular-nums truncate", feature ? "text-(--feature-fg)" : "text-(--zaire-text)")}>{k.value}</p>
              {k.sub && <p className={cn("text-xs font-medium tabular-nums truncate", feature ? "text-(--feature-fg-muted)" : "text-(--zaire-text-muted)")}>{k.sub}</p>}
            </>
          );
          const cls = cn("p-4", fc ?? "zaire-card");
          return k.href ? (
            <Link key={k.label} href={k.href} className={cn(cls, "hover:shadow-md transition-shadow")}>{inner}</Link>
          ) : (
            <div key={k.label} className={cls}>{inner}</div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 animate-fade-up-1">
        {/* Embudo por etapa */}
        <div className="lg:col-span-2 zaire-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Embudo por etapa</h2>
            <Link href={ROUTES.crm.pipeline} className="inline-flex items-center gap-1 text-xs text-zaire-blue hover:underline">
              Ver pipeline <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ul className="space-y-2.5">
            {stageSummary.map((s) => (
              <li key={s.key} className="flex items-center gap-3">
                <span className="flex items-center gap-2 w-32 shrink-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", stageDot(s.color))} />
                  <span className="text-sm text-(--zaire-text) truncate">{s.name}</span>
                </span>
                <div className="flex-1 h-2 rounded-full bg-subtle-2 overflow-hidden">
                  <div className={cn("h-full rounded-full", stageDot(s.color))} style={{ width: `${(s.count / maxCount) * 100}%` }} />
                </div>
                <span className="text-sm font-semibold text-(--zaire-text) tabular-nums w-6 text-right">{s.count}</span>
                <span className="text-xs text-(--zaire-text-muted) tabular-nums w-40 text-right hidden sm:block">
                  {s.totalArs > 0 ? formatCurrency(s.totalArs, "ARS") : ""}
                  {s.totalArs > 0 && s.totalUsd > 0 ? " · " : ""}
                  {s.totalUsd > 0 ? formatCurrency(s.totalUsd, "USD") : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tareas pendientes */}
        <div className="zaire-card p-5">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-3">Tareas pendientes</h2>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-(--zaire-text-muted) py-4 text-center">Sin tareas pendientes.</p>
          ) : (
            <ul className="space-y-2.5">
              {pendingTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <ListChecks className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-(--zaire-text) truncate">{t.subject ?? "Tarea"}</p>
                    <p className="text-xs text-(--zaire-text-muted)">
                      {t.client?.business_name ?? t.opportunity?.title ?? "—"}
                      {t.due_at && <> · Vence {formatDateTime(t.due_at)}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href={ROUTES.crm.actividades} className="inline-flex items-center gap-1 text-xs text-zaire-blue hover:underline mt-3">
            Ver actividades <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Alertas comerciales (automatización in-app) */}
      {alerts.length > 0 && (
        <div className="zaire-card p-5 animate-fade-up-2">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-3">Alertas comerciales</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {alerts.map((al) => {
              const st = ALERT_STYLE[al.kind];
              return (
                <li key={al.id}>
                  <Link href={al.href} className="flex items-start gap-2.5 rounded-xl border border-(--zaire-border) bg-panel p-3 hover:bg-subtle/60">
                    <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", st.cls)}>
                      <st.icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--zaire-text) truncate">{al.title}</p>
                      <p className="text-xs text-(--zaire-text-muted) truncate">{al.subtitle}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Leads recientes */}
      <div className="zaire-card p-5 animate-fade-up-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Leads recientes</h2>
          <Link href={ROUTES.crm.leads} className="inline-flex items-center gap-1 text-xs text-zaire-blue hover:underline">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-(--zaire-text-muted) py-4 text-center">Sin leads registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-(--zaire-text-muted) uppercase tracking-wide border-b border-(--zaire-border)">
                <tr>
                  <th className="text-left py-2">Empresa / Contacto</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Responsable</th>
                  <th className="text-left py-2">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {recentLeads.map((l) => (
                  <ClickableRow key={l.id} href={ROUTES.crm.lead(l.id)} className="hover:bg-subtle/80">
                    <td className="py-2 text-(--zaire-text)">{l.company_name ?? l.contact_name ?? "—"}</td>
                    <td className="py-2">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", LEAD_STATUS_COLORS[l.status])}>
                        {LEAD_STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td className="py-2 text-(--zaire-text-muted)">{l.owner?.full_name ?? "—"}</td>
                    <td className="py-2 text-(--zaire-text-muted)">{formatDate(l.created_at)}</td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
