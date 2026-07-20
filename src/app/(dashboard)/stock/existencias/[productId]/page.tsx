// page.tsx — src/app/(dashboard)/stock/existencias/[productId]/page.tsx — 2026-07-18
// Kardex de un producto: niveles por depósito + historial de movimientos con saldo corrido + series.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getProductStock } from "@/lib/stock/queries";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_BADGE, SERIAL_STATUS_LABELS, SERIAL_STATUS_BADGE } from "@/lib/stock/constants";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import type { Currency } from "@/lib/stock/types";

export const dynamic = "force-dynamic";

export default async function KardexPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { levels, movements, serials } = await getProductStock(productId);
  const product = levels[0]?.product ?? movements[0]?.product;
  if (!product) notFound();

  const currency = (product.default_currency ?? "ARS") as Currency;
  const totalOnHand = levels.reduce((a, l) => a + l.on_hand, 0);
  const totalReserved = levels.reduce((a, l) => a + l.reserved, 0);
  const totalValue = levels.reduce((a, l) => a + l.on_hand * l.avg_cost, 0);

  // Saldo corrido (nivel producto = suma acumulada; las transferencias netean 0).
  const asc = [...movements].reverse();
  let bal = 0;
  const rows = asc.map((m) => ({ m, balance: (bal += m.qty) })).reverse();

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.stock.existencias} className="inline-flex items-center gap-1 text-xs text-(--zaire-text-muted) hover:text-zaire-blue mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Existencias</Link>
        <h1 className="text-2xl font-bold text-(--zaire-text)">{product.name}</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {product.code && <span className="font-mono">{product.code}</span>}
          {product.brand ? `${product.code ? " · " : ""}${product.brand}${product.model ? ` ${product.model}` : ""}` : ""}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Stock total", value: `${totalOnHand} ${product.unit ?? ""}` },
          { label: "Reservado", value: String(totalReserved) },
          { label: "Disponible", value: String(totalOnHand - totalReserved) },
          { label: "Valor (WAC)", value: formatCurrency(totalValue, currency) },
        ].map((k) => (
          <div key={k.label} className="zaire-card p-4">
            <p className="text-xs text-(--zaire-text-muted)">{k.label}</p>
            <p className="text-xl font-bold text-(--zaire-text) mt-1 tabular-nums truncate">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Niveles por depósito */}
      <div className="zaire-card overflow-hidden">
        <div className="px-5 py-3 border-b border-(--zaire-border)"><h2 className="font-semibold text-(--zaire-text)">Por depósito</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Depósito</th>
                <th className="text-right px-4 py-2.5">Stock</th>
                <th className="text-right px-4 py-2.5">Reservado</th>
                <th className="text-right px-4 py-2.5">Disponible</th>
                <th className="text-right px-4 py-2.5">Costo (WAC)</th>
                <th className="text-right px-4 py-2.5">Valor</th>
                <th className="text-right px-4 py-2.5">Mín.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {levels.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5 font-medium text-(--zaire-text)">{l.warehouse?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{l.on_hand}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{l.reserved}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{l.available}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{formatCurrency(l.avg_cost, currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(l.on_hand * l.avg_cost, currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{l.min_qty}</td>
                </tr>
              ))}
              {levels.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-(--zaire-text-muted)">Sin existencias</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Series / lotes */}
      {serials.length > 0 && (
        <div className="zaire-card overflow-hidden">
          <div className="px-5 py-3 border-b border-(--zaire-border)"><h2 className="font-semibold text-(--zaire-text)">Series / Lotes</h2></div>
          <div className="flex flex-wrap gap-2 p-4">
            {serials.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-lg border border-(--zaire-border) px-2.5 py-1.5 text-xs">
                <span className="font-mono text-(--zaire-text)">{s.serial}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full border font-medium", SERIAL_STATUS_BADGE[s.status])}>{SERIAL_STATUS_LABELS[s.status]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Kardex (movimientos con saldo corrido) */}
      <div className="zaire-card overflow-hidden">
        <div className="px-5 py-3 border-b border-(--zaire-border)"><h2 className="font-semibold text-(--zaire-text)">Kardex (movimientos)</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Fecha</th>
                <th className="text-left px-4 py-2.5">Comprobante</th>
                <th className="text-left px-4 py-2.5">Tipo</th>
                <th className="text-left px-4 py-2.5">Depósito</th>
                <th className="text-right px-4 py-2.5">Cant.</th>
                <th className="text-right px-4 py-2.5">Costo u.</th>
                <th className="text-right px-4 py-2.5">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {rows.map(({ m, balance }) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-(--zaire-text-muted) whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-(--zaire-text-muted)">{m.doc_number ?? "—"}</td>
                  <td className="px-4 py-2.5"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", MOVEMENT_TYPE_BADGE[m.type])}>{MOVEMENT_TYPE_LABELS[m.type]}</span></td>
                  <td className="px-4 py-2.5 text-(--zaire-text-muted)">{m.warehouse?.name ?? "—"}</td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums font-medium", m.qty < 0 ? "text-red-600 dark:text-red-300" : "text-green-600 dark:text-green-300")}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{m.unit_cost != null ? formatCurrency(m.unit_cost, currency) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-(--zaire-text)">{balance}</td>
                </tr>
              ))}
              {rows.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-(--zaire-text-muted)">Sin movimientos</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
