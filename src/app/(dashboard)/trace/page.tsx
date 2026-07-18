// page.tsx — src/app/(dashboard)/trace/page.tsx — 2026-05-27
// Dashboard principal con bento grid: métricas, órdenes recientes, vencimientos

import { createClient } from "@/lib/supabase/server";
import { ClipboardList, Truck, Receipt, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge, OrderTypeBadge } from "@/components/trace/order-status-badge";
import { Sparkline } from "@/components/shared/sparkline";
import { ClickableRow } from "@/components/shared/clickable-row";
import { formatDate, formatDateTime, isOverdue, getDueDaysLabel } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/lib/trace/constants";
import { ROUTES } from "@/lib/routes";
import { isModuleEnabled } from "@/lib/modules";
import { cn } from "@/lib/utils";
import type { OrderStatus, OrderType, AuditAction } from "@/lib/types/database";

const STATUS_DOT_COLORS: Record<OrderStatus, string> = {
  ingresada:           "#94A3B8",
  en_revision:         "#576CBC",
  cotizada:            "#8B5CF6",
  aprobada:            "#06B6D4",
  en_reparacion:       "#F59E0B",
  lista_para_entregar: "#84CC16",
  remitido:            "#22C55E",
  facturada:           "#6366F1",
  cancelada:           "#EF4444",
};

export const dynamic = "force-dynamic";

type RecentOrder = {
  id: string; order_number: string; order_type: string; status: string;
  date_in: string; clients: { business_name: string } | null;
};

type UpcomingOrder = {
  id: string; order_number: string; order_type: string; status: string;
  date_due: string | null; clients: { business_name: string } | null;
};

