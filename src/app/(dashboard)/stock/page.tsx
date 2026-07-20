// page.tsx — src/app/(dashboard)/stock/page.tsx — 2026-07-18
// Zaire Stock — Panel/Dashboard: KPIs de inventario, faltantes (bajo mínimo) y movimientos recientes.
// (Fase 6 suma gráficos + integración a la campana.)

import Link from "next/link";
import { Boxes, PackageSearch, AlertTriangle, ArrowLeftRight, ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getStockDashboardStats, getLowStockLevels, getStockMovements, getStockLevels } from "@/lib/stock/queries";
import { StockCharts } from "@/components/stock/stock-charts";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_BADGE, stockLight } from "@/lib/stock/constants";
import { StatusDot } from "@/components/shared/status-dot";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import type { Currency } from "@/lib/stock/types";

export const dynamic = "force-dynamic";

export default async function StockDashboardPage() {
  const [stats, lowStock, movements, levels] = await Promise.all([
    getStockDashboardStats(),
    getLowStockLevels(),
    getStockMovements(8),
    getStockLevels(),
  ]);

  // Gráficos: se calculan en la moneda DOMINANTE (no se suman monedas distintas).
  const primaryCur = (stats.valueByCurrency[0]?.name ?? "ARS") as Currency;
  const primaryLevels = levels.filter((l) => (l.product?.default_currency ?? "ARS") === primaryCur);
  const valueByWarehouse = Object.values(primaryLevels.reduce((acc, l) => {
    const name = l.warehouse?.name ?? "—";
    (acc[name] ??= { name, value: 0 }).value += l.on_hand * l.avg_cost;
    return acc;
  }, {} as Record<string, { name: string; value: number }>)).filter((x) => x.value > 0);

  const byProduct = primaryLevels.reduce((acc, l) => {
    const name = l.product?.name ?? "—";
    acc[name] = (acc[name] ?? 0) + l.on_hand * l.avg_cost;
    return acc;
  }, {} as Record<string, number>);
  const topProducts = Object.entries(byProduct).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

  const kpis = [
    { label: "Valor de inventario", value: stats.valueByCurrency.length ? stats.valueByCurrency.map((v) => formatCurrency(v.value, v.name as Currency)).join(" · ") : formatCurrency(0, "ARS"), icon: Boxes, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/15" },
    { label: "SKUs con stock", value: String(stats.skuCount), icon: PackageSearch, color: "text-violet-600 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/15" },
    { label: "Bajo mínimo", value: String(stats.lowStockCount), icon: AlertTriangle, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/15" },
    { label: "Movimientos del mes", value: String(stats.movementsThisMonth), icon: ArrowLeftRight, color: "text-green-600 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/15" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Panel Stock</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Inventario en {stats.warehouseCount} depósito(s) · valuación WAC</p>
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
        {/* Faltantes (bajo mínimo) */}
        <div className="zaire-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Faltantes (bajo mínimo)</h2>
            <Link href={ROUTES.stock.existencias} className="text-xs text-zaire-blue hover:underline">Ver existencias →</Link>
          </div>
          <div className="px-5 py-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-center py-4 text-(--zaire-text-muted)">Sin faltantes. Todo por encima del mínimo.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-(--zaire-text-muted) uppercase tracking-wide border-b border-(--zaire-border)">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-left py-2">Depósito</th>
                    <th className="text-right py-2">Stock</th>
                    <th className="text-right py-2">Mín.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--zaire-border)">
                  {lowStock.slice(0, 8).map((l) => (
                    <tr key={l.id}>
                      <td className="py-2">
                        <span className="flex items-center gap-1.5">
                          <StatusDot status={stockLight(l.on_hand, l.min_qty)} size="sm" pulse={l.on_hand <= 0} />
                          <span className="text-(--zaire-text) truncate max-w-40">{l.product?.name ?? "—"}</span>
                        </span>
                      </td>
                      <td className="py-2 text-(--zaire-text-muted)">{l.warehouse?.name ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums font-medium text-(--zaire-text)">{l.on_hand}</td>
                      <td className="py-2 text-right tabular-nums text-(--zaire-text-muted)">{l.min_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Movimientos recientes */}
        <div className="zaire-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--zaire-border)">
            <h2 className="font-semibold text-(--zaire-text)">Movimientos recientes</h2>
            <Link href={ROUTES.stock.movimientos} className="text-xs text-zaire-blue hover:underline inline-flex items-center gap-1">Ver todos <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="px-5 py-3">
            {movements.length === 0 ? (
              <p className="text-sm text-center py-4 text-(--zaire-text-muted)">Sin movimientos aún.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-(--zaire-text-muted) uppercase tracking-wide border-b border-(--zaire-border)">
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Cant.</th>
                    <th className="text-right py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--zaire-border)">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", MOVEMENT_TYPE_BADGE[m.type])}>
                          {MOVEMENT_TYPE_LABELS[m.type]}
                        </span>
                      </td>
                      <td className="py-2 text-(--zaire-text) truncate max-w-40">{m.product?.name ?? "—"}</td>
                      <td className={cn("py-2 text-right tabular-nums font-medium", m.qty < 0 ? "text-red-600 dark:text-red-300" : "text-green-600 dark:text-green-300")}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td className="py-2 text-right text-(--zaire-text-muted) whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <StockCharts valueByWarehouse={valueByWarehouse} topProducts={topProducts} currency={primaryCur} />
    </div>
  );
}