type RecentLog = {
  id: string; action: string; description: string | null;
  user_name: string | null; entity_type: string; entity_id: string | null; created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const statusesToCount: OrderStatus[] = ORDER_STATUSES
    .filter((s) => s.value !== "cancelada")
    .map((s) => s.value as OrderStatus);

  // 4 queries en paralelo en lugar de 12+3
  const [
    { data: allActiveRaw },
    { data: recentOrdersRaw },
    { data: upcomingDueRaw },
    { data: recentActivityRaw },
  ] = await Promise.all([
    // Una sola query reemplaza los 12 count() separados
    supabase.from("work_orders")
      .select("status, created_at")
      .is("deleted_at", null)
      .not("status", "eq", "cancelada"),
    supabase.from("work_orders")
      .select("id, order_number, order_type, status, date_in, clients(business_name)")
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(8),
    supabase.from("work_orders")
      .select("id, order_number, order_type, status, date_due, clients(business_name)")
      .is("deleted_at", null).not("date_due", "is", null)
      .not("status", "in", '("facturada","cancelada","remitido")')
      .order("date_due", { ascending: true }).limit(6),
    supabase.from("audit_logs")
      .select("id, action, description, user_name, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false }).limit(5),
  ]);

  // Conteo client-side desde la query unificada
  const allActive = (allActiveRaw ?? []) as { status: string; created_at: string }[];
  const activeCount = allActive.filter(o => o.status !== "facturada").length;
  const pendingDeliveryCount = allActive.filter(o => o.status === "lista_para_entregar").length;
  const pendingInvoiceCount = allActive.filter(o => o.status === "remitido").length;
  const todayCount = allActive.filter(o => o.created_at >= todayISO).length;
  const statusCountResults = statusesToCount.map(s => ({
    status: s,
    count: allActive.filter(o => o.status === s).length,
  }));

  const recentOrders = recentOrdersRaw as RecentOrder[] | null;
  const upcomingDue = upcomingDueRaw as UpcomingOrder[] | null;
  const recentActivity = recentActivityRaw as RecentLog[] | null;
  const fieldEnabled = isModuleEnabled("field");

  const stats = [
    { id: "activas",     label: "OTs Activas",               value: activeCount ?? 0,          icon: ClipboardList, color: "text-blue-600 dark:text-blue-300",  bg: "bg-blue-50 dark:bg-blue-500/15",  spark: [8,10,9,12,11,13,14,15], sparkColor: "#576CBC" },
    { id: "entregar",    label: "Lista para Entregar",        value: pendingDeliveryCount ?? 0, icon: Truck,         color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/15", spark: [3,2,4,3,2,1,2,1],       sparkColor: "#F59E0B" },
    { id: "facturar",    label: "Pendientes de Facturación",  value: pendingInvoiceCount ?? 0,  icon: Receipt,       color: "text-red-600 dark:text-red-300",   bg: "bg-red-50 dark:bg-red-500/15",   spark: [2,3,2,1,3,2,1,1],       sparkColor: "#EF4444" },
    { id: "hoy",         label: "Ingresadas Hoy",             value: todayCount ?? 0,           icon: Plus,          color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/15", spark: [1,3,2,4,2,3,5,4],       sparkColor: "#22C55E" },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-(--zaire-text)">Dashboard</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Resumen operativo del sistema de trazabilidad</p>
      </div>

      {/* Fila 1: Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        {stats.map((stat, idx) => {
          const fc = idx === 0 ? "zaire-card-feature" : idx === 3 ? "zaire-card-feature-2" : null;
          const feature = !!fc;
          return (
          <div key={stat.id} className={cn(
            "p-5 relative overflow-hidden group transition-all duration-200 hover:-translate-y-0.5",
            feature
              ? cn(fc, "hover:shadow-[0_18px_44px_-14px_rgba(0,0,0,0.4)]")
              : "zaire-card hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)] hover:border-slate-200 dark:border-slate-700"
          )}>
            <Sparkline data={stat.spark} color={feature ? "var(--feature-fg)" : stat.sparkColor} id={stat.id} />
            <div className="flex items-start justify-between">
              <div>
                <p className={cn("text-sm font-medium", feature ? "text-(--feature-fg-muted)" : "text-(--zaire-text-muted)")}>{stat.label}</p>
                <p className={cn("text-3xl font-bold mt-1 tabular-nums", feature ? "text-(--feature-fg)" : "text-(--zaire-text)")}>{stat.value}</p>
              </div>
              <div className={cn("w-10 h-10 rounded-[11px] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3", feature ? "bg-white/15 backdrop-blur-sm" : stat.bg)}>
                <stat.icon className={cn("w-5 h-5", feature ? "text-white" : stat.color)} />
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Fila 2: Recientes + Por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up-1">
        <div className="zaire-card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Órdenes Recientes</h2>
            <Link href={ROUTES.trace.ordenes} className="text-xs text-zaire-blue hover:underline">Ver todas →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--zaire-border)">
                  {["Nro Orden", "Tipo", "Cliente", "Estado", "Fecha"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {recentOrders?.map((order) => (
                  <ClickableRow key={order.id} href={ROUTES.trace.orden(order.id)} className="hover:bg-subtle/80 transition-colors duration-100">
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-medium text-zaire-blue">{order.order_number}</span>
                    </td>
                    <td className="px-3 py-3"><OrderTypeBadge type={order.order_type as OrderType} /></td>
                    <td className="px-3 py-3 text-(--zaire-text-muted) max-w-40 truncate">
                      {order.clients?.business_name ?? "—"}
                    </td>
                    <td className="px-3 py-3"><OrderStatusBadge status={order.status as OrderStatus} /></td>
                    <td className="px-5 py-3 text-(--zaire-text-muted) whitespace-nowrap">{formatDate(order.date_in)}</td>
                  </ClickableRow>
                ))}
                {!recentOrders?.length && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-(--zaire-text-muted) text-sm">No hay órdenes registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="zaire-card">
          <div className="px-5 py-4 border-b border-(--zaire-border) flex items-center justify-between">
            <h2 className="font-semibold text-(--zaire-text)">Por Estado</h2>
            <span className="text-xs text-(--zaire-text-muted)">
              {statusCountResults.reduce((s, x) => s + x.count, 0)} activas
            </span>
          </div>
          <div className="px-5 py-3">
            {(() => {
              const withCounts = statusCountResults.filter((s) => s.count > 0);
              const maxCount = Math.max(...withCounts.map((s) => s.count), 1);
              if (!withCounts.length) return (
                <p className="text-sm text-center py-4 text-(--zaire-text-muted)">Sin datos</p>
              );
              return withCounts.map((item) => (
                <div key={item.status} className="grid items-center gap-3 py-1.5" style={{ gridTemplateColumns: "110px 1fr 24px" }}>
                  <span className="flex items-center gap-1.5 text-xs text-(--zaire-text-muted) truncate">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT_COLORS[item.status as OrderStatus] }} />
                    {ORDER_STATUS_LABELS[item.status as OrderStatus]}
                  </span>
                  <div className="h-2 bg-subtle-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full animate-z-grow"
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        background: STATUS_DOT_COLORS[item.status as OrderStatus],
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-(--zaire-text) text-right tabular-nums">{item.count}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Fila 3: Vencimientos + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up-2">
        <div className="zaire-card">
          <div className="px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Próximos Vencimientos</h2>
          </div>
          <div>
            {upcomingDue?.map((order) => {
              const overdue = isOverdue(order.date_due);
              return (
                <Link key={order.id} href={ROUTES.trace.orden(order.id)} className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-100 hover:bg-subtle/80 border-b border-(--zaire-border) last:border-0">
                  {overdue && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zaire-blue font-mono">{order.order_number}</p>
                    <p className="text-xs text-(--zaire-text-muted) truncate">{order.clients?.business_name ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-medium", overdue ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300")}>{getDueDaysLabel(order.date_due)}</p>
                    <p className="text-xs text-(--zaire-text-muted)">{formatDate(order.date_due)}</p>
                  </div>
                </Link>
              );
            })}
            {!upcomingDue?.length && (
              <p className="px-5 py-8 text-sm text-center text-(--zaire-text-muted)">Sin vencimientos próximos</p>
            )}
          </div>
        </div>

        <div className="zaire-card">
          <div className="px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Actividad Reciente</h2>
          </div>
          <div className="divide-y divide-(--zaire-border)">
            {recentActivity?.map((log) => {
              const isRequest = fieldEnabled && log.entity_type === "field_visit_report" && !!log.entity_id;
              const inner = (
                <>
                  <p className="text-sm text-(--zaire-text) truncate">{log.description ?? log.action}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-(--zaire-text-muted)">{log.user_name ?? "Sistema"}</span>
                    <span className="text-xs text-(--zaire-text-muted)">·</span>
                    <span className="text-xs text-(--zaire-text-muted)">{formatDateTime(log.created_at)}</span>
                    {isRequest && <span className="text-xs text-zaire-blue font-medium">· ver solicitud →</span>}
                  </div>
                </>
              );
              return isRequest ? (
                <Link key={log.id} href={ROUTES.trace.solicitud(log.entity_id!)} className="block px-5 py-3.5 transition-colors duration-100 hover:bg-blue-50 dark:bg-blue-500/15/50">
                  {inner}
                </Link>
              ) : (
                <div key={log.id} className="px-5 py-3.5 transition-colors duration-100 hover:bg-subtle/80">
                  {inner}
                </div>
              );
            })}
            {!recentActivity?.length && (
              <p className="px-5 py-8 text-sm text-center text-(--zaire-text-muted)">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
